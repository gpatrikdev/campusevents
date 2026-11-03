import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import type { MockState } from './MockProvider';

export const MockContext = createContext<MockState | null>(null);

export function useMock() {
  const context = useContext(MockContext);
  if (!context) throw new Error('MockProvider is required');
  return context;
}

// Replace this small query with the real API call when the backend phase begins.
export function useEvents() {
  const { data, dataState, revision } = useMock();
  return useQuery({
    queryKey: ['mock-events', revision, dataState],
    queryFn: async () => {
      if (dataState === 'error') throw new Error('Simulated read error');
      return dataState === 'empty' ? [] : data.events;
    },
    enabled: dataState !== 'loading',
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });
}
