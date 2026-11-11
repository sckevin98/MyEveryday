// Leveling engine: pure functions, no storage. All progress is recomputed from the
// raw data (habit entries, finished bonus quests, start date) on every render, so
// it can never drift out of sync with what was actually logged.
import { addDays, type DateKey, dateKey, type Habit, keyToDate, weekdayIndex } from '../habits/lib.ts';

export type AreaId = 'strength' | 'vitality' | 'mind' | 'discipline';

export const AREAS: { id: AreaId; label: string; color: string }[] = [
  { id: 'strength', label: 'Stärke', color: '#ef4444' },
  { id: 'vitality', label: 'Vitalität', color: '#22c55e' },
  { id: 'mind', label: 'Geist', color: '#6366f1' },
  { id: 'discipline', label: 'Disziplin', color: '#f97316' },
];

/** Habit category to area. Future modules map their own records to an area too. */
export const CATEGORY_AREA: Record<string, AreaId> = {
  Fitness: 'strength',
  Health: 'vitality',
  Mind: 'mind',
  Work: 'discipline',
  Other: 'discipline',
};

export const XP = {
  habitDone: 10,
  /** +1 per streak day, so a long streak is worth more than a fresh one. */
  streakBonusMax: 10,
  missedHabit: -15,
  /** Every scheduled habit of a day done; credited to discipline. */
  perfectDay: 20,
};

export interface BonusQuest {
  id: string;
  area: AreaId;
  title: string;
  xp: number;
}

// Bonus quests are optional extras: they give XP and never cost any.
export const BONUS_QUESTS: BonusQuest[] = [
  { id: 'pushups-30', area: 'strength', title: '30 Liegestütze über den Tag verteilt', xp: 20 },
  { id: 'squats-50', area: 'strength', title: '50 Kniebeugen', xp: 20 },
  { id: 'plank-3', area: 'strength', title: '3 Minuten Plank (gesamt)', xp: 15 },
  { id: 'stairs', area: 'strength', title: 'Nur Treppen statt Aufzug', xp: 10 },
  { id: 'walk-20', area: 'vitality', title: '20 Minuten spazieren gehen', xp: 15 },
  { id: 'water-extra', area: 'vitality', title: 'Einen halben Liter Wasser extra trinken', xp: 10 },
  { id: 'veggies', area: 'vitality', title: 'Zu jeder Mahlzeit Gemüse oder Obst', xp: 15 },
  { id: 'sleep-early', area: 'vitality', title: 'Vor 23 Uhr ins Bett', xp: 20 },
  { id: 'no-sugar', area: 'vitality', title: 'Einen Tag ohne Süßigkeiten', xp: 20 },
  { id: 'read-20', area: 'mind', title: '20 Seiten lesen', xp: 15 },
  { id: 'learn-new', area: 'mind', title: 'Etwas Neues lernen und kurz notieren', xp: 15 },
  { id: 'no-phone-hour', area: 'mind', title: 'Eine Stunde ohne Handy', xp: 20 },
  { id: 'meditate-10', area: 'mind', title: '10 Minuten meditieren', xp: 15 },
  { id: 'inbox-zero', area: 'discipline', title: 'Posteingang leeren', xp: 15 },
  { id: 'tidy-15', area: 'discipline', title: '15 Minuten aufräumen', xp: 10 },
  { id: 'plan-tomorrow', area: 'discipline', title: 'Den morgigen Tag planen', xp: 10 },
  { id: 'hard-task-first', area: 'discipline', title: 'Die unangenehmste Aufgabe zuerst erledigen', xp: 20 },
];

const BONUS_PER_DAY = 3;

/** Deterministic per date, so the same three quests show all day on every device. */
export function bonusQuestsFor(date: DateKey): BonusQuest[] {
  let seed = 0;
  for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 2 ** 32;
  };
  const pool = [...BONUS_QUESTS];
  const picked: BonusQuest[] = [];
  const usedAreas = new Set<AreaId>();
  while (picked.length < BONUS_PER_DAY && pool.length) {
    const i = Math.floor(rand() * pool.length);
    const [q] = pool.splice(i, 1);
    // Prefer one quest per area; fall back to repeats only when areas run out.
    if (usedAreas.has(q.area) && pool.some((p) => !usedAreas.has(p.area))) continue;
    usedAreas.add(q.area);
    picked.push(q);
  }
  return picked;
}

// ── levels and ranks ─────────────────────────────────────────────────────────
export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
}

/** Level n -> n+1 costs base + step * (n - 1) XP. */
export function levelFromXp(xp: number, base: number, step: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  let needed = base;
  while (rest >= needed) {
    rest -= needed;
    level++;
    needed = base + step * (level - 1);
  }
  return { level, into: rest, needed };
}

