import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { type DateKey, type Habit, newHabitId, todayKey } from './lib';

export type HabitDraft = Pick<Habit, 'name' | 'icon' | 'color' | 'category' | 'target' | 'targetUnit' | 'schedule'>;

/** All non-archived habits in display order; undefined while loading. */
export function useHabits(): Habit[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.habits.orderBy('order').toArray();
    return all.filter((h) => !h.archived);
  });
}

export function useHabit(id: string | undefined): Habit | undefined | null {
  return useLiveQuery(async () => (id ? (await db.habits.get(id)) ?? null : null), [id]);
}

export async function addHabit(draft: HabitDraft): Promise<string> {
  const last = await db.habits.orderBy('order').last();
  const id = newHabitId();
  await db.habits.add({ ...draft, id, entries: {}, createdAt: Date.now(), order: (last?.order ?? -1) + 1 });
  return id;
}

export async function updateHabit(id: string, patch: Partial<HabitDraft>): Promise<void> {
  await db.habits.update(id, patch);
}

export async function deleteHabit(id: string): Promise<void> {
  await db.habits.delete(id);
}

/** Sets a day's count, clamped to 0..target; 0 removes the entry. */
export async function setEntry(id: string, date: DateKey, value: number): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    const h = await db.habits.get(id);
    if (!h) return;
    const entries = { ...h.entries };
    const next = Math.max(0, Math.min(h.target, value));
    if (next === 0) delete entries[date];
    else entries[date] = next;
    await db.habits.update(id, { entries });
  });
}

/** Tap on a habit: +1 until the target is reached, then back to 0. */
export async function checkIn(id: string, date: DateKey = todayKey()): Promise<void> {
  const h = await db.habits.get(id);
  if (!h) return;
  const cur = h.entries[date] || 0;
  await setEntry(id, date, cur >= h.target ? 0 : cur + 1);
}

export async function appendHabits(habits: Habit[]): Promise<void> {
  const last = await db.habits.orderBy('order').last();
  const start = (last?.order ?? -1) + 1;
  await db.habits.bulkPut(habits.map((h, i) => ({ ...h, order: start + i })));
}

export async function replaceAllHabits(habits: Habit[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    await db.habits.clear();
    await db.habits.bulkPut(habits.map((h, i) => ({ ...h, order: h.order ?? i })));
  });
}
