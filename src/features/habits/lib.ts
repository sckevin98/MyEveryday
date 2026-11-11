// Pure habit helpers: no React, no storage. Ported from MyHabitTracker/lib.js.

export type DateKey = string; // YYYY-MM-DD, local time

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  target: number;
  targetUnit: string;
  /** Weekday indices, Mon=0..Sun=6. Unscheduled days never break a streak. */
  schedule: number[];
  entries: Record<DateKey, number>;
  createdAt: number;
  archived?: boolean;
  order?: number;
}

export const COLORS = [
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#38bdf8' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Slate', value: '#94a3b8' },
  { name: 'Red', value: '#ef4444' },
];

export const ICONS = [
  '🏋', '🏃', '🚴', '🧘', '⚽', '🏊', '🥾',
  '📖', '📚', '✍', '📓', '🎓', '🧠',
  '💧', '🥗', '🥦', '🍎', '🥛', '🍵', '☕',
  '🚫', '🧼', '🛁', '💊', '😴', '🌙', '☀',
  '🎨', '🎸', '🎹', '🎧', '📷', '🎮', '🎲',
  '💰', '💼', '📈', '📱', '💻', '🧹', '🌱',
];

export const CATEGORIES = ['Health', 'Fitness', 'Mind', 'Work', 'Other'];

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const PALETTE = ['#f97316', '#22c55e', '#38bdf8', '#a855f7', '#ec4899', '#84cc16', '#eab308', '#14b8a6', '#6366f1', '#f43f5e'];

export function newHabitId(): string {
  return 'h_' + Math.random().toString(36).slice(2, 9);
}

