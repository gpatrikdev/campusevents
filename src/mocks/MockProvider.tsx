import './preview.css';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../api/context';
import { keepLocalImage } from '../api/images';
import { eventStatistics } from '../domain/eventStatistics';
import { summarize } from '../domain/reviewForm';
import { instant } from '../domain/rules';
import type { Outcome } from '../domain/types';
import i18n from '../i18n';
import { applyAction, type MockAction } from './actions';
import { clocks, createFixtures } from './fixtures';
import { MockContext } from './hooks';
import { PreviewControls } from './PreviewControls';
import { SampleScanner } from './SampleScanner';
import SignIn from './SignInPage';
import { previewHu } from './translations';

i18n.addResourceBundle('hu', 'translation', previewHu);

type DataState = 'ready' | 'loading' | 'empty' | 'error';

/** Minutes from the start for sample check-ins, most of them shortly before it. */
const ARRIVALS = [-48, -31, -22, -17, -12, -9, -6, -4, -2, -1, 0, 1, 3, 6, 11, 19, 34, 52];
type Clock = keyof typeof clocks;

function useMockState() {
  const [data, setData] = useState(createFixtures);
  const current = useRef(data);
  const [identity, setIdentity] = useState('visitor');
  const [clock, setClock] = useState<Clock>('reference');
  const [dataState, setDataState] = useState<DataState>('ready');
  const [failActions, setFailActions] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [revision, setRevision] = useState(0);
  const user = data.users.find((item) => item.id === identity);
  const now = instant(clocks[clock]);

  function run(action: MockAction) {
    const result = applyAction(current.current, action, {
      userId: user?.id ?? null,
      now,
      fail: failActions,
    });
    current.current = result.data;
    setData(result.data);
    setRevision((value) => value + 1);
    setOutcome(result.outcome);
    return result.outcome;
  }

  function reset() {
    const fresh = createFixtures();
    current.current = fresh;
    setData(fresh);
    setIdentity('visitor');
    setClock('reference');
    setDataState('ready');
    setFailActions(false);
    setOutcome(null);
    setRevision((value) => value + 1);
  }

  return {
    data,
    user,
    identity,
    setIdentity,
    now,
    clock,
    setClock,
    dataState,
    setDataState,
    failActions,
    setFailActions,
    outcome,
    setOutcome,
    revision,
    run,
    reset,
  };
}

export type MockState = ReturnType<typeof useMockState>;

export function MockProvider({ children }: { children: ReactNode }) {
  const value = useMockState();
  const { i18n } = useTranslation();
  const { data } = value;
  const attendees = Object.fromEntries(
    data.events.map(({ id }) => [
      id,
      data.registrations
        .filter((row) => row.active && row.eventId === id)
        .flatMap((row) => {
          const account = data.users.find((user) => user.id === row.userId);
          return account
            ? [{ id: row.id, name: account.name, email: account.email, checkedIn: row.checkedIn }]
            : [];
        }),
    ]),
  );
  const results = Object.fromEntries(
    data.events.map(({ id, form }) => [
      id,
      summarize(
        form,
        data.reviews.filter((row) => row.eventId === id).map((row) => row.answers),
      ),
    ]),
  );
  const statistics = Object.fromEntries(
    data.events.map((event) => {
      // shortcut: sample registrations store no check-in time, so the preview spreads
      // them around the start. Store real times if the preview ever needs exact ones.
      const rows = data.registrations
        .filter((row) => row.eventId === event.id)
        .map((row, index) => ({
          ...row,
          checkedInAt: row.checkedIn
            ? new Date(
                instant(event.start) + (ARRIVALS[index % ARRIVALS.length] ?? 0) * 60_000,
              ).toISOString()
            : null,
        }));
      const responses = data.reviews
        .filter((row) => row.eventId === event.id)
        .map((row) => row.answers);
      return [event.id, eventStatistics(event, rows, responses)];
    }),
  );
  return (
    <MockContext.Provider value={value}>
      <AppContext.Provider
        value={{
          ...value,
          data: { ...data, attendees, results, statistics },
          preview: { SignIn, Scanner: SampleScanner },
          run: async (action) => value.run(action),
          upload: async (file) =>
            value.failActions
              ? { ok: false, message: 'Simulated action failed. No change was saved.' }
              : { ok: true, message: 'Image uploaded.', id: keepLocalImage(file) },
          reload: () => value.setDataState('ready'),
          signOut: () => {
            value.setIdentity('visitor');
            value.setOutcome(null);
          },
          setLanguage: async (language) => {
            await i18n.changeLanguage(language);
          },
        }}
      >
        {children}
        <PreviewControls />
      </AppContext.Provider>
    </MockContext.Provider>
  );
}
