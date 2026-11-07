import { answersIssue, templateIssue, templateSchema } from '../domain/reviewForm';
import {
  certificateIssue,
  checkInIssue,
  eventInputIssue,
  isStaff,
  joinIssue,
  profileSchema,
  publishIssue,
  registrationCutoff,
  reviewIssue,
  reviewSchema,
  unpublishIssue,
} from '../domain/rules';
import type { Action, MockData, Outcome } from '../domain/types';

export type MockAction = Action;

export interface ActionContext {
  userId: string | null;
  now: number;
  fail: boolean;
}

export function applyAction(
  data: MockData,
  action: MockAction,
  context: ActionContext,
): { data: MockData; outcome: Outcome } {
  const next = structuredClone(data);
  const user = next.users.find((item) => item.id === context.userId);
  const finish = (ok: boolean, message: string, id?: string) => ({
    data: ok ? next : data,
    outcome: { ok, message, id } satisfies Outcome,
  });
  const fail = () => finish(false, 'Simulated action failed. No change was saved.');

  if (action.type === 'profile') {
    if (!user) return finish(false, 'Sign in to continue.');
    if (user.profileComplete)
      return finish(false, 'Profile names cannot be changed after confirmation.');
    const name = profileSchema.safeParse(action.name);
    if (!name.success) return finish(false, 'Enter a name between 2 and 120 characters.');
    if (context.fail) return fail();
    user.name = name.data;
    user.profileComplete = true;
    return finish(true, 'Profile name confirmed in this preview.');
  }

  if (action.type === 'role') {
    if (user?.role !== 'admin') return finish(false, 'Admin access is required.');
    const target = next.users.find((item) => item.id === action.userId);
    if (!target || target.role === 'admin')
      return finish(false, 'Admin roles cannot be changed here.');
    if (context.fail) return fail();
    target.role = action.organizer ? 'organizer' : null;
    return finish(true, 'Organizer permission updated in this preview.');
  }

  if (action.type === 'saveTemplate') {
    if (!isStaff(user)) return finish(false, 'Staff access is required.');
    const issue = templateIssue(action.template);
    if (issue) return finish(false, issue);
    const index = next.templates.findIndex((item) => item.id === action.template.id);
    if (action.template.id && index < 0) return finish(false, 'This template is unavailable.');
    if (context.fail) return fail();
    const { name, form } = templateSchema.parse({
      name: action.template.name,
      form: action.template.form,
    });
    const saved = { id: action.template.id || `template-${++next.sequence}`, name, form };
    if (index >= 0) next.templates[index] = saved;
    else next.templates.push(saved);
    return finish(true, 'Template saved in this preview.', saved.id);
  }

  if (action.type === 'deleteTemplate') {
    if (!isStaff(user)) return finish(false, 'Staff access is required.');
    if (!next.templates.some((item) => item.id === action.templateId))
      return finish(false, 'This template is unavailable.');
    if (context.fail) return fail();
    next.templates = next.templates.filter((item) => item.id !== action.templateId);
    return finish(true, 'Template deleted in this preview. Events keep their copies.');
  }

  if (action.type === 'save') {
    if (!isStaff(user)) return finish(false, 'Staff access is required.');
    const existing = next.events.find((item) => item.id === action.event.id);
    if (existing?.status === 'published')
      return finish(false, 'Only drafts can be edited or published.');
    const issue = eventInputIssue(action.event);
    if (issue) return finish(false, issue);
    if (context.fail) return fail();
    const saved = { ...action.event, status: 'draft' as const };
    if (existing) next.events[next.events.indexOf(existing)] = saved;
    else {
      saved.id = `event-${++next.sequence}`;
      next.events.push(saved);
    }
    return finish(true, 'Draft saved in this preview.', saved.id);
  }

  const registration =
    action.type === 'cancel'
      ? next.registrations.find(
          (item) => item.id === action.registrationId && item.userId === user?.id,
        )
      : undefined;
  const eventId = action.type === 'cancel' ? registration?.eventId : action.eventId;
  const event = next.events.find((item) => item.id === eventId);
  if (!event) return finish(false, 'This event is unavailable.');
  const mine = next.registrations.find(
    (item) => item.eventId === event.id && item.userId === user?.id && item.active,
  );

  switch (action.type) {
    case 'join': {
      const issue = joinIssue(event, user, context.now);
      if (issue) return finish(false, issue);
      if (mine) return finish(false, 'You already have an active registration.');
      if (context.fail) return fail();
      const id = `registration-${++next.sequence}`;
      next.registrations.push({
        id,
        eventId: event.id,
        userId: user?.id ?? '',
        ticket: `DEMO-${event.id}-${id}`,
        active: true,
        checkedIn: false,
        review: null,
        certificate: 'none',
      });
      return finish(true, 'Registration saved locally. No confirmation email was sent.');
    }
    case 'cancel':
      if (!registration?.active || event.status !== 'published')
        return finish(false, 'This QR ticket is invalid for this event.');
      if (context.now >= registrationCutoff(event))
        return finish(false, 'Registration and cancellation are closed.');
      if (context.fail) return fail();
      registration.active = false;
      return finish(true, 'Registration cancelled locally. This demo ticket is now invalid.');
    case 'publish': {
      const issue = eventInputIssue(event) ?? publishIssue(event, user, context.now);
      if (issue) return finish(false, issue);
      if (context.fail) return fail();
      event.status = 'published';
      return finish(true, 'Event published in this preview.');
    }
    case 'unpublish': {
      const issue = unpublishIssue(event, user, context.now);
      if (issue) return finish(false, issue);
      if (context.fail) return fail();
      event.status = 'draft';
      for (const item of next.registrations) if (item.eventId === event.id) item.active = false;
      return finish(
        true,
        'Event returned to draft. Registrations cleared and demo tickets invalidated.',
      );
    }
    case 'delete':
      if (!isStaff(user)) return finish(false, 'Staff access is required.');
      if (context.fail) return fail();
      next.events = next.events.filter((item) => item.id !== event.id);
      next.registrations = next.registrations.filter((item) => item.eventId !== event.id);
      next.reviews = next.reviews.filter((item) => item.eventId !== event.id);
      return finish(true, 'Event deleted in this preview.');
    case 'scan': {
      const ticket = next.registrations.find((item) => item.ticket === action.ticket);
      const issue = checkInIssue(event, ticket, user, context.now);
      if (issue) return finish(false, issue);
      if (context.fail) return fail();
      if (ticket) ticket.checkedIn = true;
      return finish(true, 'Check-in recorded locally. No real attendance was recorded.');
    }
    case 'review': {
      const issue = reviewIssue(event, mine, context.now);
      if (issue) return finish(false, issue);
      const value = reviewSchema.safeParse({ answers: action.answers });
      if (!value.success) return finish(false, 'One or more answers do not match the review form.');
      const mismatch = event.form && answersIssue(event.form, value.data.answers);
      if (mismatch) return finish(false, mismatch);
      if (context.fail) return fail();
      const { answers } = value.data;
      if (mine) mine.review = answers;
      next.reviews.push({ id: `review-${++next.sequence}`, eventId: event.id, answers });
      return finish(true, 'Review saved in this preview.');
    }
    case 'certificate': {
      const issue = certificateIssue(event, mine, context.now);
      if (issue) return finish(false, issue);
      if (mine) mine.certificate = context.fail ? 'failed' : 'sent';
      return {
        data: next,
        outcome: {
          ok: !context.fail,
          message: context.fail
            ? 'The simulated delivery failed. Another request is unavailable.'
            : 'Certificate request simulated. No PDF was issued or emailed.',
        },
      };
    }
  }
}
