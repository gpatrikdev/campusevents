import { describe, expect, it } from 'vitest';
import { HOUR, instant } from './rules';
import { filterStaffEvents, type StaffFilters } from './staffEvents';
import type { CampusEvent } from './types';

const now = instant('2026-11-06T12:00:00Z');

function event(id: string, start: string, end: string, extra: Partial<CampusEvent> = {}) {
  return {
    id,
    title: id,
    location: 'Main hall',
    start,
    end,
    timezone: 'Europe/Budapest',
    content: '',
    banner: null,
    status: 'published',
    ...extra,
  } satisfies CampusEvent;
}

const ids = (events: CampusEvent[], filters: Partial<StaffFilters>) =>
  filterStaffEvents(events, { status: 'upcoming', ...filters }, now, 'hu').map(({ id }) => id);

describe('staff event filters', () => {
  it('keeps the status split and sorts past events and the full list newest first', () => {
    const events = [
      event('draft', '2026-12-01T10:00:00Z', '2026-12-01T12:00:00Z', { status: 'draft' }),
      event('later', '2026-12-02T10:00:00Z', '2026-12-02T12:00:00Z'),
      event('sooner', '2026-11-20T10:00:00Z', '2026-11-20T12:00:00Z'),
      event('now', '2026-11-06T11:00:00Z', '2026-11-06T13:00:00Z'),
      event('older', '2026-10-01T10:00:00Z', '2026-10-01T12:00:00Z'),
      event('newer', '2026-11-01T10:00:00Z', '2026-11-01T12:00:00Z'),
    ];
    expect(ids(events, {})).toEqual(['sooner', 'later']);
    expect(ids(events, { status: 'draft' })).toEqual(['draft']);
    expect(ids(events, { status: 'ongoing' })).toEqual(['now']);
    expect(ids(events, { status: 'past' })).toEqual(['newer', 'older']);
    expect(ids(events, { status: 'all' })).toEqual([
      'later',
      'draft',
      'sooner',
      'now',
      'newer',
      'older',
    ]);
  });

  it('matches part of the title in any case and the exact location', () => {
    const events = [
      event('a', '2026-12-01T10:00:00Z', '2026-12-01T12:00:00Z', { title: 'Évzáró ÜNNEPSÉG' }),
      event('b', '2026-12-02T10:00:00Z', '2026-12-02T12:00:00Z', { location: 'Library' }),
    ];
    expect(ids(events, { title: '  ünnep ' })).toEqual(['a']);
    expect(ids(events, { location: 'Library' })).toEqual(['b']);
    expect(ids(events, { location: 'Lib' })).toEqual([]);
  });

  it('reads the date range in the event timezone', () => {
    // 23:30 on 30 November in Budapest is already 1 December there, not in UTC.
    const late = event('late', '2026-11-30T23:30:00Z', '2026-12-01T01:00:00Z');
    // The same instants in New York fall on 30 November.
    const west = { ...late, id: 'west', timezone: 'America/New_York' };
    expect(ids([late, west], { range: { start: '2026-12-01', end: '2026-12-01' } })).toEqual([
      'late',
    ]);
    expect(ids([late, west], { range: { start: '2026-11-30', end: '2026-11-30' } })).toEqual([
      'west',
    ]);
  });

  it('counts each day a multi-day event runs, but not a midnight end', () => {
    // 1 December 09:00 to 3 December 00:00, Budapest time.
    const events = [event('festival', '2026-12-01T08:00:00Z', '2026-12-02T23:00:00Z')];
    expect(ids(events, { range: { start: '2026-12-02', end: '2026-12-02' } })).toEqual([
      'festival',
    ]);
    expect(ids(events, { range: { start: '2026-11-25', end: '2026-12-01' } })).toEqual([
      'festival',
    ]);
    expect(ids(events, { range: { start: '2026-12-03', end: '2026-12-10' } })).toEqual([]);
  });

  it('splits upcoming events at the 24-hour registration cutoff', () => {
    const start = (hours: number) => new Date(now + hours * HOUR).toISOString();
    const events = [
      event('closing', start(24), start(26)),
      event('open', start(25), start(27)),
      event('closed', start(23), start(25)),
    ];
    expect(ids(events, { registration: 'open' })).toEqual(['open']);
    expect(ids(events, { registration: 'closed' })).toEqual(['closed', 'closing']);
  });

  it('never counts a draft as open or closed for registration', () => {
    const start = (hours: number) => new Date(now + hours * HOUR).toISOString();
    const events = [
      event('open', start(48), start(50)),
      event('closed', start(-48), start(-46)),
      event('future-draft', start(48), start(50), { status: 'draft' }),
      event('past-draft', start(-48), start(-46), { status: 'draft' }),
    ];
    expect(ids(events, { status: 'all', registration: 'open' })).toEqual(['open']);
    expect(ids(events, { status: 'all', registration: 'closed' })).toEqual(['closed']);
  });
});
