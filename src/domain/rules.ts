import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import type { CampusEvent, Registration, User } from './types';

export const HOUR = 3_600_000;
export const instant = (iso: string) => Temporal.Instant.from(iso).epochMilliseconds;
export const isStaff = (user: User | undefined) =>
  !!user?.profileComplete && (user.role === 'organizer' || user.role === 'admin');
export const registrationCutoff = (event: CampusEvent) => instant(event.start) - 24 * HOUR;
export const reviewCutoff = (event: CampusEvent) => instant(event.end) + 72 * HOUR;
export const hasEnded = (event: CampusEvent, now: number) => now >= instant(event.end);
export const isPublic = (event: CampusEvent) => event.status === 'published';

export function joinIssue(event: CampusEvent, user: User | undefined, now: number) {
  if (!isPublic(event)) return 'This event is not public.';
  if (now >= registrationCutoff(event)) return 'Registration and cancellation are closed.';
  if (!user) return 'Sign in to continue.';
  if (!user.profileComplete) return 'Confirm your profile name first.';
  if (isStaff(user)) return 'Staff cannot join new events.';
  return null;
}

export function publishIssue(event: CampusEvent, user: User | undefined, now: number) {
  if (!isStaff(user)) return 'Staff access is required.';
  if (event.status !== 'draft') return 'Only drafts can be edited or published.';
  if (instant(event.start) - now <= 24 * HOUR) return 'The start must be more than 24 hours away.';
  return null;
}

export function unpublishIssue(event: CampusEvent, user: User | undefined, now: number) {
  if (!isStaff(user)) return 'Staff access is required.';
  if (!isPublic(event)) return 'This event is not public.';
  if (now >= instant(event.start)) return 'An event cannot be unpublished after it starts.';
  return null;
}

export function reviewIssue(
  event: CampusEvent,
  registration: Registration | undefined,
  now: number,
) {
  if (!isPublic(event) || !registration?.active || !registration.checkedIn)
    return 'Only checked-in attendees are eligible.';
  if (registration.review) return 'Review submitted';
  if (!hasEnded(event, now)) return 'Available after the event ends.';
  if (now >= reviewCutoff(event)) return 'The 72-hour review window has closed.';
  return null;
}

export function certificateIssue(
  event: CampusEvent,
  registration: Registration | undefined,
  now: number,
) {
  if (!isPublic(event) || !registration?.active || !registration.checkedIn)
    return 'Only checked-in attendees are eligible.';
  if (!hasEnded(event, now)) return 'Available after the event ends.';
  if (registration.certificate === 'pending')
    return 'Certificate requested. Email delivery is unconfirmed.';
  if (registration.certificate === 'sent') return 'Certificate emailed';
  if (registration.certificate === 'failed')
    return 'Certificate email failed. Another request is unavailable.';
  return null;
}

export function checkInIssue(
  event: CampusEvent,
  registration: Registration | undefined,
  user: User | undefined,
  now: number,
) {
  if (!isStaff(user)) return 'Staff access is required.';
  if (!isPublic(event) || !registration?.active || registration.eventId !== event.id)
    return 'This QR ticket is invalid for this event.';
  if (now < instant(event.start) - HOUR) return 'Check-in opens one hour before the start.';
  if (hasEnded(event, now)) return 'Check-in has closed.';
  if (registration.checkedIn) return 'This attendee is already checked in.';
  return null;
}

export const profileSchema = z.string().trim().min(2).max(120);
export const emailSchema = z.email().max(254);
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(''),
});
export const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(300),
  timezone: z.string().min(1).max(100),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  content: z.string().min(1).max(100_000),
  banner: z.uuid().nullable().default(null),
});

// Uploaded banners and description images. SVG is left out because it can carry scripts.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function localToInstant(value: string, timezone: string) {
  return Temporal.PlainDateTime.from(value)
    .toZonedDateTime(timezone, { disambiguation: 'reject' })
    .toInstant()
    .toString();
}

export function instantToLocal(value: string, timezone: string) {
  return Temporal.Instant.from(value)
    .toZonedDateTimeISO(timezone)
    .toPlainDateTime()
    .toString({ smallestUnit: 'minute' });
}

function hasText(node: unknown, depth = 0): boolean {
  if (depth > 64 || !node || typeof node !== 'object') return false;
  if ('text' in node && typeof node.text === 'string' && node.text.trim()) return true;
  return (
    'children' in node &&
    Array.isArray(node.children) &&
    node.children.some((child) => hasText(child, depth + 1))
  );
}

export function eventInputIssue(event: CampusEvent) {
  if (!eventSchema.safeParse(event).success) return 'Complete all required event fields.';
  try {
    Temporal.Instant.from(event.start).toZonedDateTimeISO(event.timezone);
    if (instant(event.end) <= instant(event.start)) return 'The end must be after the start.';
    const content = JSON.parse(event.content) as { root?: { children?: unknown[] } };
    if (!Array.isArray(content?.root?.children) || !hasText(content.root))
      return 'Add an event description.';
  } catch {
    return 'Enter valid dates, timezone, and event content.';
  }
  return null;
}
