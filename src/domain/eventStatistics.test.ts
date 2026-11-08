import { describe, expect, it } from 'vitest';
import { eventStatistics, type StatisticsRow } from './eventStatistics';
import type { CampusEvent } from './types';

const event = {
  id: 'e1',
  title: 'Talk',
  location: 'Main hall',
  start: '2026-11-10T10:00:00Z',
  end: '2026-11-10T12:00:00Z',
  timezone: 'Europe/Budapest',
  content: '',
  banner: null,
  form: {
    elements: [
      {
        name: 'qrate',
        title: 'Overall',
        type: 'rating',
        isRequired: true,
        rateMin: 1,
        rateMax: 5,
        displayMode: 'buttons',
      },
      { name: 'qyes', title: 'Again?', type: 'boolean', isRequired: false },
    ],
  },
  status: 'published',
} satisfies CampusEvent;

const row = (userId: string, extra: Partial<StatisticsRow> = {}): StatisticsRow => ({
  userId,
  active: true,
  checkedInAt: null,
  certificate: 'none',
  ...extra,
});

describe('event statistics', () => {
  it('counts attendance, cancellations, reviews and certificates', () => {
    const stats = eventStatistics(
      event,
      [
        row('a', { checkedInAt: '2026-11-10T09:05:00Z', certificate: 'sent' }),
        row('b', { checkedInAt: '2026-11-10T10:12:00Z', certificate: 'failed' }),
        row('c', { checkedInAt: '2026-11-10T10:15:00Z' }),
        row('d'),
        // Cancelled once and joined again: still registered, not a cancellation.
        row('d', { active: false }),
        row('e', { active: false }),
        row('e', { active: false }),
      ],
      [{ qrate: 5, qyes: true }, { qrate: 3 }],
    );
    expect(stats).toMatchObject({
      registered: 4,
      checkedIn: 3,
      noShows: 1,
      cancelled: 1,
      reviewed: 2,
      certificates: 2,
      failedCertificates: 1,
    });
    expect(stats.ratings).toEqual([
      expect.objectContaining({ name: 'qrate', count: 2, average: 4, scores: [0, 0, 1, 0, 1] }),
    ]);
  });

  it('groups check-ins across the window and keeps the edges', () => {
    const stats = eventStatistics(
      event,
      [
        row('a', { checkedInAt: '2026-11-10T09:00:00Z' }),
        row('b', { checkedInAt: '2026-11-10T09:09:59Z' }),
        row('c', { checkedInAt: '2026-11-10T10:00:00Z' }),
        row('d', { checkedInAt: '2026-11-10T12:00:00Z' }),
      ],
      [],
    );
    // Three hours in 10-minute columns stays under the 24-column limit.
    expect(stats.interval).toBe(10);
    expect(stats.arrivals).toHaveLength(18);
    expect(stats.arrivals[0]).toEqual({ start: '2026-11-10T09:00:00.000Z', count: 2 });
    expect(stats.arrivals[6]).toEqual({ start: '2026-11-10T10:00:00.000Z', count: 1 });
    expect(stats.arrivals[17]?.count).toBe(1);
    expect(stats.arrivals.reduce((sum, column) => sum + column.count, 0)).toBe(4);
  });

  it('widens the interval for long events and handles an event without a form', () => {
    const long = { ...event, end: '2026-11-13T10:00:00Z', form: null };
    const stats = eventStatistics(long, [], []);
    // 73 hours is just over 24 three-hour columns, so it uses six-hour ones.
    expect(stats.interval).toBe(360);
    expect(stats.arrivals).toHaveLength(13);
    expect(stats.ratings).toEqual([]);
    expect(stats.registered).toBe(0);
  });
});
