# MyEveryday

Personal everyday tools in one installable PWA: habits (done), daily planner, fitness and
calorie tracker (planned). Astryx-specific agent rules live in `.claude/CLAUDE.md`.

## Commands

- `npm run dev -- --host`: dev server, reachable from a phone on the same Wi-Fi.
- `npm test`: Vitest, pure logic only.
- `npm run typecheck` / `npm run build`
- `npm run astryx -- component <Name>`: Astryx docs. The CLI needs Node >= 22.13.

## Architecture

- `src/App.tsx`: bottom nav plus one route per module. A new module adds a `MODULES` entry and routes.
- `src/db.ts`: one Dexie (IndexedDB) database for all modules. A module adds tables in a new
  `db.version(n)` block; shipped versions are never edited. Backup export lives here too and
  must include every module's tables.
- `src/features/<module>/`: `lib.ts` holds pure, tested logic; `store.ts` holds Dexie
  reads (`useLiveQuery`) and writes; screens are `*Screen.tsx`.
- Data stays on the device. There is no backend; the JSON backup is the only copy elsewhere.

## Habits

Ported from `../MyHabitTracker` (old static PWA). `Habit.entries` maps `YYYY-MM-DD` to a
count; `schedule` holds weekday indices Mon=0..Sun=6. Category keys stay English
(`Health`, ...) so old MyHabits backups and HabitKit exports import unchanged; German labels
come from `labels.ts`.

`habitkit_export.json` in the repo root holds personal data. It is gitignored and the test that
uses it skips when it is missing.

## Leveling (`src/features/game/`)

One global XP system across all modules. `engine.ts` recomputes everything from raw data on
each render (habit entries, `bonusDone` rows, `meta['game.startDate']`). No XP totals are
stored, so the score cannot drift from what was logged, and the engine is fully unit-tested.

- Four areas (Stärke, Vitalität, Geist, Disziplin). Habits map to an area by category through
  `CATEGORY_AREA`. New modules emit their own events into `computeProgress` and pick an area.
- Each area has its own level; total XP drives the overall level and the rank (E to S).
- Mandatory quests are the habits scheduled that day. A missed one costs XP once the day is
  over; an area never drops below 0, and levels can drop. Bonus quests come from a fixed pool,
  three per day picked by date seed, and give XP without any penalty.
- The start date is set on first run, so imported history is never scored.

## Deploy

Every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`) with
`BASE_PATH=/<repo>/`. Routing uses `HashRouter` because Pages has no SPA fallback.
