import Dexie, { type EntityTable } from 'dexie';
import type { Habit } from './features/habits/lib';

// One IndexedDB for all modules. Each new module adds its tables in a new
// `db.version(n)` block; never edit an already shipped version.
export const db = new Dexie('myeveryday') as Dexie & {
  habits: EntityTable<Habit, 'id'>;
};

db.version(1).stores({
  habits: 'id, order, category',
});

export interface Backup {
  app: 'myeveryday';
  version: 1;
  exportedAt: string;
  habits: Habit[];
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'myeveryday',
    version: 1,
    exportedAt: new Date().toISOString(),
    habits: await db.habits.toArray(),
  };
}

export async function wipeAll(): Promise<void> {
  await db.habits.clear();
}
