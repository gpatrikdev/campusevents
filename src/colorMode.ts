import { useSyncExternalStore } from 'react';

export type ColorMode = 'system' | 'light' | 'dark';

// The choice belongs to this browser, not the account. A store that can't be
// read or written leaves the app following the system setting.
const storageKey = 'campus-color-mode';
const listeners = new Set<() => void>();

function readStored(): ColorMode {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

let current = readStored();

export function isColorMode(value: string): value is ColorMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function setColorMode(mode: ColorMode) {
  current = mode;
  try {
    if (mode === 'system') localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, mode);
  } catch {
    // The choice still applies until the page reloads.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useColorMode() {
  return useSyncExternalStore(subscribe, () => current);
}
