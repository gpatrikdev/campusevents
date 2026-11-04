import { createContext, useContext } from 'react';
import type { MockState } from './MockProvider';

export const MockContext = createContext<MockState | null>(null);

export function useMock() {
  const context = useContext(MockContext);
  if (!context) throw new Error('MockProvider is required');
  return context;
}
