import { useSyncExternalStore } from 'react';

export type ColorMode = 'system' | 'light' | 'dark';

// Kept in localStorage, not IndexedDB: it must be readable synchronously before the first render.
const KEY = 'myeveryday.colorMode';
const listeners = new Set<() => void>();

function read(): ColorMode {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function setColorMode(mode: ColorMode): void {
  localStorage.setItem(KEY, mode);
  listeners.forEach((l) => l());
}

export function useColorMode(): ColorMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
  );
}
