import { and, asc, eq, gt, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import { HOUR } from '../src/domain/rules';
import { toUser } from './auth';
import type { Database } from './db';
import { events, registrations, user } from './db/schema';
import { sendReviewInvitation } from './email';
import type { Env } from './env';
import { toEvent } from './events';

export async function inviteReviewers(env: Env, db: Database, now: number) {
  const time = new Date(now).toISOString();
  const invitations = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: registrations.id, event: events, account: user })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(user, eq(registrations.userId, user.id))
      .where(
        and(
          eq(events.status, 'published'),
          lte(events.end, time),
          gt(events.end, new Date(now - 72 * HOUR).toISOString()),
          eq(registrations.active, true),
          isNotNull(registrations.checkedInAt),
          isNotNull(events.form),
          isNull(registrations.answers),
          isNull(registrations.invitedAt),
        ),
      )
      .orderBy(asc(events.end), asc(registrations.id))
      .limit(50)
      .for('update', { of: registrations, skipLocked: true });
    if (rows.length)
      await tx
        .update(registrations)
        .set({ invitedAt: time })
        .where(
          inArray(
            registrations.id,
            rows.map(({ id }) => id),
          ),
        );
    return rows;
  });

  for (const { id, event, account } of invitations) {
    try {
      await sendReviewInvitation(env, toUser(account), toEvent(event), id);
    } catch {
      await db.update(registrations).set({ invitedAt: null }).where(eq(registrations.id, id));
      console.warn('Review invitation could not be sent', { registrationId: id });
    }
    if (invitations.length > 1) await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
