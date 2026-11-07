import { createAuthClient } from 'better-auth/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { hc } from 'hono/client';
import type { AppType } from '../../worker';
import type { Action, Language, Outcome } from '../domain/types';

export const api = hc<AppType>('/').api;
export const auth = createAuthClient({ plugins: [magicLinkClient()] });

export class RequestError extends Error {
  constructor(readonly status: number) {
    super(`Request failed (${status})`);
  }
}

export async function read<T>(
  request: Promise<{ ok: boolean; status: number; json: () => Promise<T> }>,
) {
  const response = await request;
  if (!response.ok) throw new RequestError(response.status);
  return response.json();
}

export async function send(action: Action, language: Language): Promise<Outcome> {
  switch (action.type) {
    case 'profile':
      return (await api.profile.name.$post({ json: { name: action.name, language } })).json();
    case 'role':
      return (
        await api.admin.accounts[':userId'].$patch({
          param: { userId: action.userId },
          json: { organizer: action.organizer },
        })
      ).json();
    case 'save': {
      const { id, title, location, timezone, start, end, content, banner, form } = action.event;
      const json = { title, location, timezone, start, end, content, banner, form };
      return (
        await (id
          ? api.staff.events[':eventId'].$patch({ param: { eventId: id }, json })
          : api.staff.events.$post({ json }))
      ).json();
    }
    case 'cancel':
      return (
        await api.registrations[':registrationId'].$delete({
          param: { registrationId: action.registrationId },
        })
      ).json();
    case 'delete':
      return (
        await api.staff.events[':eventId'].$delete({ param: { eventId: action.eventId } })
      ).json();
    case 'publish':
    case 'unpublish':
      return (
        await api.staff.events[':eventId'][action.type].$post({
          param: { eventId: action.eventId },
          json: {},
        })
      ).json();
    case 'scan':
      return (
        await api.staff.events[':eventId']['check-in'].$post({
          param: { eventId: action.eventId },
          json: { ticket: action.ticket },
        })
      ).json();
    case 'review':
      return (
        await api.events[':eventId'].review.$post({
          param: { eventId: action.eventId },
          json: { answers: action.answers },
        })
      ).json();
    case 'saveTemplate': {
      const { id, name, form } = action.template;
      const json = { name, form };
      return (
        await (id
          ? api.staff.templates[':templateId'].$patch({ param: { templateId: id }, json })
          : api.staff.templates.$post({ json }))
      ).json();
    }
    case 'deleteTemplate':
      return (
        await api.staff.templates[':templateId'].$delete({
          param: { templateId: action.templateId },
        })
      ).json();
    case 'certificate':
      return (
        await api.events[':eventId'].certificate.$post({
          param: { eventId: action.eventId },
          json: {},
        })
      ).json();
    case 'join':
      return (
        await api.events[':eventId'].registrations.$post({
          param: { eventId: action.eventId },
          json: {},
        })
      ).json();
  }
}
