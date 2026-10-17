# Mo Bheatha

*Mo bheatha* is Scottish Gaelic for "my life".

A small, private web app for building better habits and tracking how you feel over time.

- **Do**: tap habits as you do them to earn points, build streaks and level up. Habits can be repeated up to 3 times a day (e.g. 💪 each urge resisted), and "target" habits track a daily number like steps or glasses of water.
- **Feel**: one-tap check-ins for mood and how you feel (tired, calm, stressed…). Optional body map for pain (turn it on in ⚙️ Settings).
- **Goals**: long-term goals like weight or waist size, with a 7-day trend line, an "on track" check against your target date, and milestone XP.
- **Insights**: points, mood (and pain) over time, urges resisted, plus a comparison of how you felt on days you did each habit vs days you didn't.

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
| Habit points | Set per habit (⚙️ Settings) |
| Repeat taps | Up to 3 per habit per day. ✓ ✓ ✓ = 3× points, ✗ ✗ ✗ = 3× slip penalty. A − button removes one |
| Slip penalty (avoid-type habits) | Small, e.g. −5 per slip |
| Target habits (steps, water) | Points once the daily target is reached |
| First "Feel" check-in each day | +5 |
| Logging a long-term goal | +5, once per goal per day |
| Goal milestones | +25 XP for each 10% of the way to the target (7-day trend). Never taken away |
| Daily goal (keeps your streak going) | 35 |
| Streak freeze | +1 for every 7 goal days (max 2); covers a missed day automatically |
| Bonus days | About 1 in 7 days, random; positive habit points ×2 |
| Level XP | Sum of positive daily totals plus milestone XP; slips never reduce your level |

The days start at 3am, so logging just after midnight still counts towards the evening you're in.

## Development

Requires Node 22+.

```bash
npm install
npm run dev       # http://localhost:5173/mo-bheatha/
npm test          # unit tests (scoring, taps, goals, body map)
npm run build
```

Every push to `main` is built, tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

### Structure

```
src/
  data/       db.ts (Dexie/IndexedDB), repo.ts (all reads/writes), hooks.ts, types.ts, defaults.ts
  lib/        scoring.ts (points, streaks, levels), habits.ts (tap counts), goals.ts (trend, milestones),
              insights.ts, dates.ts, body.ts (body map shapes), fx.ts
  screens/    Do, Feel, Goals, Insights, Settings
  components/ BodyMap, HabitEditor, Sheet, Toaster
```

Storage is isolated in `src/data/repo.ts` and `db.ts`, so cloud sync (e.g. Supabase with accounts) can be added later without touching the screens.
