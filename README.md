# MyEveryday

Self-built everyday tools that replace paid subscriptions, packaged as one installable web app
(PWA) for desktop and phone.

| Module | Status |
|---|---|
| Habit tracker (streaks, heatmap, HabitKit/CSV import) | done |
| Daily planner | planned |
| Fitness tracker | planned |
| Calorie tracker (Open Food Facts, barcode scan) | planned |

Built with Vite, React 19, TypeScript, the [Astryx](https://github.com/meta/astryx) design system,
and Dexie (IndexedDB). All data stays on the device and works offline.

## Develop

```bash
npm install
npm run dev -- --host   # open the printed network URL on your phone (same Wi-Fi)
npm test
```

## Install on a phone

Open the GitHub Pages URL, then choose "Add to Home Screen" (iOS Safari) or "Install app"
(Android Chrome).

## Data

Settings > Data exports a JSON backup and imports MyEveryday backups, old MyHabits backups,
HabitKit exports, and CSV. Export a backup before you switch devices or clear browser data:
the data has no other copy.
