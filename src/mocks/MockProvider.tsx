import { type ReactNode, useRef, useState } from 'react';
import { instant } from '../domain/rules';
import type { Outcome } from '../domain/types';
import { applyAction, type MockAction } from './actions';
import { clocks, createFixtures } from './fixtures';
import { MockContext } from './hooks';

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
  return <MockContext.Provider value={value}>{children}</MockContext.Provider>;
}
