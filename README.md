# Mo Bheatha

*Mo bheatha* is Scottish Gaelic for "my life".

A small, private web app for building better habits and tracking how you feel over time.

- **Do**: tap habits as you do them to earn points, build streaks and level up.
- **Feel**: one-tap check-ins for mood, how you feel (tired, calm, stressed…) and where it hurts (tap a body map, tap again for worse).
- **Insights**: points, mood and pain over time, plus a comparison of how you felt on days you did each habit vs days you didn't.

Live at **https://gamesbyjames.github.io/mo-bheatha/**

## Install on iPhone

1. Open the link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it from the Home Screen icon. It works offline and runs full screen like a normal app.

Installing matters: Safari can delete data for websites you haven't opened in about a week, but not for apps on your Home Screen.

## Your data

Everything is stored on your device (IndexedDB) and nothing is uploaded anywhere. Each person who opens the link gets their own separate data.

**Back up regularly:** Settings → Export saves a JSON file (on iPhone you can save it to Files or iCloud Drive). Settings → Import restores it, for example on a new phone.

## How scoring works

| Rule | Default |
| --- | --- |
| Habit points | Set per habit (Settings) |
| Slip penalty (avoid-type habits) | Small, e.g. −5 |
| First "Feel" check-in each day | +5 |
| Daily goal (keeps your streak going) | 35 |
| Streak freeze | +1 for every 7 goal days (max 2); covers a missed day automatically |
| Bonus days | About 1 in 7 days, random; positive points ×2 |
| Level XP | Sum of positive daily totals; slips never reduce your level |

The days start at 3am, so logging just after midnight still counts towards the evening you're in.

## Development

Requires Node 22+.

```bash
npm install
npm run dev       # http://localhost:5173/mo-bheatha/
npm test          # scoring/insights unit tests
npm run build
```

Every push to `main` is built, tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

### Structure

```
src/
  data/       db.ts (Dexie/IndexedDB), repo.ts (all reads/writes), hooks.ts, types.ts, defaults.ts
  lib/        scoring.ts (points, streaks, levels), insights.ts, dates.ts, body.ts (body map shapes), fx.ts
  screens/    Do, Feel, Insights, Settings
  components/ BodyMap, HabitEditor, Toaster
```

Storage is isolated in `src/data/repo.ts` and `db.ts`, so cloud sync (e.g. Supabase with accounts) can be added later without touching the screens.
