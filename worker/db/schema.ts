import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ReviewAnswers, ReviewForm } from '../../src/domain/reviewForm';
import { user } from './auth-schema';

export * from './auth-schema';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const events = pgTable(
  'events',
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    location: text().notNull(),
    start: instant('starts_at').notNull(),
    end: instant('ends_at').notNull(),
    timezone: text().notNull(),
    content: text().notNull(),
    banner: uuid(),
    form: jsonb().$type<ReviewForm>(),
    status: text({ enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
  },
  (table) => [
    check('event_date_order', sql`${table.end} > ${table.start}`),
    check('event_status', sql`${table.status} in ('draft', 'published')`),
    index('event_discovery').on(table.status, table.start),
  ],
);

export const registrations = pgTable(
  'registrations',
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ticket: uuid().notNull().defaultRandom().unique(),
    active: boolean().notNull().default(true),
    checkedInAt: instant('checked_in_at'),
    answers: jsonb().$type<ReviewAnswers>(),
    certificate: text({ enum: ['none', 'pending', 'sent', 'failed'] })
      .notNull()
      .default('none'),
    invitedAt: instant('invited_at'),
  },
  (table) => [
    uniqueIndex('one_active_registration')
      .on(table.eventId, table.userId)
      .where(sql`${table.active}`),
    index('registration_event').on(table.eventId),
    index('registration_user').on(table.userId),
    check('certificate_status', sql`${table.certificate} in ('none', 'pending', 'sent', 'failed')`),
  ],
);

export const reviewTemplates = pgTable('review_templates', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  form: jsonb().$type<ReviewForm>().notNull(),
  updatedAt: instant('updated_at').notNull().defaultNow(),
});
