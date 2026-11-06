/// <reference types="@cloudflare/workers-types" />
import { env as bindings } from 'cloudflare:workers';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOUR, MAX_IMAGE_BYTES } from '../src/domain/rules';
import type { Outcome } from '../src/domain/types';
import { openDatabase } from './db';
import { events, registrations, user } from './db/schema';
import type { Env } from './env';
import { imageType } from './images';
import worker from './index';

const env = bindings as unknown as Env;
const origin = 'http://127.0.0.1:5173';
const realNow = Date.now();
const testId = crypto.randomUUID();
const accountIds: string[] = [];
const eventIds: string[] = [];
let clock = realNow;

interface Message {
  to: string;
  subject: string;
  text: string;
  attachments?: { content: string; filename: string; content_id?: string }[];
}
const messages: Message[] = [];
let providerStatus = 200;
const staff = { cookie: '', id: '' };
const admin = { cookie: '', id: '' };
const attendee = { cookie: '', id: '' };
const other = { cookie: '', id: '' };
const newcomer = { cookie: '', id: '' };

async function database<T>(fn: (db: ReturnType<typeof openDatabase>['db']) => Promise<T>) {
  const { db, close } = openDatabase(env);
  try {
    return await fn(db);
  } finally {
    await close();
  }
}

function request(path: string, cookie = '', method = 'GET', body?: unknown) {
  return worker.fetch(
    new Request(`${origin}/api${path}`, {
      method,
      headers: {
        origin,
        ...(cookie && { cookie }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        'CF-Connecting-IP': `2001:db8:${testId.slice(0, 4)}:${testId.slice(4, 8)}::1`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

function upload(
  cookie: string,
  bytes: Uint8Array<ArrayBuffer>,
  type = 'image/png',
  name = 'picture.png',
) {
  const body = new FormData();
  body.append('file', new File([bytes], name, { type }));
  return worker.fetch(
    new Request(`${origin}/api/staff/images`, {
      method: 'POST',
      headers: { origin, ...(cookie && { cookie }) },
      body,
    }),
    env,
  );
}
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

async function login(label: string) {
  const email = `${label}-${testId}@example.test`;
  const response = await request('/auth/sign-in/magic-link', '', 'POST', {
    email,
    callbackURL: '/',
    newUserCallbackURL: '/complete-profile',
    metadata: { language: 'hu' },
  });
  expect(response.status).toBe(200);
  const message = messages.find((row) => row.to === email);
  expect(message?.subject).toContain('Bejelentkezés');
  const url = new URL(message?.text.split('\n').at(-1) ?? '');
  const verified = await request(url.pathname.replace('/api', '') + url.search);
  expect(verified.status).toBe(302);
  expect(verified.headers.get('location')).toBe(`${origin}/complete-profile`);
  const cookie =
    verified.headers
      .getSetCookie()
      .find((value) => value.includes('session_token='))
      ?.split(';')[0] ?? '';
  expect(cookie).toBeTruthy();
  const session = await (await request('/session', cookie)).json<{
    user: { id: string; profileComplete: boolean };
  }>();
  expect(session.user.profileComplete).toBe(false);
  accountIds.push(session.user.id);
  if (label !== 'new') {
    const profile = await request('/profile/name', cookie, 'POST', {
      name: 'Árvíztűrő Tükörfúrógép',
      language: 'hu',
    });
    expect(profile.status).toBe(200);
  }
  return { cookie, id: session.user.id };
}

const input = (start = realNow + 48 * HOUR, end = start + HOUR) => ({
  title: 'University seminar',
  location: 'Budapest',
  timezone: 'Europe/Budapest',
  start: new Date(start).toISOString(),
  end: new Date(end).toISOString(),
  content: JSON.stringify({
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Discussion' }] }],
    },
  }),
});
async function seedEvent(start = realNow + 48 * HOUR, status: 'draft' | 'published' = 'published') {
  const [event] = await database((db) =>
    db
      .insert(events)
      .values({ ...input(start), status })
      .returning(),
  );
  eventIds.push(event.id);
  return event.id;
}

async function seedTicket(eventId: string, account = attendee, checkedIn = false) {
  const [row] = await database((db) =>
    db
      .insert(registrations)
      .values({
        eventId,
        userId: account.id,
        checkedInAt: checkedIn ? new Date(clock - HOUR).toISOString() : null,
      })
      .returning(),
  );
  return row;
}

function checkIn(eventId: string, ticket: string, cookie = staff.cookie) {
  return request(`/staff/events/${eventId}/check-in`, cookie, 'POST', { ticket });
}

beforeAll(async () => {
  vi.stubGlobal('fetch', async (target: string, options: RequestInit) => {
    expect(target).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    messages.push(JSON.parse(String(options.body)));
    return Response.json({ id: 'stubbed' }, { status: providerStatus });
  });
  Object.assign(admin, await login('admin'));
  Object.assign(staff, await login('staff'));
  Object.assign(attendee, await login('attendee'));
  Object.assign(other, await login('other'));
  Object.assign(newcomer, await login('new'));
  await database(async (db) => {
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.id));
    await db.update(user).set({ role: 'organizer' }).where(eq(user.id, staff.id));
  });
});

beforeEach(() => {
  clock = realNow;
  messages.length = 0;
  providerStatus = 200;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await database((db) => db.delete(events).where(inArray(events.id, eventIds.splice(0))));
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await database(async (db) => {
    await db.delete(user).where(inArray(user.id, accountIds));
  });
});

describe('accounts and authorization', () => {
  it('enforces immutable names, cross-origin protection and role boundaries', async () => {
    const id = await seedEvent(realNow + 48 * HOUR, 'draft');
    expect((await request('/admin/accounts', staff.cookie)).status).toBe(403);
    expect((await request('/admin/accounts', admin.cookie)).status).toBe(200);
    expect(
      (await request(`/admin/accounts/${admin.id}`, admin.cookie, 'PATCH', { organizer: false }))
        .status,
    ).toBe(409);
    expect(
      (await request(`/admin/accounts/${other.id}`, admin.cookie, 'PATCH', { role: 'admin' }))
        .status,
    ).toBe(400);
    expect(
      (
        await request('/profile/name', attendee.cookie, 'POST', {
          name: 'A different name',
          language: 'en',
        })
      ).status,
    ).toBe(409);
    expect(
      (await request('/auth/update-user', attendee.cookie, 'POST', { name: 'A different name' }))
        .status,
    ).toBe(404);
    expect((await request(`/events/${id}`, staff.cookie)).status).toBe(404);
    expect((await request(`/staff/events/${id}`, attendee.cookie)).status).toBe(403);
    expect((await request(`/staff/events/${id}`, staff.cookie)).status).toBe(200);
    expect((await request(`/staff/events/${id}`, attendee.cookie, 'DELETE')).status).toBe(403);
    expect(
      (
        await worker.fetch(
          new Request(`${origin}/api/staff/events/${id}`, {
            method: 'DELETE',
            headers: { origin: 'https://example.test', cookie: staff.cookie },
          }),
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (await request('/profile/language', attendee.cookie, 'PATCH', { language: 'en' })).status,
    ).toBe(200);
    expect(await (await request('/session', attendee.cookie)).json()).toMatchObject({
      user: { name: 'Árvíztűrő Tükörfúrógép', language: 'en' },
    });
    await request('/profile/language', attendee.cookie, 'PATCH', { language: 'hu' });
  });

  it('documents the API and starts Google OAuth with the configured callback', async () => {
    const documentation = await (await request('/openapi.json')).json<{
      paths: Record<string, unknown>;
    }>();
    expect(documentation.paths).toHaveProperty(['/api/auth/sign-in/magic-link']);
    expect(documentation.paths).toHaveProperty(['/api/events/{eventId}/certificate']);
    const response = await worker.fetch(
      new Request(`${origin}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin },
        body: JSON.stringify({
          provider: 'google',
          callbackURL: '/',
          newUserCallbackURL: '/complete-profile',
          disableRedirect: true,
        }),
      }),
      {
        ...env,
        GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'test-secret',
      },
    );
    expect(response.status).toBe(200);
    const authorization = new URL((await response.json<{ url: string }>()).url);
    expect(authorization.hostname).toBe('accounts.google.com');
    expect(authorization.searchParams.get('redirect_uri')).toBe(
      `${origin}/api/auth/callback/google`,
    );
  });

  it('preserves registration and post-event eligibility after promotion', async () => {
    const id = await seedEvent();
    const ticket = await seedTicket(id, other, true);
    expect(
      (await request(`/admin/accounts/${other.id}`, admin.cookie, 'PATCH', { organizer: true }))
        .status,
    ).toBe(200);
    expect((await request(`/events/${id}/registrations`, other.cookie, 'POST', {})).status).toBe(
      403,
    );
    expect((await request(`/registrations/${ticket.id}/ticket`, other.cookie)).status).toBe(200);
    clock += 49 * HOUR;
    expect(
      (await request(`/events/${id}/review`, other.cookie, 'POST', { rating: 4 })).status,
    ).toBe(200);
    expect((await request(`/events/${id}/certificate`, other.cookie, 'POST', {})).status).toBe(200);
    expect(
      (await request(`/admin/accounts/${other.id}`, admin.cookie, 'PATCH', { organizer: false }))
        .status,
    ).toBe(200);
  });
});

describe('event lifecycle and attendance', () => {
  it('enforces exact cutoffs and invalidates cancelled and unpublished tickets', async () => {
    const start = realNow + 48 * HOUR;
    const id = await seedEvent(start, 'draft');
    const publish = () => request(`/staff/events/${id}/publish`, staff.cookie, 'POST', {});
    const join = (account = attendee) =>
      request(`/events/${id}/registrations`, account.cookie, 'POST', {});
    clock = start - 24 * HOUR;
    expect((await publish()).status).toBe(409);
    clock--;
    expect((await publish()).status).toBe(200);
    expect((await request(`/staff/events/${id}`, staff.cookie, 'PATCH', input())).status).toBe(409);
    expect((await join(newcomer)).status).toBe(403);
    expect((await join(staff)).status).toBe(403);
    const registered = await (await join()).json<Outcome>();
    expect(registered.ok).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].attachments?.[0]).toMatchObject({
      filename: 'ticket.png',
      content_id: 'ticket',
    });
    expect(messages[0].attachments?.[0].content).toMatch(/^iVBOR/);
    expect((await join()).status).toBe(409);
    const ticketPath = `/registrations/${registered.id}/ticket`;
    expect((await request(ticketPath, other.cookie)).status).toBe(404);
    const { ticket } = await (await request(ticketPath, attendee.cookie)).json<{
      ticket: string;
    }>();
    clock++;
    expect((await join(other)).status).toBe(409);
    expect(
      (await request(`/registrations/${registered.id}`, attendee.cookie, 'DELETE')).status,
    ).toBe(409);
    clock--;
    expect(
      (await request(`/registrations/${registered.id}`, attendee.cookie, 'DELETE')).status,
    ).toBe(200);
    expect((await request(ticketPath, attendee.cookie)).status).toBe(404);
    const rejoined = await (await join()).json<Outcome>();
    const next = await (
      await request(`/registrations/${rejoined.id}/ticket`, attendee.cookie)
    ).json<{ ticket: string }>();
    expect(next.ticket).not.toBe(ticket);

    clock = start - HOUR;
    expect((await checkIn(id, ticket)).status).toBe(409);
    expect((await request(`/staff/events/${id}/unpublish`, staff.cookie, 'POST', {})).status).toBe(
      200,
    );
    expect((await request(`/events/${id}`)).status).toBe(404);
    expect((await request(`/registrations/${rejoined.id}/ticket`, attendee.cookie)).status).toBe(
      404,
    );
    expect((await publish()).status).toBe(409);
    expect(
      (await request(`/staff/events/${id}`, staff.cookie, 'PATCH', input(start + 48 * HOUR)))
        .status,
    ).toBe(200);
    expect((await publish()).status).toBe(200);
    clock = start + 47 * HOUR;
    expect((await checkIn(id, next.ticket)).status).toBe(409);
  });

  it('scopes QR check-in, returns the existing timestamp on duplicate scans and closes at event end', async () => {
    const start = realNow + 2 * HOUR;
    const id = await seedEvent(start);
    const wrongEvent = await seedEvent(start);
    const first = await seedTicket(id);
    const second = await seedTicket(id, other);
    clock = start - HOUR - 1;
    expect((await checkIn(id, first.ticket)).status).toBe(409);
    clock++;
    expect((await checkIn(id, first.ticket, attendee.cookie)).status).toBe(403);
    expect((await checkIn(wrongEvent, first.ticket)).status).toBe(409);
    const confirmed = await (await checkIn(id, first.ticket)).json<Outcome>();
    expect(confirmed).toMatchObject({ ok: true, checkedInAt: new Date(clock).toISOString() });
    clock++;
    expect(await (await checkIn(id, first.ticket)).json()).toMatchObject({
      ok: true,
      message: 'This attendee is already checked in.',
      checkedInAt: confirmed.checkedInAt,
    });
    const list = await (await request(`/staff/events/${id}/attendees`, staff.cookie)).json<{
      attendees: Record<string, unknown>[];
    }>();
    expect(list.attendees).toContainEqual({
      id: first.id,
      name: 'Árvíztűrő Tükörfúrógép',
      email: expect.any(String),
      checkedIn: true,
    });
    expect((await request(`/staff/events/${id}/attendees`, attendee.cookie)).status).toBe(403);
    clock = start + HOUR;
    expect((await checkIn(id, second.ticket)).status).toBe(409);
    expect((await request(`/staff/events/${id}/unpublish`, staff.cookie, 'POST', {})).status).toBe(
      409,
    );
  });
});

describe('reviews and certificates', () => {
  it('enforces review eligibility and deadlines, and only returns anonymous results', async () => {
    const start = realNow + HOUR;
    const id = await seedEvent(start);
    const lateEvent = await seedEvent(start);
    await seedTicket(id, attendee, true);
    await seedTicket(id, other);
    await seedTicket(lateEvent, attendee, true);
    const review = (eventId = id, account = attendee, rating = 5) =>
      request(`/events/${eventId}/review`, account.cookie, 'POST', {
        rating,
        comment: 'Useful discussion.',
      });
    clock = start + HOUR - 1;
    expect((await review()).status).toBe(409);
    clock++;
    expect((await review(id, other)).status).toBe(409);
    expect((await review(id, attendee, 6)).status).toBe(400);
    expect((await review()).status).toBe(200);
    expect((await review()).status).toBe(409);
    // Only the reviewer's own responses carry their answers.
    const own = { rating: 5, comment: 'Useful discussion.' };
    const detail = async (account: { cookie: string }) =>
      (await request(`/events/${id}`, account.cookie)).json<{
        registrations: { review: unknown }[];
      }>();
    expect((await detail(attendee)).registrations.map((item) => item.review)).toEqual([own]);
    expect((await detail(other)).registrations.map((item) => item.review)).toEqual([null]);
    const listed = await (await request('/registrations', attendee.cookie)).json<
      { event: { id: string }; registration: { review: unknown } }[]
    >();
    expect(listed.find((item) => item.event.id === id)?.registration.review).toEqual(own);
    const path = `/staff/events/${id}/reviews`;
    expect((await request(path, attendee.cookie)).status).toBe(403);
    const results = await (await request(path, staff.cookie)).json<{ results: unknown }>();
    expect(results.results).toEqual({ count: 1, average: 5, comments: ['Useful discussion.'] });
    clock += 72 * HOUR;
    expect((await review(lateEvent)).status).toBe(409);
    clock--;
    expect((await review(lateEvent)).status).toBe(200);
  });

  it('sends one localized PDF for concurrent requests, and records failure without retry', async () => {
    const start = realNow + HOUR;
    const id = await seedEvent(start);
    const failing = await seedEvent(start);
    await seedTicket(id, attendee, true);
    await seedTicket(failing, attendee, true);
    await seedTicket(id, other);
    const certificate = (eventId = id, account = attendee) =>
      request(`/events/${eventId}/certificate`, account.cookie, 'POST', {});
    clock = start + HOUR - 1;
    expect((await certificate()).status).toBe(409);
    clock++;
    expect((await certificate(id, other)).status).toBe(409);
    const responses = await Promise.all([certificate(), certificate()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(messages).toHaveLength(1);
    expect(messages[0].subject).toContain('Részvételi igazolás');
    expect(messages[0].attachments?.[0]).toMatchObject({ filename: 'igazolas.pdf' });
    expect(messages[0].attachments?.[0].content).toMatch(/^JVBER/);
    providerStatus = 502;
    expect((await certificate(failing)).status).toBe(503);
    expect((await certificate(failing)).status).toBe(409);
    expect(messages).toHaveLength(2);
    const [row] = await database((db) =>
      db
        .select()
        .from(registrations)
        .where(and(eq(registrations.eventId, failing), eq(registrations.userId, attendee.id))),
    );
    expect(row.certificate).toBe('failed');
    expect((await request(`/staff/events/${id}`, staff.cookie, 'DELETE')).status).toBe(200);
    expect((await certificate()).status).toBe(404);
  });

  it('claims review invitations once and only for checked-in attendees in the review window', async () => {
    const start = realNow + 12 * HOUR;
    const id = await seedEvent(start);
    await seedTicket(id, attendee, true);
    await seedTicket(id, other);
    clock = start + HOUR - 1;
    const scheduled = () =>
      worker.scheduled({ cron: '*/5 * * * *', scheduledTime: clock, noRetry() {} }, env);
    await scheduled();
    const invitations = () => messages.filter(({ text }) => text.includes(`/review/${id}`));
    expect(invitations()).toHaveLength(0);
    clock++;
    await scheduled();
    await scheduled();
    expect(invitations()).toHaveLength(1);
    expect(invitations()[0]).toMatchObject({
      subject: 'Értékeld az eseményt · University seminar',
      text: expect.stringContaining(`/review/${id}`),
    });
  });
});

describe('images', () => {
  it('stores staff uploads by their real type and refuses other files and accounts', async () => {
    expect((await upload('', png)).status).toBe(401);
    expect((await upload(attendee.cookie, png)).status).toBe(403);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    const refused = await upload(staff.cookie, svg, 'image/png');
    expect(refused.status).toBe(415);
    expect((await refused.json<Outcome>()).message).toBe('Choose a JPEG, PNG, WebP or GIF image.');
    const large = new Uint8Array(MAX_IMAGE_BYTES + 1);
    large.set(png);
    const tooLarge = await upload(staff.cookie, large);
    expect(tooLarge.status).toBe(413);
    expect((await tooLarge.json<Outcome>()).message).toBe('Images can be up to 5 MB.');

    // The declared type is ignored; the stored type comes from the bytes.
    const stored = await upload(staff.cookie, png, 'image/jpeg', 'picture.jpg');
    expect(stored.status).toBe(200);
    const { id } = await stored.json<Outcome>();
    const image = await request(`/images/${id}`);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(image.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(png);
    expect((await request(`/images/${crypto.randomUUID()}`)).status).toBe(404);
    expect((await request('/images/not-an-id')).status).toBe(404);

    const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(imageType(new Uint8Array([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]))).toBe(
      'image/webp',
    );
    expect(imageType(new Uint8Array(ascii('GIF89a')))).toBe('image/gif');
  });

  it('saves only uploaded banners and keeps the banner and images when unpublishing', async () => {
    const missing = await request('/staff/events', staff.cookie, 'POST', {
      ...input(),
      banner: crypto.randomUUID(),
    });
    expect(missing.status).toBe(400);
    expect((await missing.json<Outcome>()).message).toBe('Upload the banner image again.');

    const { id: banner } = await (await upload(staff.cookie, png)).json<Outcome>();
    const { id: picture } = await (await upload(staff.cookie, png)).json<Outcome>();
    const content = JSON.stringify({
      root: {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Discussion' }] },
          { type: 'image', imageId: picture, altText: 'The lecture hall', version: 1 },
        ],
      },
    });
    const created = await request('/staff/events', staff.cookie, 'POST', {
      ...input(),
      content,
      banner,
    });
    expect(created.status).toBe(200);
    const { id } = await created.json<Outcome>();
    eventIds.push(id ?? '');
    expect((await request(`/staff/events/${id}/publish`, staff.cookie, 'POST', {})).status).toBe(
      200,
    );
    const published = await (await request(`/events/${id}`)).json<{
      event: { banner: string | null; content: string };
    }>();
    expect(published.event).toMatchObject({ banner, content });

    expect((await request(`/staff/events/${id}/unpublish`, staff.cookie, 'POST', {})).status).toBe(
      200,
    );
    const draft = await (await request(`/staff/events/${id}`, staff.cookie)).json<{
      banner: string | null;
      content: string;
      status: string;
    }>();
    expect(draft).toMatchObject({ status: 'draft', banner, content });
    expect((await request(`/images/${banner}`)).status).toBe(200);
    expect((await request(`/images/${picture}`)).status).toBe(200);

    expect(
      (await request(`/staff/events/${id}`, staff.cookie, 'PATCH', { ...input(), content })).status,
    ).toBe(200);
    expect(
      (await (await request(`/staff/events/${id}`, staff.cookie)).json<{ banner: null }>()).banner,
    ).toBeNull();
  });
});
