import type { ComponentType } from 'react';
import { createContext, useContext } from 'react';
import type {
  Action,
  Attendee,
  CampusEvent,
  Language,
  Outcome,
  Registration,
  ReviewResults,
  User,
} from '../domain/types';

export type AppData = {
  events: CampusEvent[];
  users: User[];
  registrations: Registration[];
  attendees?: Record<string, Attendee[]>;
  results?: Record<string, ReviewResults>;
};

export interface AppState {
  data: AppData;
  user?: User;
  now: number;
  dataState: 'ready' | 'loading' | 'empty' | 'error';
  reload: () => void;
  /** Runs an action and shows its outcome as a toast, unless `notify` is false. */
  run: (action: Action, options?: { notify?: boolean }) => Promise<Outcome>;
  outcome: Outcome | null;
  setOutcome: (outcome: Outcome | null) => void;
  signOut: () => void;
  setLanguage: (language: Language) => Promise<void>;
  googleEnabled?: boolean;
  preview?: {
    SignIn: ComponentType<{ returnTo: string }>;
    Scanner: ComponentType<{ eventId: string }>;
  };
}

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Application context is missing');
  return context;
}
