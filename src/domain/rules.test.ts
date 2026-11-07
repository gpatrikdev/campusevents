import { describe, expect, it } from 'vitest';
import { type ActionContext, applyAction, type MockAction } from '../mocks/actions';
import { createFixtures } from '../mocks/fixtures';
import { HOUR, instant, localToInstant, registrationCutoff, reviewCutoff } from './rules';
import type { MockData } from './types';

const reference: ActionContext = {
  userId: 'attendee',
  now: instant('2026-11-03T11:00:00Z'),
  fail: false,
};
const staff = { ...reference, userId: 'organizer' };
const admin = { ...reference, userId: 'admin' };
const run = (data: MockData, action: MockAction, context: Partial<ActionContext> = {}) =>
  applyAction(data, action, { ...reference, ...context });
function findEvent(data: MockData, id: string) {
  const event = data.events.find((item) => item.id === id);
  if (!event) throw new Error(`Missing fixture: ${id}`);
  return event;
}
const symposium = () => findEvent(createFixtures(), 'symposium');
// The 'ethics' fixture uses the workshop form, whose required questions are these three.
const review = (eventId: string, rating = 4, comment = ''): MockAction => ({
  type: 'review',
  eventId,
  answers: {
    qrating: rating,
    qformat: 'Talks',
    qrecommend: true,
    ...(comment ? { qcomment: comment } : {}),
  },
});

describe('registration and cancellation', () => {
  it.each([
    [null, 'Sign in to continue.'],
    ['new', 'Confirm your profile name first.'],
    ['organizer', 'Staff cannot join new events.'],
    ['admin', 'Staff cannot join new events.'],
  ])('rejects an ineligible identity %s', (userId, message) => {
    const result = run(createFixtures(), { type: 'join', eventId: 'library' }, { userId });
    expect(result.outcome).toMatchObject({ ok: false, message });
  });
  it('allows a regular attendee without a university email and prevents duplicates', () => {
    const first = run(createFixtures(), { type: 'join', eventId: 'library' });
    expect(first.outcome.ok).toBe(true);
    const duplicate = run(first.data, { type: 'join', eventId: 'library' });
    expect(duplicate.outcome.ok).toBe(false);
    expect(
      duplicate.data.registrations.filter((item) => item.eventId === 'library' && item.active),
    ).toHaveLength(1);
  });
  it.each([-1, 0, 1])('uses an exact 24-hour join/cancel cutoff at offset %i ms', (offset) => {
    const event = symposium();
    const now = registrationCutoff(event) + offset;
    expect(
      run(createFixtures(), { type: 'join', eventId: event.id }, { userId: 'guest', now }).outcome
        .ok,
    ).toBe(offset < 0);
    expect(
      run(createFixtures(), { type: 'cancel', registrationId: 'r1' }, { now }).outcome.ok,
    ).toBe(offset < 0);
  });
  it('does not allow cancellation of another account registration', () => {
    const data = createFixtures();
    const result = run(data, { type: 'cancel', registrationId: 'r1' }, { userId: 'guest' });
    expect(result.outcome.ok).toBe(false);
    expect(result.data).toBe(data);
  });
  it('invalidates cancellation tickets and creates a fresh ticket on rejoining', () => {
    const first = run(createFixtures(), { type: 'cancel', registrationId: 'r1' });
    expect(first.data.registrations.find((item) => item.id === 'r1')?.active).toBe(false);
    const second = run(first.data, { type: 'join', eventId: 'symposium' });
    const active = second.data.registrations.find(
      (item) => item.eventId === 'symposium' && item.userId === 'attendee' && item.active,
    );
    expect(active?.ticket).not.toBe('DEMO-symposium-r1');
    expect(
      run(
        second.data,
        { type: 'scan', eventId: 'symposium', ticket: 'DEMO-symposium-r1' },
        { ...staff, now: instant(symposium().start) },
      ).outcome.ok,
    ).toBe(false);
  });
});

