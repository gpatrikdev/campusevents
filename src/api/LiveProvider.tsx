import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isStaff } from '../domain/rules';
import type { Action, Language, Outcome, User } from '../domain/types';
import { api, auth, RequestError, read, send } from './client';
import { AppContext, type AppData } from './context';

const emptyData: AppData = { events: [], users: [], registrations: [] };
const failure = { ok: false, message: 'Something went wrong. Try again.' };
const validEventId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function loadPage(path: string, user: User | undefined): Promise<AppData> {
  const [, first, second, third, fourth] = path.split('/');
  try {
    if (!first) return { ...emptyData, events: await read(api.events.$get()) };
    if (first === 'registrations' && user?.profileComplete) {
      const rows = await read(api.registrations.$get());
      return {
        ...emptyData,
        events: [...new Map(rows.map(({ event }) => [event.id, event])).values()],
        registrations: rows.map(({ registration }) => registration),
      };
    }
    if ((first === 'events' || first === 'review') && validEventId.test(second ?? '')) {
      const { event, registrations } = await read(
        api.events[':eventId'].$get({ param: { eventId: second } }),
      );
      return { ...emptyData, events: [event], registrations };
    }
    if (first === 'admin' && user?.profileComplete && user.role === 'admin') {
      return { ...emptyData, users: await read(api.admin.accounts.$get()) };
    }
    if (first === 'staff' && isStaff(user)) {
      if (!second) return { ...emptyData, events: await read(api.staff.events.$get()) };
      if (second === 'events' && validEventId.test(third ?? '')) {
        const route = api.staff.events[':eventId'];
        const param = { eventId: third };
        if (fourth === 'attendees') {
          const { event, attendees } = await read(route.attendees.$get({ param }));
          return { ...emptyData, events: [event], attendees: { [third]: attendees } };
        }
        if (fourth === 'reviews') {
          const { event, results } = await read(route.reviews.$get({ param }));
          return { ...emptyData, events: [event], results: { [third]: results } };
        }
        return { ...emptyData, events: [await read(route.$get({ param }))] };
      }
    }
    return emptyData;
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) return emptyData;
    throw error;
  }
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, '') });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [now, setNow] = useState(Date.now);
  const session = useQuery({
    queryKey: ['campus', 'session'],
    queryFn: () => read(api.session.$get()),
    staleTime: 15_000,
  });
  const user = session.data?.user ?? undefined;
  const page = useQuery({
    queryKey: ['campus', path, user?.id, user?.role, user?.profileComplete],
    queryFn: () => loadPage(path, user),
    enabled: session.isSuccess,
    gcTime: 0,
  });

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (user?.profileComplete && user.language) void i18n.changeLanguage(user.language);
  }, [user?.profileComplete, user?.language, i18n]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['campus'] });
  async function run(action: Action) {
    let result = failure;
    try {
      result = await send(action, i18n.language === 'hu' ? 'hu' : 'en');
    } catch {
      // The request might have committed before the connection dropped.
    }
    setOutcome(result);
    await refresh();
    return result;
  }
  async function upload(file: File): Promise<Outcome> {
    try {
      return await (await api.staff.images.$post({ form: { file } })).json();
    } catch {
      return failure;
    }
  }
  async function signOut() {
    try {
      const { error } = await auth.signOut();
      if (error) throw error;
      setOutcome(null);
      queryClient.setQueryData(['campus', 'session'], { ...session.data, user: null });
      queryClient.removeQueries({ queryKey: ['campus'], type: 'inactive' });
      await refresh();
    } catch {
      setOutcome(failure);
    }
  }
  async function setLanguage(language: Language) {
    try {
      if (user?.profileComplete) {
        const result = await (await api.profile.language.$patch({ json: { language } })).json();
        if (!result.ok) {
          setOutcome(result);
          return;
        }
      }
      localStorage.setItem('campus-language', language);
      await i18n.changeLanguage(language);
      await refresh();
    } catch {
      setOutcome(failure);
    }
  }
  return (
    <AppContext.Provider
      value={{
        data: page.data ?? emptyData,
        user,
        now,
        dataState:
          session.isError || page.isError
            ? 'error'
            : session.isPending || page.isPending
              ? 'loading'
              : 'ready',
        reload: () => {
          void refresh();
        },
        outcome,
        setOutcome,
        run,
        upload,
        signOut: () => {
          void signOut();
        },
        setLanguage,
        googleEnabled: session.data?.googleEnabled,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
