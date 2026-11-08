import type { QuestionSummary, ReviewAnswers } from './reviewForm';
import { summarize } from './reviewForm';
import { HOUR, instant } from './rules';
import type { CampusEvent } from './types';

const MINUTE = 60_000;
const INTERVALS = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440];
const MAX_COLUMNS = 24;

/** One registration row as the database stores it, before anything is counted. */
export interface StatisticsRow {
  userId: string;
  active: boolean;
  checkedInAt: string | null;
  certificate: 'none' | 'pending' | 'sent' | 'failed';
}

export type RatingSummary = Extract<QuestionSummary, { kind: 'rating' }>;

export interface EventStatistics {
  registered: number;
  checkedIn: number;
  noShows: number;
  cancelled: number;
  reviewed: number;
  certificates: number;
  failedCertificates: number;
  /** Minutes in each arrival interval. */
  interval: number;
  /** Check-ins per interval, from check-in opening (an hour before the start) to the end. */
  arrivals: { start: string; count: number }[];
  ratings: RatingSummary[];
}

/** Counts for one event. Names, emails and user ids never leave this function. */
export function eventStatistics(
  event: CampusEvent,
  rows: StatisticsRow[],
  responses: ReviewAnswers[],
): EventStatistics {
  const active = rows.filter((row) => row.active);
  const activeUsers = new Set(active.map((row) => row.userId));
  const cancelledUsers = new Set(
    rows.filter((row) => !row.active && !activeUsers.has(row.userId)).map((row) => row.userId),
  );
  const checkedIn = active.flatMap((row) => (row.checkedInAt ? [instant(row.checkedInAt)] : []));
  const certificates = active.filter((row) => row.certificate !== 'none');

  const opens = instant(event.start) - HOUR;
  const length = instant(event.end) - opens;
  const interval =
    INTERVALS.find((minutes) => length / (minutes * MINUTE) <= MAX_COLUMNS) ??
    Math.ceil(length / MINUTE / MAX_COLUMNS);
  const step = interval * MINUTE;
  const arrivals = Array.from({ length: Math.ceil(length / step) }, (_, index) => ({
    start: new Date(opens + index * step).toISOString(),
    count: 0,
  }));
  for (const time of checkedIn) {
    const index = Math.floor((time - opens) / step);
    // A scan at the closing instant belongs to the last interval.
    const column = arrivals[Math.min(index, arrivals.length - 1)];
    if (index >= 0 && time <= opens + length && column) column.count++;
  }

  return {
    registered: active.length,
    checkedIn: checkedIn.length,
    noShows: active.length - checkedIn.length,
    cancelled: cancelledUsers.size,
    reviewed: responses.length,
    certificates: certificates.length,
    failedCertificates: certificates.filter((row) => row.certificate === 'failed').length,
    interval,
    arrivals,
    ratings: summarize(event.form, responses).questions.filter(
      (question): question is RatingSummary => question.kind === 'rating',
    ),
  };
}
