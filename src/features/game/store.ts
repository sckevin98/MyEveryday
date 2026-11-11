import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { type DateKey, todayKey } from '../habits/lib';
import { computeProgress, type Progress } from './engine';

const START_KEY = 'game.startDate';

/** The leveling clock starts the first day the app runs with it, so imported history is not scored. */
export async function ensureStartDate(): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    if (!(await db.meta.get(START_KEY))) await db.meta.put({ key: START_KEY, value: todayKey() });
  });
}

export function useProgress(): Progress | undefined {
  useEffect(() => {
    void ensureStartDate();
  }, []);
  return useLiveQuery(async () => {
    const start = await db.meta.get(START_KEY);
    if (!start) return undefined;
    return computeProgress({
      habits: await db.habits.toArray(),
      bonusDone: await db.bonusDone.toArray(),
      startDate: start.value,
      today: todayKey(),
    });
  });
}

export function useBonusDoneToday(): Set<string> | undefined {
  const today = todayKey();
  return useLiveQuery(async () => {
    const rows = await db.bonusDone.where('date').equals(today).toArray();
    return new Set(rows.map((r) => r.questId));
  }, [today]);
}

export async function toggleBonus(date: DateKey, questId: string): Promise<void> {
  const key: [DateKey, string] = [date, questId];
  if (await db.bonusDone.get(key)) await db.bonusDone.delete(key);
  else await db.bonusDone.put({ date, questId });
}
