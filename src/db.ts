import Dexie, { type EntityTable, type Table } from 'dexie';
import type { DateKey, Habit } from './features/habits/lib';

export interface MetaRow {
  key: string;
  value: string;
}

export interface BonusDone {
  date: DateKey;
  questId: string;
}

// One IndexedDB for all modules. Each new module adds its tables in a new
// `db.version(n)` block; never edit an already shipped version.
export const db = new Dexie('myeveryday') as Dexie & {
  habits: EntityTable<Habit, 'id'>;
  meta: EntityTable<MetaRow, 'key'>;
  bonusDone: Table<BonusDone, [DateKey, string]>;
};

db.version(1).stores({
  habits: 'id, order, category',
});

db.version(2).stores({
  meta: 'key',
  bonusDone: '[date+questId], date',
});

export interface Backup {
  app: 'myeveryday';
  version: 2;
  exportedAt: string;
  habits: Habit[];
  meta?: MetaRow[];
  bonusDone?: BonusDone[];
}

const ALL_TABLES = () => [db.habits, db.meta, db.bonusDone];

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'myeveryday',
    version: 2,
    exportedAt: new Date().toISOString(),
    habits: await db.habits.toArray(),
    meta: await db.meta.toArray(),
    bonusDone: await db.bonusDone.toArray(),
  };
}

/** Replaces everything with the backup. Old MyHabits backups only carry habits. */
export async function restoreBackup(b: Pick<Backup, 'habits' | 'meta' | 'bonusDone'>): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
    await db.habits.bulkPut(b.habits.map((h, i) => ({ ...h, order: h.order ?? i })));
    if (b.meta) await db.meta.bulkPut(b.meta);
    if (b.bonusDone) await db.bonusDone.bulkPut(b.bonusDone);
  });
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
  });
}
