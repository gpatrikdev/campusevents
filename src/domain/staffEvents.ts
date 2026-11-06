import { Temporal } from '@js-temporal/polyfill';
import { hasEnded, instant, registrationCutoff } from './rules';
import type { CampusEvent } from './types';

export type EventPhase = 'draft' | 'upcoming' | 'ongoing' | 'past';
export type StaffStatus = EventPhase | 'all';

export interface StaffFilters {
  status: StaffStatus;
  /** Part of the title, in any case. */
  title?: string;
  location?: string;
  /** Calendar days, both ends included, read in each event's own timezone. */
  range?: { start: string; end: string };
  /** Drafts take no registrations, so they match neither value. */
  registration?: 'open' | 'closed';
}

/** A draft, or a published event before, during or after it runs. */
export function eventPhase(event: CampusEvent, now: number): EventPhase {
  if (event.status === 'draft') return 'draft';
  if (hasEnded(event, now)) return 'past';
  return now >= instant(event.start) ? 'ongoing' : 'upcoming';
}

/** Whether the event runs on any day of the range in its own timezone. */
function runsDuring(event: CampusEvent, range: { start: string; end: string }) {
  const first = Temporal.Instant.from(event.start).toZonedDateTimeISO(event.timezone);
  // An event that ends at midnight does not run on the next day.
  const last = Temporal.Instant.from(event.end)
    .subtract({ nanoseconds: 1 })
    .toZonedDateTimeISO(event.timezone);
  return (
    Temporal.PlainDate.compare(first.toPlainDate(), range.end) <= 0 &&
    Temporal.PlainDate.compare(last.toPlainDate(), range.start) >= 0
  );
}

/** The events the staff list shows for these filters, in display order. */
export function filterStaffEvents(
  events: CampusEvent[],
  filters: StaffFilters,
  now: number,
  language: string,
) {
  const title = filters.title?.trim().toLocaleLowerCase(language);
  return (
    events
      .filter(
        (event) =>
          (filters.status === 'all' || eventPhase(event, now) === filters.status) &&
          (!title || event.title.toLocaleLowerCase(language).includes(title)) &&
          (!filters.location || event.location === filters.location) &&
          (!filters.range || runsDuring(event, filters.range)) &&
          (!filters.registration ||
            (event.status === 'published' &&
              now >= registrationCutoff(event) === (filters.registration === 'closed'))),
      )
      // Past events and the full list show the latest first, so old events don't bury new ones.
      .sort((a, b) =>
        filters.status === 'past' || filters.status === 'all'
          ? instant(b.start) - instant(a.start)
          : instant(a.start) - instant(b.start),
      )
  );
}