describe('event lifecycle and permissions', () => {
  it.each([-1, 0, 1])(
    'publishes only more than 24 hours before start at offset %i ms',
    (offset) => {
      const data = createFixtures();
      const draft = findEvent(data, 'draft');
      const result = run(
        data,
        { type: 'publish', eventId: draft.id },
        { ...staff, now: registrationCutoff(draft) + offset },
      );
      expect(result.outcome.ok).toBe(offset < 0);
    },
  );
  it('locks published edits and forbids attendee management', () => {
    const data = createFixtures();
    expect(
      run(data, { type: 'save', event: { ...symposium(), title: 'Changed' } }, staff).outcome.ok,
    ).toBe(false);
    expect(run(data, { type: 'delete', eventId: 'symposium' }).outcome.ok).toBe(false);
    expect(run(data, { type: 'publish', eventId: 'draft' }).outcome.ok).toBe(false);
  });
  it('unpublishes in the final 24 hours, clears tickets, preserves content, and prevents late republishing', () => {
    const data = createFixtures();
    const now = instant(symposium().start) - HOUR;
    const result = run(data, { type: 'unpublish', eventId: 'symposium' }, { ...staff, now });
    expect(result.outcome.ok).toBe(true);
    expect(result.data.events.find((item) => item.id === 'symposium')).toMatchObject({
      status: 'draft',
      content: symposium().content,
    });
    expect(
      result.data.registrations.filter((item) => item.eventId === 'symposium' && item.active),
    ).toHaveLength(0);
    expect(
      run(result.data, { type: 'publish', eventId: 'symposium' }, { ...staff, now }).outcome.ok,
    ).toBe(false);
    expect(
      run(
        data,
        { type: 'unpublish', eventId: 'symposium' },
        { ...staff, now: instant(symposium().start) },
      ).outcome.ok,
    ).toBe(false);
  });
  it('removes event-dependent records on deletion, including completed events', () => {
    const result = run(createFixtures(), { type: 'delete', eventId: 'ethics' }, staff);
    expect(result.outcome.ok).toBe(true);
    for (const items of [result.data.registrations, result.data.reviews])
      expect(items.some((item) => item.eventId === 'ethics')).toBe(false);
    expect(run(result.data, { type: 'certificate', eventId: 'ethics' }).outcome.ok).toBe(false);
  });
  it('limits organizer changes to admins, protects admin roles, and retains promoted registrations', () => {
    const data = createFixtures();
    const action: MockAction = { type: 'role', userId: 'attendee', organizer: true };
    expect(run(data, action, staff).outcome.ok).toBe(false);
    const promoted = run(data, action, admin);
    expect(promoted.outcome.ok).toBe(true);
    expect(promoted.data.registrations).toEqual(data.registrations);
    expect(run(promoted.data, { type: 'join', eventId: 'library' }).outcome.ok).toBe(false);
    expect(run(promoted.data, { type: 'certificate', eventId: 'ethics' }).outcome.ok).toBe(true);
    expect(run(data, { type: 'role', userId: 'admin', organizer: false }, admin).outcome.ok).toBe(
      false,
    );
    const demoted = run(promoted.data, { ...action, organizer: false }, admin);
    expect(demoted.data.registrations).toEqual(data.registrations);
  });
});

describe('QR attendance', () => {
  it.each([
    [-HOUR - 1, false],
    [-HOUR, true],
    [0, true],
    [6 * HOUR - 1, true],
    [6 * HOUR, false],
  ])('checks the attendance boundary at offset %i ms', (offset, allowed) => {
    const result = run(
      createFixtures(),
      { type: 'scan', eventId: 'symposium', ticket: 'DEMO-symposium-r1' },
      { ...staff, now: instant(symposium().start) + offset },
    );
    expect(result.outcome.ok).toBe(allowed);
  });
  it('requires staff and scopes the ticket to the selected event', () => {
    const data = createFixtures();
    expect(
      run(data, { type: 'scan', eventId: 'open-science', ticket: 'DEMO-open-science-r2' }).outcome
        .ok,
    ).toBe(false);
    for (const ticket of ['DEMO-symposium-r1', 'DEMO-open-science-r7', 'unknown']) {
      expect(run(data, { type: 'scan', eventId: 'open-science', ticket }, staff).outcome.ok).toBe(
        false,
      );
    }
  });
  it('reports duplicate scans without changing attendance', () => {
    const first = run(
      createFixtures(),
      { type: 'scan', eventId: 'open-science', ticket: 'DEMO-open-science-r2' },
      staff,
    );
    const second = run(
      first.data,
      { type: 'scan', eventId: 'open-science', ticket: 'DEMO-open-science-r2' },
      staff,
    );
    expect(second.outcome.message).toBe('This attendee is already checked in.');
    expect(second.data).toBe(first.data);
  });
});