export const areaLevel = (xp: number) => levelFromXp(xp, 50, 25);
export const overallLevel = (xp: number) => levelFromXp(xp, 100, 50);

export const RANKS = [
  { rank: 'S', minLevel: 45, color: '#eab308' },
  { rank: 'A', minLevel: 30, color: '#f97316' },
  { rank: 'B', minLevel: 20, color: '#a855f7' },
  { rank: 'C', minLevel: 10, color: '#3b82f6' },
  { rank: 'D', minLevel: 5, color: '#22c55e' },
  { rank: 'E', minLevel: 1, color: '#94a3b8' },
] as const;

export function rankFor(level: number) {
  return RANKS.find((r) => level >= r.minLevel) ?? RANKS[RANKS.length - 1];
}

// ── progress computation ─────────────────────────────────────────────────────
export type EventKind = 'habit' | 'missed' | 'perfect' | 'bonus';

export interface XpEvent {
  date: DateKey;
  area: AreaId;
  xp: number;
  kind: EventKind;
  label: string;
}

export interface Progress {
  areas: Record<AreaId, { xp: number } & LevelInfo>;
  totalXp: number;
  overall: LevelInfo;
  rank: (typeof RANKS)[number];
  /** Newest first. */
  events: XpEvent[];
}

export interface ProgressInput {
  habits: Habit[];
  bonusDone: { date: DateKey; questId: string }[];
  /** First day that counts. Earlier history (e.g. imports) gives no XP and no penalties. */
  startDate: DateKey;
  today: DateKey;
}

/** Done scheduled days in a row up to and including `date`, capped for speed. */
function streakAt(habit: Habit, date: Date, cap: number): number {
  let n = 0;
  let d = date;
  for (let guard = 0; n < cap && guard < cap * 7; guard++) {
    if (habit.schedule.includes(weekdayIndex(d))) {
      if ((habit.entries[dateKey(d)] || 0) >= habit.target) n++;
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export function areaOf(habit: Habit): AreaId {
  return CATEGORY_AREA[habit.category] ?? 'discipline';
}

export function computeProgress({ habits, bonusDone, startDate, today }: ProgressInput): Progress {
  const xp: Record<AreaId, number> = { strength: 0, vitality: 0, mind: 0, discipline: 0 };
  const events: XpEvent[] = [];
  const questById = new Map(BONUS_QUESTS.map((q) => [q.id, q]));
  const bonusByDate = new Map<DateKey, string[]>();
  for (const b of bonusDone) bonusByDate.set(b.date, [...(bonusByDate.get(b.date) ?? []), b.questId]);

  const active = habits.filter((h) => !h.archived);
  const add = (e: XpEvent) => {
    events.push(e);
    // Areas never drop below 0; a penalty on an empty area is simply absorbed.
    xp[e.area] = Math.max(0, xp[e.area] + e.xp);
  };

  for (let d = keyToDate(startDate); dateKey(d) <= today; d = addDays(d, 1)) {
    const key = dateKey(d);
    const isPast = key < today;
    const dayEnd = addDays(d, 1).getTime();
    let scheduledCount = 0;
    let scheduledDone = 0;

    for (const h of active) {
      if (h.createdAt >= dayEnd) continue; // did not exist yet that day
      const done = (h.entries[key] || 0) >= h.target;
      const scheduled = h.schedule.includes(weekdayIndex(d));
      if (scheduled) scheduledCount++;
      if (done) {
        if (scheduled) scheduledDone++;
        add({ date: key, area: areaOf(h), xp: XP.habitDone + streakAt(h, d, XP.streakBonusMax), kind: 'habit', label: h.name });
      } else if (scheduled && isPast) {
        add({ date: key, area: areaOf(h), xp: XP.missedHabit, kind: 'missed', label: h.name });
      }
    }

    if (scheduledCount > 0 && scheduledDone === scheduledCount) {
      add({ date: key, area: 'discipline', xp: XP.perfectDay, kind: 'perfect', label: 'Perfekter Tag' });
    }

    for (const id of bonusByDate.get(key) ?? []) {
      const q = questById.get(id);
      if (q) add({ date: key, area: q.area, xp: q.xp, kind: 'bonus', label: q.title });
    }
  }

  const areas = Object.fromEntries(
    AREAS.map(({ id }) => [id, { xp: xp[id], ...areaLevel(xp[id]) }]),
  ) as Progress['areas'];
  const totalXp = Object.values(xp).reduce((a, b) => a + b, 0);
  const overall = overallLevel(totalXp);
  return { areas, totalXp, overall, rank: rankFor(overall.level), events: events.reverse() };
}
