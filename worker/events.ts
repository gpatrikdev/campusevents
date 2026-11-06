import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { validator } from 'hono-openapi';
import { z } from 'zod';
import {
  certificateIssue,
  checkInIssue,
  eventInputIssue,
  eventSchema,
  joinIssue,
  publishIssue,
  registrationCutoff,
  reviewIssue,
  reviewSchema,
  unpublishIssue,
} from '../src/domain/rules';
import type { CampusEvent, Registration } from '../src/domain/types';
import { readAccount } from './accounts';
import type { Database, Transaction } from './db';
import { events, registrations, user } from './db/schema';
import { sendCertificate, sendTicket } from './email';
import type { Env } from './env';
import {
  type ApiEnv,
  ApiError,
  actorId,
  conflict,
  idSchema,
  operation,
  requireProfile,
  requireStaff,
  sessionAccount,
  unavailable,
  validationHook,
} from './http';

const eventDto = eventSchema.extend({ id: idSchema, status: z.enum(['draft', 'published']) });
const registrationDto = z.object({
  id: idSchema,
  eventId: idSchema,
  userId: z.string(),
  active: z.boolean(),
  checkedIn: z.boolean(),
  reviewed: z.boolean(),
  certificate: z.enum(['none', 'pending', 'sent', 'failed']),
});
const eventDetailDto = z.object({ event: eventDto, registrations: z.array(registrationDto) });
const attendeeDto = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  checkedIn: z.boolean(),
});
const reviewResultsDto = z.object({
  count: z.number(),
  average: z.number(),
  comments: z.array(z.string()),
});
const eventParams = validator('param', z.object({ eventId: idSchema }), validationHook);
const registrationParams = validator(
  'param',
  z.object({ registrationId: idSchema }),
  validationHook,
);
const emptyBody = validator('json', z.object({}).strict(), validationHook);

export function toEvent(row: typeof events.$inferSelect): CampusEvent {
  return { ...row, start: new Date(row.start).toISOString(), end: new Date(row.end).toISOString() };
}

function toRegistration(row: typeof registrations.$inferSelect): Registration {
  const { id, eventId, userId, active, checkedInAt, rating, certificate } = row;
  return {
    id,
    eventId,
    userId,
    active,
    checkedIn: !!checkedInAt,
    reviewed: rating !== null,
    certificate,
  };
}

async function readEvent(db: Database | Transaction, eventId: string, lock = false) {
  const query = db.select().from(events).where(eq(events.id, eventId));
  const [event] = await (lock ? query.for('update') : query);
  if (!event) throw unavailable();
  return toEvent(event);
}

async function activeRegistration(db: Transaction, eventId: string, userId: string) {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.userId, userId),
        eq(registrations.active, true),
      ),
    );
  return registration;
}

async function validatedEvent(env: Env, input: z.infer<typeof eventSchema>, id: string) {
  const draft: CampusEvent = { ...input, id, status: 'draft' };
  const issue = eventInputIssue(draft);
  if (issue) throw new ApiError(400, issue);
  if (input.banner && !(await env.IMAGES.head(input.banner)))
    throw new ApiError(400, 'Upload the banner image again.');
  return input;
}