describe('post-event actions', () => {
  it.each([-1, 0, 1])('opens reviews at the exact event end at offset %i ms', (offset) => {
    const data = createFixtures();
    const event = findEvent(data, 'ethics');
    const now = instant(event.end) + offset;
    expect(run(data, review(event.id), { now }).outcome.ok).toBe(offset >= 0);
    expect(run(data, { type: 'certificate', eventId: event.id }, { now }).outcome.ok).toBe(
      offset >= 0,
    );
  });
  it.each([-1, 0, 1])('closes reviews exactly 72 elapsed hours later at offset %i ms', (offset) => {
    const data = createFixtures();
    const event = findEvent(data, 'ethics');
    const result = run(data, review(event.id), { now: reviewCutoff(event) + offset });
    expect(result.outcome.ok).toBe(offset < 0);
  });
  it('requires check-in and prevents duplicate or invalid reviews', () => {
    const data = createFixtures();
    expect(run(data, review('archives', 5)).outcome.ok).toBe(false);
    expect(run(data, { type: 'certificate', eventId: 'archives' }).outcome.ok).toBe(false);
    expect(run(data, review('ethics', 6)).outcome.ok).toBe(false);
    const result = run(data, review('ethics', 4, 'Useful.'));
    expect(run(result.data, review('ethics', 4, 'Again')).outcome.ok).toBe(false);
    const answers = { qrating: 4, qformat: 'Talks', qrecommend: true, qcomment: 'Useful.' };
    expect(result.data.reviews.at(-1)).toMatchObject({ eventId: 'ethics', answers });
    expect(result.data.registrations.find((item) => item.id === 'r3')?.review).toEqual(answers);
  });
  it('offers no review for an event without a form', () => {
    const data = createFixtures();
    findEvent(data, 'ethics').form = null;
    expect(run(data, review('ethics')).outcome).toMatchObject({
      ok: false,
      message: 'This event has no review form.',
    });
    expect(run(data, { type: 'certificate', eventId: 'ethics' }).outcome.ok).toBe(true);
  });
  it('allows one certificate request without a later deadline and never retries a failed request', () => {
    const data = createFixtures();
    const action: MockAction = { type: 'certificate', eventId: 'ethics' };
    const result = run(data, action, { now: reference.now + 1000 * HOUR });
    expect(result.outcome.ok).toBe(true);
    expect(run(result.data, action).outcome.ok).toBe(false);
    const failed = run(data, action, { fail: true });
    expect(failed.outcome.ok).toBe(false);
    expect(failed.data.registrations.find((item) => item.id === 'r3')?.certificate).toBe('failed');
    expect(run(failed.data, action).outcome.ok).toBe(false);
  });
});

describe('validation and atomic simulated failures', () => {
  it('confirms a trimmed name once, then makes it immutable', () => {
    const data = createFixtures();
    expect(run(data, { type: 'profile', name: ' ' }, { userId: 'new' }).outcome.ok).toBe(false);
    const result = run(
      data,
      { type: 'profile', name: '  Árvíztűrő Tükörfúrógép  ' },
      { userId: 'new' },
    );
    expect(result.data.users.find((item) => item.id === 'new')?.name).toBe(
      'Árvíztűrő Tükörfúrógép',
    );
    expect(
      run(result.data, { type: 'profile', name: 'Other Name' }, { userId: 'new' }).outcome.ok,
    ).toBe(false);
  });
  it('rejects invalid draft dates and leaves data unchanged on action failure', () => {
    const data = createFixtures();
    const event = findEvent(data, 'draft');
    expect(
      run(data, { type: 'save', event: { ...event, end: event.start } }, staff).outcome.ok,
    ).toBe(false);
    const result = run(data, { type: 'join', eventId: 'library' }, { fail: true });
    expect(result.data).toBe(data);
    expect(result.outcome.ok).toBe(false);
  });
  it('requires a nonempty RichText description and saves a fresh draft without publishing', () => {
    const data = createFixtures();
    const event = findEvent(data, 'draft');
    const empty = JSON.stringify({ root: { children: [{ type: 'paragraph', children: [] }] } });
    expect(run(data, { type: 'save', event: { ...event, content: empty } }, staff).outcome.ok).toBe(
      false,
    );
    const result = run(data, { type: 'save', event: { ...event, id: '' } }, staff);
    expect(result.outcome.ok).toBe(true);
    expect(result.data.events.find((item) => item.id === result.outcome.id)).toMatchObject({
      status: 'draft',
      content: event.content,
    });
    expect(data.events).toHaveLength(10);
  });
  it('rejects nonexistent and ambiguous local times rather than silently shifting them', () => {
    expect(() => localToInstant('2026-03-29T02:30', 'Europe/Budapest')).toThrow();
    expect(() => localToInstant('2026-10-25T02:30', 'Europe/Budapest')).toThrow();
    expect(localToInstant('2026-11-06T10:00', 'Europe/Budapest')).toBe('2026-11-06T09:00:00Z');
  });
  it('uses elapsed hours across daylight-saving changes', () => {
    const event = {
      ...symposium(),
      start: localToInstant('2026-10-25T10:00', 'Europe/Budapest'),
      end: localToInstant('2026-10-25T12:00', 'Europe/Budapest'),
    };
    expect(registrationCutoff(event)).toBe(instant('2026-10-24T09:00:00Z'));
    expect(reviewCutoff(event) - instant(event.end)).toBe(72 * HOUR);
  });
});
