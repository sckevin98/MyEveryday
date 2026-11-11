import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import * as lib from './lib.ts';

describe('dates', () => {
  test('dateKey formats local YYYY-MM-DD', () => {
    expect(lib.dateKey(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(lib.dateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('keyToDate and dateKey round-trip', () => {
    expect(lib.dateKey(lib.keyToDate('2025-06-15'))).toBe('2025-06-15');
  });

  test('addDays crosses month and year boundaries', () => {
    expect(lib.dateKey(lib.addDays(new Date(2025, 0, 31), 1))).toBe('2025-02-01');
    expect(lib.dateKey(lib.addDays(new Date(2025, 11, 31), 1))).toBe('2026-01-01');
    expect(lib.dateKey(lib.addDays(new Date(2025, 0, 1), -1))).toBe('2024-12-31');
  });

  test('weekdayIndex is Mon=0..Sun=6', () => {
    expect(lib.weekdayIndex(new Date(2025, 5, 16))).toBe(0);
    expect(lib.weekdayIndex(new Date(2025, 5, 22))).toBe(6);
  });
});

describe('stats', () => {
  test('computeStreak starts at yesterday when today is not done', () => {
    const habit = {
      target: 1,
      schedule: [0, 1, 2, 3, 4, 5, 6],
      entries: { '2026-05-15': 1, '2026-05-16': 1, '2026-05-17': 1 },
    };
    expect(lib.computeStreak(habit, new Date(2026, 4, 18, 10))).toBe(3);
  });

  test('computeStreak ignores unscheduled days', () => {
    const habit = {
      target: 1,
      schedule: [0, 1, 2, 3, 4],
      entries: { '2026-05-15': 1, '2026-05-18': 1 }, // Fri, Mon
    };
    expect(lib.computeStreak(habit, new Date(2026, 4, 18, 12))).toBe(2);
  });

  test('completionLevel buckets by share of target', () => {
    const h = { target: 4, entries: { a: 0, b: 1, c: 2, d: 3, e: 4 } };
    expect(['a', 'b', 'c', 'd', 'e'].map((k) => lib.completionLevel(h, k))).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('csv', () => {
  test('reads numeric counts', () => {
    const r = lib.parseCsv('Date,Gym,Water\n2025-01-01,1,8\n2025-01-02,0,6\n2025-01-03,1,7');
    expect(r.columns).toHaveLength(2);
    expect(r.earliest).toBe('2025-01-01');
    expect(r.latest).toBe('2025-01-03');
    expect(r.columns.find((c) => c.name === 'Gym')!.entries).toEqual({ '2025-01-01': 1, '2025-01-03': 1 });
    expect(r.columns.find((c) => c.name === 'Water')!.max).toBe(8);
  });

  test('accepts yes/no/x/true/false/ja aliases', () => {
    const r = lib.parseCsv('Date,Read\n2025-01-01,yes\n2025-01-02,no\n2025-01-03,x\n2025-01-04,ja\n2025-01-05,false');
    expect(Object.keys(r.columns[0].entries).sort()).toEqual(['2025-01-01', '2025-01-03', '2025-01-04']);
  });

  test('handles semicolon separator from German Excel', () => {
    const r = lib.parseCsv('Date;Gym;Water\n2025-01-01;1;8\n');
    expect(r.columns).toHaveLength(2);
  });

  test('rejects empty input', () => {
    expect(() => lib.parseCsv('')).toThrow();
    expect(() => lib.parseCsv('Date\n2025-01-01\n')).toThrow();
  });

  test('mergeCsvImport merges by name and adds unmatched columns', () => {
    const habits: lib.Habit[] = [{
      id: 'h_old', name: 'Gym', icon: '🏋️', color: '#fff', category: 'Fitness', target: 1, targetUnit: 'mal',
      schedule: [0, 1, 2, 3, 4, 5, 6], entries: { '2025-12-01': 1 }, createdAt: Date.parse('2025-12-01'),
    }];
    const next = lib.mergeCsvImport(habits, lib.parseCsv('Date,gym,Reading\n2025-01-01,1,30\n2025-01-02,1,20\n'));
    const gym = next.find((h) => h.name === 'Gym')!;
    expect(gym.entries['2025-12-01']).toBe(1);
    expect(gym.entries['2025-01-01']).toBe(1);
    expect(gym.createdAt).toBe(lib.keyToDate('2025-01-01').getTime());
    expect(next.find((h) => h.name === 'Reading')!.target).toBe(30);
    expect(habits[0].entries['2025-01-01']).toBeUndefined(); // input not mutated
  });
});

describe('habitkit', () => {
  test('habitKitDateKey applies the recorded offset', () => {
    expect(lib.habitKitDateKey('2025-06-15T22:00:00.000Z', 120)).toBe('2025-06-16');
    expect(lib.habitKitDateKey('2025-06-15T22:00:00.000Z', 0)).toBe('2025-06-15');
    expect(lib.habitKitDateKey('2025-06-16T02:00:00.000Z', -240)).toBe('2025-06-15');
  });

  test('maps colors, icons and categories', () => {
    expect(lib.mapHabitKitColor('emerald')).toBe('#10b981');
    expect(lib.mapHabitKitColor('#ABCDEF')).toBe('#abcdef');
    expect(lib.mapHabitKitColor('mauve')).toBeNull();
    expect(lib.mapHabitKitIcon({ emoji: '🔥', icon: 'activity' })).toBe('🔥');
    expect(lib.mapHabitKitIcon({ icon: 'dumbbell' })).toBe('🏋️');
    expect(lib.mapHabitKitCategory('Gesundheit')).toBe('Health');
    expect(lib.mapHabitKitCategory(null)).toBe('Other');
  });

  test('parseHabitKit sums completions per local day and drops zero rows', () => {
    const habits = lib.parseHabitKit({
      habits: [{ id: 'a', name: 'Lesen', color: 'blue', icon: 'book', orderIndex: 0 }],
      completions: [
        { habitId: 'a', date: '2025-06-15T08:00:00.000Z', amountOfCompletions: 1, timezoneOffsetInMinutes: 120 },
        { habitId: 'a', date: '2025-06-16T08:00:00.000Z', amountOfCompletions: 0, timezoneOffsetInMinutes: 120 },
      ],
      intervals: [{ habitId: 'a', requiredNumberOfCompletionsPerDay: 1 }],
    });
    expect(habits).toHaveLength(1);
    expect(habits[0].entries).toEqual({ '2025-06-15': 1 });
    expect(habits[0].color).toBe('#3b82f6');
  });

  // Real export with personal data: gitignored, test skips when absent.
  const fixture = resolve(__dirname, '../../../habitkit_export.json');
  test.skipIf(!existsSync(fixture))('parses a real HabitKit export', () => {
    const habits = lib.parseHabitKit(JSON.parse(readFileSync(fixture, 'utf8')));
    expect(habits.length).toBeGreaterThan(0);
  });
});