// ── date helpers ─────────────────────────────────────────────────────────────
export function dateKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey(): DateKey {
  return dateKey(new Date());
}
export function keyToDate(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** Mon=0..Sun=6 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

// ── derived stats ────────────────────────────────────────────────────────────
type StreakInput = Pick<Habit, 'target' | 'schedule' | 'entries'>;

export function computeStreak(habit: StreakInput, now?: Date): number {
  let streak = 0;
  let d = now ? new Date(now) : new Date();
  // Today not done yet must not reset the streak, so start counting at yesterday.
  if ((habit.entries[dateKey(d)] || 0) < habit.target) d = addDays(d, -1);
  while (streak <= 3650) {
    const scheduled = habit.schedule.includes(weekdayIndex(d));
    const done = (habit.entries[dateKey(d)] || 0) >= habit.target;
    if (scheduled) {
      if (done) streak++;
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function completionLevel(habit: Pick<Habit, 'target' | 'entries'>, key: DateKey): number {
  const v = habit.entries[key] || 0;
  if (!v) return 0;
  const pct = v / habit.target;
  if (pct >= 1) return 4;
  if (pct >= 0.66) return 3;
  if (pct >= 0.33) return 2;
  return 1;
}

export function completionRatio(habit: Pick<Habit, 'target' | 'entries'>, key: DateKey): number {
  return Math.min(1, (habit.entries[key] || 0) / habit.target);
}

export function daysCompleted(habit: Pick<Habit, 'target' | 'entries'>, n = 30, now?: Date): number {
  let count = 0;
  const today = now ? new Date(now) : new Date();
  for (let i = 0; i < n; i++) {
    if ((habit.entries[dateKey(addDays(today, -i))] || 0) >= habit.target) count++;
  }
  return count;
}

// ── HabitKit JSON import ─────────────────────────────────────────────────────
// Shape reverse-engineered from a real HabitKit (iOS) export:
// habits, completions, intervals, categories, categoryMappings.
export const HABITKIT_COLORS: Record<string, string> = {
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308',
  lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6',
  cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1',
  violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899',
  rose: '#f43f5e', slate: '#94a3b8', gray: '#9ca3af', zinc: '#a1a1aa',
  neutral: '#a3a3a3', stone: '#a8a29e',
};

export const HABITKIT_ICONS: Record<string, string> = {
  activity: '🏃', dumbbell: '🏋️', bike: '🚴', run: '🏃', yoga: '🧘', swim: '🏊',
  hiking: '🥾', graduation: '🎓', book: '📖', edit: '✍️', brain: '🧠', glass: '💧',
  water: '💧', apple: '🍎', utensils: '🍽️', coffee: '☕', tea: '🍵', beer: '🍺',
  wine: '🍷', pill: '💊', sleep: '😴', moon: '🌙', sun: '☀️', cloud_sun: '⛅',
  palette: '🎨', music: '🎧', guitar: '🎸', camera: '📷', gamepad: '🎮',
  moneybill: '💰', briefcase: '💼', chart: '📈', phone: '📱', laptop: '💻',
  broom: '🧹', plant: '🌱', heart: '❤️', socialize: '🗣️', diamond: '💎',
};

const OUR_CATEGORIES_LOWER = new Map(CATEGORIES.map((c) => [c.toLowerCase(), c]));
const HABITKIT_CATEGORY_MAP: Record<string, string> = {
  fitness: 'Fitness', sport: 'Fitness',
  health: 'Health', gesundheit: 'Health', ernährung: 'Health', ernaehrung: 'Health', nutrition: 'Health',
  mind: 'Mind', studium: 'Mind', study: 'Mind', learn: 'Mind', lernen: 'Mind', kunst: 'Mind', art: 'Mind',
  arbeit: 'Work', work: 'Work', finanzen: 'Work', finance: 'Work',
};

export function mapHabitKitColor(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  if (/^#[0-9a-f]{6}$/i.test(token)) return token.toLowerCase();
  return HABITKIT_COLORS[token.toLowerCase()] || null;
}

export function mapHabitKitIcon(habit: { emoji?: string; icon?: string }): string | null {
  if (habit.emoji) return habit.emoji;
  return HABITKIT_ICONS[(habit.icon || '').toLowerCase()] || null;
}

export function mapHabitKitCategory(name: unknown): string {
  if (!name) return 'Other';
  const lower = String(name).toLowerCase();
  return HABITKIT_CATEGORY_MAP[lower] || OUR_CATEGORIES_LOWER.get(lower) || 'Other';
}

// HabitKit stores UTC in `date` plus the offset at log time with the opposite
// sign of JS getTimezoneOffset() (CEST = +120), so add it before reading Y/M/D.
export function habitKitDateKey(rawDate: string, offsetMin?: number): DateKey | null {
  const t = Date.parse(rawDate);
  if (Number.isNaN(t)) return null;
  const off = Number.isFinite(offsetMin) ? (offsetMin as number) : 0;
  const shifted = new Date(t + off * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseHabitKit(obj: any, options: { skipEmpty?: boolean } = {}): Habit[] {
  const skipEmpty = options.skipEmpty ?? true;
  if (!obj || typeof obj !== 'object') throw new Error('HabitKit: kein Objekt');
  const habits: any[] = obj.habits;
  if (!Array.isArray(habits) || !habits.length) throw new Error('HabitKit: habits fehlen');
  const completions: any[] = obj.completions;
  if (!Array.isArray(completions)) throw new Error('HabitKit: completions fehlen');

  const intervals: any[] = Array.isArray(obj.intervals) ? obj.intervals : [];
  const categories: any[] = Array.isArray(obj.categories) ? obj.categories : [];
  const categoryMappings: any[] = Array.isArray(obj.categoryMappings) ? obj.categoryMappings : [];

  const targetByHabit = new Map<string, number>();
  for (const iv of intervals) {
    const t = iv.requiredNumberOfCompletionsPerDay;
    if (iv.habitId && Number.isFinite(t) && t > 0) {
      targetByHabit.set(iv.habitId, Math.max(targetByHabit.get(iv.habitId) || 0, t));
    }
  }

  const catNameById = new Map(categories.map((c) => [c.id, c.name]));
  const habitCategory = new Map<string, string>();
  for (const m of categoryMappings) {
    if (!habitCategory.has(m.habitId) && catNameById.has(m.categoryId)) {
      habitCategory.set(m.habitId, catNameById.get(m.categoryId));
    }
  }

  // amountOfCompletions === 0 is HabitKit's explicit "not done" marker: drop it.
  const byHabit = new Map<string, Record<DateKey, number>>();
  for (const c of completions) {
    if (!c.habitId || !c.date) continue;
    const amt = Number.isFinite(c.amountOfCompletions) ? c.amountOfCompletions : 1;
    if (amt <= 0) continue;
    const dk = habitKitDateKey(c.date, c.timezoneOffsetInMinutes);
    if (!dk) continue;
    const map = byHabit.get(c.habitId) || {};
    map[dk] = (map[dk] || 0) + amt;
    byHabit.set(c.habitId, map);
  }

  const ordered = [...habits].sort((a, b) => {
    const ai = Number.isFinite(a.orderIndex) ? a.orderIndex : 9999;
    const bi = Number.isFinite(b.orderIndex) ? b.orderIndex : 9999;
    if (ai !== bi) return ai - bi;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const out: Habit[] = [];
  let paletteCursor = 0;
  for (const h of ordered) {
    const map = byHabit.get(h.id) || {};
    const dates = Object.keys(map);
    if (skipEmpty && dates.length === 0) continue;

    const target = Math.max(1, targetByHabit.get(h.id) || 1);
    const entries: Record<DateKey, number> = {};
    // Clamp extra taps to the target so streak math stays predictable.
    for (const dk of dates) entries[dk] = Math.min(target, map[dk]);
    const earliestTs = dates.length
      ? Math.min(...dates.map((k) => keyToDate(k).getTime()))
      : h.createdAt ? Date.parse(h.createdAt) : Date.now();

    out.push({
      id: newHabitId(),
      name: h.name || 'Importiertes Habit',
      icon: mapHabitKitIcon(h) || '🌱',
      color: mapHabitKitColor(h.color) || PALETTE[paletteCursor++ % PALETTE.length],
      category: mapHabitKitCategory(habitCategory.get(h.id)),
      target,
      targetUnit: target === 1 ? 'mal' : 'Anzahl',
      schedule: [0, 1, 2, 3, 4, 5, 6],
      entries,
      createdAt: earliestTs,
      ...(h.archived ? { archived: true } : {}),
    });
  }
  return out;
}

/** Old MyHabits backups store habits[].entries as an object map; HabitKit does not. */
export function isNativeBackup(obj: any): obj is { habits: Habit[] } {
  return !!obj && Array.isArray(obj.habits) && obj.habits.length > 0
    && typeof obj.habits[0].entries === 'object' && !Array.isArray(obj.habits[0].entries);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── CSV import ───────────────────────────────────────────────────────────────
export interface CsvColumn { name: string; entries: Record<DateKey, number>; max: number }
export interface CsvParseResult { columns: CsvColumn[]; earliest: DateKey | null; latest: DateKey | null }

export function parseCsv(text: string): CsvParseResult {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('CSV ist leer');

  // German Excel writes ';' separators.
  const split = (line: string) => {
    const sep = line.indexOf(';') >= 0 && line.indexOf(',') < 0 ? ';' : ',';
    return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
  };

  const header = split(lines[0]);
  if (header.length < 2) throw new Error('CSV braucht eine Datumsspalte und mindestens eine Habit-Spalte');

  const columns: CsvColumn[] = header.slice(1).map((name) => ({ name, entries: {}, max: 0 }));
  let earliest: DateKey | null = null;
  let latest: DateKey | null = null;

  const truthy = new Set(['yes', 'y', 'true', 't', 'x', '✓', 'done', 'ja']);
  const falsy = new Set(['', 'no', 'n', 'false', 'f', '-', 'nein']);

  for (let i = 1; i < lines.length; i++) {
    const row = split(lines[i]);
    const dateRaw = row[0];
    if (!dateRaw) continue;
    let dk: DateKey;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      dk = dateRaw;
    } else {
      const d = new Date(dateRaw);
      if (Number.isNaN(d.getTime())) continue;
      dk = dateKey(d);
    }
    if (!earliest || dk < earliest) earliest = dk;
    if (!latest || dk > latest) latest = dk;

    for (let c = 0; c < columns.length; c++) {
      const raw = (row[c + 1] || '').toLowerCase();
      let val = 0;
      if (truthy.has(raw)) val = 1;
      else if (!falsy.has(raw)) {
        const n = Number(raw.replace(',', '.'));
        if (!Number.isNaN(n)) val = Math.max(0, Math.round(n));
      }
      if (val > 0) {
        columns[c].entries[dk] = val;
        if (val > columns[c].max) columns[c].max = val;
      }
    }
  }

  return { columns: columns.filter((c) => Object.keys(c.entries).length > 0), earliest, latest };
}

/** Merges CSV columns into habits by case-insensitive name; unmatched columns become new habits. */
export function mergeCsvImport(habits: Habit[], parsed: CsvParseResult): Habit[] {
  const out = habits.map((h) => ({ ...h, entries: { ...h.entries } }));
  const byName = new Map(out.map((h) => [h.name.trim().toLowerCase(), h]));
  let colorCursor = out.length;

  for (const col of parsed.columns) {
    const existing = byName.get(col.name.trim().toLowerCase());
    const earliestTs = Math.min(...Object.keys(col.entries).map((k) => keyToDate(k).getTime()));

    if (existing) {
      for (const [dk, v] of Object.entries(col.entries)) {
        existing.entries[dk] = Math.min(existing.target, Math.max(existing.entries[dk] || 0, v));
      }
      existing.createdAt = Math.min(existing.createdAt || Date.now(), earliestTs);
    } else {
      const target = Math.max(1, col.max);
      out.push({
        id: newHabitId(),
        name: col.name,
        icon: '🌱',
        color: PALETTE[colorCursor++ % PALETTE.length],
        category: 'Other',
        target,
        targetUnit: target === 1 ? 'mal' : 'Anzahl',
        schedule: [0, 1, 2, 3, 4, 5, 6],
        entries: { ...col.entries },
        createdAt: earliestTs,
      });
    }
  }
  return out;
}