export const eventRoutes = new Hono<ApiEnv>()
  .get(
    '/events',
    operation('List upcoming and ongoing public events', z.array(eventDto), false),
    async (c) => {
      const rows = await c.var.db
        .select()
        .from(events)
        .where(
          and(eq(events.status, 'published'), gt(events.end, new Date(Date.now()).toISOString())),
        )
        .orderBy(asc(events.start));
      return c.json(rows.map(toEvent));
    },
  )
  .get(
    '/events/:eventId',
    operation(
      'Read a public event and any registrations owned by the current account',
      eventDetailDto,
      false,
    ),
    eventParams,
    async (c) => {
      const { eventId } = c.req.valid('param');
      const account = await sessionAccount(c);
      const rows = await c.var.db
        .select({ event: events, registration: registrations })
        .from(events)
        .leftJoin(
          registrations,
          and(eq(registrations.eventId, events.id), eq(registrations.userId, account?.id ?? '')),
        )
        .where(and(eq(events.id, eventId), eq(events.status, 'published')));
      if (!rows[0]) throw unavailable();
      return c.json({
        event: toEvent(rows[0].event),
        registrations: rows.flatMap(({ registration }) =>
          registration ? [toRegistration(registration)] : [],
        ),
      });
    },
  )
  .get(
    '/registrations',
    operation(
      'List registrations owned by the current account',
      z.array(
        z.object({
          event: eventDto,
          registration: registrationDto,
        }),
      ),
    ),
    async (c) => {
      const account = requireProfile(await readAccount(c.var.db, await actorId(c)));
      const rows = await c.var.db
        .select({ event: events, registration: registrations })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(and(eq(registrations.userId, account.id), eq(events.status, 'published')));
      return c.json(
        rows.map(({ event, registration }) => ({
          event: toEvent(event),
          registration: toRegistration(registration),
        })),
      );
    },
  )
  .get('/staff/events', operation('List all events for staff', z.array(eventDto)), async (c) => {
    requireStaff(await readAccount(c.var.db, await actorId(c)));
    return c.json((await c.var.db.select().from(events).orderBy(asc(events.start))).map(toEvent));
  })
  .post(
    '/staff/events',
    operation('Create a draft'),
    validator('json', eventSchema.strict(), validationHook),
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const [created] = await c.var.db
        .insert(events)
        .values(await validatedEvent(c.env, c.req.valid('json'), ''))
        .returning({ id: events.id });
      return c.json({ ok: true, message: 'Draft saved.', id: created.id });
    },
  )
  .get(
    '/staff/events/:eventId',
    operation('Read an event, including drafts, as staff', eventDto),
    eventParams,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      return c.json(await readEvent(c.var.db, c.req.valid('param').eventId));
    },
  )
  .patch(
    '/staff/events/:eventId',
    operation('Update an existing draft'),
    eventParams,
    validator('json', eventSchema.strict(), validationHook),
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      const input = await validatedEvent(c.env, c.req.valid('json'), eventId);
      await c.var.db.transaction(async (tx) => {
        requireStaff(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        if (event.status !== 'draft')
          throw new ApiError(409, 'Only drafts can be edited or published.');
        await tx.update(events).set(input).where(eq(events.id, eventId));
      });
      return c.json({ ok: true, message: 'Draft saved.', id: eventId });
    },
  )
  .post(
    '/staff/events/:eventId/publish',
    operation('Publish a draft more than 24 hours before start'),
    eventParams,
    emptyBody,
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      await c.var.db.transaction(async (tx) => {
        const staff = requireStaff(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        conflict(publishIssue(event, staff, Date.now()));
        await tx.update(events).set({ status: 'published' }).where(eq(events.id, eventId));
      });
      return c.json({ ok: true, message: 'Event published.' });
    },
  )
  .post(
    '/staff/events/:eventId/unpublish',
    operation('Unpublish an event before its start and invalidate all its tickets'),
    eventParams,
    emptyBody,
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      await c.var.db.transaction(async (tx) => {
        const staff = requireStaff(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        conflict(unpublishIssue(event, staff, Date.now()));
        await tx.delete(registrations).where(eq(registrations.eventId, eventId));
        await tx.update(events).set({ status: 'draft' }).where(eq(events.id, eventId));
      });
      return c.json({
        ok: true,
        message: 'Event returned to draft. Registrations and tickets were cleared.',
      });
    },
  )
  .delete(
    '/staff/events/:eventId',
    operation('Delete any event and its dependent records'),
    eventParams,
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      await c.var.db.transaction(async (tx) => {
        requireStaff(await readAccount(tx, id, true));
        await readEvent(tx, eventId, true);
        await tx.delete(events).where(eq(events.id, eventId));
      });
      return c.json({ ok: true, message: 'Event deleted.' });
    },
  )
  .post(
    '/events/:eventId/registrations',
    operation('Join a public event and send the QR ticket'),
    eventParams,
    emptyBody,
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      const { event, account, registration } = await c.var.db.transaction(async (tx) => {
        const account = requireProfile(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        if (event.status !== 'published') throw unavailable();
        if (account.role) throw new ApiError(403, 'Staff cannot join new events.');
        conflict(joinIssue(event, account, Date.now()));
        const [registration] = await tx
          .insert(registrations)
          .values({ eventId, userId: id })
          .onConflictDoNothing()
          .returning();
        if (!registration) throw new ApiError(409, 'You already have an active registration.');
        return { event, account, registration };
      });
      try {
        await sendTicket(c.env, account, event, registration.ticket);
      } catch {
        return c.json({
          ok: true,
          warning: true,
          id: registration.id,
          message:
            'Registration confirmed. The email could not be sent. Your QR ticket will appear on the event page when cancellation closes.',
        });
      }
      return c.json({
        ok: true,
        id: registration.id,
        message: 'Registration confirmed. Your QR ticket was emailed.',
      });
    },
  )
  .get(
    '/registrations/:registrationId/ticket',
    operation(
      'Read your active QR ticket',
      z.object({
        event: eventDto,
        ticket: idSchema,
      }),
    ),
    registrationParams,
    async (c) => {
      const account = requireProfile(await readAccount(c.var.db, await actorId(c)));
      const { registrationId } = c.req.valid('param');
      const [row] = await c.var.db
        .select({ event: events, ticket: registrations.ticket })
        .from(registrations)
        .innerJoin(events, eq(registrations.eventId, events.id))
        .where(
          and(
            eq(registrations.id, registrationId),
            eq(registrations.userId, account.id),
            eq(registrations.active, true),
            eq(events.status, 'published'),
          ),
        );
      if (!row) throw new ApiError(404, 'Ticket unavailable');
      return c.json({ event: toEvent(row.event), ticket: row.ticket });
    },
  )
  .delete(
    '/registrations/:registrationId',
    operation('Cancel your registration before the 24-hour cutoff'),
    registrationParams,
    async (c) => {
      const id = await actorId(c);
      const { registrationId } = c.req.valid('param');
      const [own] = await c.var.db
        .select({ eventId: registrations.eventId })
        .from(registrations)
        .where(and(eq(registrations.id, registrationId), eq(registrations.userId, id)));
      if (!own) throw new ApiError(404, 'Ticket unavailable');
      await c.var.db.transaction(async (tx) => {
        requireProfile(await readAccount(tx, id, true));
        const event = await readEvent(tx, own.eventId, true);
        if (event.status !== 'published') throw unavailable();
        if (Date.now() >= registrationCutoff(event))
          throw new ApiError(409, 'Registration and cancellation are closed.');
        const [cancelled] = await tx
          .update(registrations)
          .set({ active: false })
          .where(and(eq(registrations.id, registrationId), eq(registrations.active, true)))
          .returning();
        if (!cancelled) throw new ApiError(404, 'Ticket unavailable');
      });
      return c.json({
        ok: true,
        message: 'Registration cancelled. Your QR ticket is now invalid.',
      });
    },
  )
  .get(
    '/staff/events/:eventId/attendees',
    operation(
      'Read attendee names, emails, and attendance status',
      z.object({
        event: eventDto,
        attendees: z.array(attendeeDto),
      }),
    ),
    eventParams,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const event = await readEvent(c.var.db, c.req.valid('param').eventId);
      const attendees = await c.var.db
        .select({
          id: registrations.id,
          name: user.profileName,
          email: user.email,
          checkedIn: sql<boolean>`${registrations.checkedInAt} is not null`,
        })
        .from(registrations)
        .innerJoin(user, eq(registrations.userId, user.id))
        .where(and(eq(registrations.eventId, event.id), eq(registrations.active, true)))
        .orderBy(asc(user.profileName), asc(user.email));
      return c.json({
        event,
        attendees: attendees.map((row) => ({ ...row, name: row.name ?? '' })),
      });
    },
  )
  .post(
    '/staff/events/:eventId/check-in',
    operation('Validate a QR ticket and record or return check-in'),
    eventParams,
    validator('json', z.object({ ticket: z.string().min(1).max(512) }).strict(), validationHook),
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      const { ticket } = c.req.valid('json');
      const result = await c.var.db.transaction(async (tx) => {
        const staff = requireStaff(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        if (!idSchema.safeParse(ticket).success)
          throw new ApiError(404, 'This QR ticket is invalid for this event.');
        const [registration] = await tx
          .select()
          .from(registrations)
          .where(
            and(
              eq(registrations.eventId, eventId),
              eq(registrations.ticket, ticket),
              eq(registrations.active, true),
            ),
          );
        const now = Date.now();
        const issue = checkInIssue(event, registration && toRegistration(registration), staff, now);
        if (issue === 'This attendee is already checked in.' && registration?.checkedInAt) {
          return { message: issue, checkedInAt: new Date(registration.checkedInAt).toISOString() };
        }
        conflict(issue);
        const checkedInAt = new Date(now).toISOString();
        await tx
          .update(registrations)
          .set({ checkedInAt })
          .where(eq(registrations.id, registration.id));
        return { message: 'Check-in recorded.', checkedInAt };
      });
      return c.json({ ok: true, ...result });
    },
  )
  .post(
    '/events/:eventId/review',
    operation('Submit a review once during the 72-hour window'),
    eventParams,
    validator('json', reviewSchema.strict(), validationHook),
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      await c.var.db.transaction(async (tx) => {
        requireProfile(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        if (event.status !== 'published') throw unavailable();
        const registration = await activeRegistration(tx, eventId, id);
        conflict(reviewIssue(event, registration && toRegistration(registration), Date.now()));
        await tx
          .update(registrations)
          .set(c.req.valid('json'))
          .where(eq(registrations.id, registration.id));
      });
      return c.json({ ok: true, message: 'Review submitted' });
    },
  )
  .get(
    '/staff/events/:eventId/reviews',
    operation(
      'Read aggregate rating, response count and anonymous comments',
      z.object({ event: eventDto, results: reviewResultsDto }),
    ),
    eventParams,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const event = await readEvent(c.var.db, c.req.valid('param').eventId);
      const [results] = await c.var.db
        .select({
          count: sql<number>`count(${registrations.rating})::int`,
          average: sql<number>`coalesce(avg(${registrations.rating}), 0)::float8`,
          comments: sql<
            string[]
          >`coalesce(array_agg(${registrations.comment} order by ${registrations.comment}) filter (where ${registrations.rating} is not null and ${registrations.comment} <> ''), '{}'::text[])`,
        })
        .from(registrations)
        .where(and(eq(registrations.eventId, event.id), eq(registrations.active, true)));
      return c.json({ event, results });
    },
  )
  .post(
    '/events/:eventId/certificate',
    operation('Reserve a single certificate request and send the PDF'),
    eventParams,
    emptyBody,
    async (c) => {
      const id = await actorId(c);
      const { eventId } = c.req.valid('param');
      const { registration, event, account, now } = await c.var.db.transaction(async (tx) => {
        const account = requireProfile(await readAccount(tx, id, true));
        const event = await readEvent(tx, eventId, true);
        if (event.status !== 'published') throw unavailable();
        const registration = await activeRegistration(tx, eventId, id);
        const now = Date.now();
        conflict(certificateIssue(event, registration && toRegistration(registration), now));
        await tx
          .update(registrations)
          .set({ certificate: 'pending' })
          .where(eq(registrations.id, registration.id));
        return { registration, event, account, now };
      });
      let certificate: 'sent' | 'failed' = 'sent';
      try {
        await sendCertificate(c.env, account, event, now);
      } catch {
        certificate = 'failed';
      }
      await c.var.db
        .update(registrations)
        .set({ certificate })
        .where(eq(registrations.id, registration.id));
      return certificate === 'sent'
        ? c.json({ ok: true, message: 'Certificate emailed' })
        : c.json(
            { ok: false, message: 'Certificate email failed. Another request is unavailable.' },
            503,
          );
    },
  );
