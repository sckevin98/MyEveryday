import { describe, expect, test } from 'vitest';
import type { Habit } from '../habits/lib.ts';
import { bonusQuestsFor, computeProgress, levelFromXp, rankFor, XP } from './engine.ts';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Gym',
  icon: '🏋',
  color: '#f00',
  category: 'Fitness',
  target: 1,
  targetUnit: 'mal',
  schedule: [0, 1, 2, 3, 4, 5, 6],
  entries: {},
  createdAt: new Date(2026, 0, 1).getTime(),
  ...over,
});

describe('levels', () => {
  test('levelFromXp walks the growing curve', () => {
    expect(levelFromXp(0, 50, 25)).toEqual({ level: 1, into: 0, needed: 50 });
    expect(levelFromXp(50, 50, 25)).toEqual({ level: 2, into: 0, needed: 75 });
    expect(levelFromXp(130, 50, 25)).toEqual({ level: 3, into: 5, needed: 100 });
  });

  test('rankFor maps level thresholds', () => {
    expect(rankFor(1).rank).toBe('E');
    expect(rankFor(5).rank).toBe('D');
    expect(rankFor(44).rank).toBe('A');
    expect(rankFor(45).rank).toBe('S');
  });
});

describe('computeProgress', () => {
  const base = { bonusDone: [], startDate: '2026-03-02', today: '2026-03-04' };

  test('done days give XP plus a growing streak bonus', () => {
    const p = computeProgress({ ...base, habits: [habit({ entries: { '2026-03-02': 1, '2026-03-03': 1, '2026-03-04': 1 } })] });
    // 11 + 12 + 13 for the habit, plus three perfect days.
    expect(p.areas.strength.xp).toBe(36);
    expect(p.areas.discipline.xp).toBe(3 * XP.perfectDay);
  });

  test('a missed scheduled day in the past costs XP, today does not yet', () => {
    const p = computeProgress({ ...base, habits: [habit({ entries: { '2026-03-02': 1 } })] });
    // +11 on day 1, -15 on day 2 (clamped at 0), today still open.
    expect(p.areas.strength.xp).toBe(0);
    expect(p.events.filter((e) => e.kind === 'missed')).toHaveLength(1);
  });

  test('unscheduled days are never penalised', () => {
    const p = computeProgress({ ...base, habits: [habit({ schedule: [0] })] }); // Mondays only; 2026-03-02 is a Monday
    expect(p.events.filter((e) => e.kind === 'missed').map((e) => e.date)).toEqual(['2026-03-02']);
  });

  test('history before the start date and days before a habit existed do not count', () => {
    const p = computeProgress({
      ...base,
      habits: [habit({ entries: { '2026-02-01': 1 }, createdAt: new Date(2026, 2, 4).getTime() })],
    });
    expect(p.events).toHaveLength(0);
  });

  test('bonus quests add XP to their area', () => {
    const quest = bonusQuestsFor('2026-03-04')[0];
    const p = computeProgress({ ...base, habits: [], bonusDone: [{ date: '2026-03-04', questId: quest.id }] });
    expect(p.areas[quest.area].xp).toBe(quest.xp);
  });
});

describe('bonus quests', () => {
  test('stable per date and spread over different areas', () => {
    const a = bonusQuestsFor('2026-03-04');
    expect(bonusQuestsFor('2026-03-04')).toEqual(a);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.area)).size).toBe(3);
  });
});
