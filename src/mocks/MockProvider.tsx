import './preview.css';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../api/context';
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

  function run(action: MockAction, { notify = true } = {}) {
    const result = applyAction(current.current, action, {
      userId: user?.id ?? null,
      now,
      fail: failActions,
    });
    current.current = result.data;
    setData(result.data);
    setRevision((value) => value + 1);
    if (notify) setOutcome(result.outcome);
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
    data.events.map(({ id }) => {
      const reviews = data.reviews.filter((row) => row.eventId === id);
      return [
        id,
        {
          count: reviews.length,
          average: reviews.length
            ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length
            : 0,
          comments: reviews.map((row) => row.comment).filter(Boolean),
        },
      ];
    }),
  );
  return (
    <MockContext.Provider value={value}>
      <AppContext.Provider
        value={{
          ...value,
          data: { ...data, attendees, results },
          preview: { SignIn, Scanner: SampleScanner },
          run: async (action, options) => value.run(action, options),
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
