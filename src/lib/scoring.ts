import type { HabitLog, Settings } from '../data/types'
import { addDays, daysBetween, rangeDays, type DayKey } from './dates'

/*
 * Reward design ("reinforcement learning for humans"):
 *  - Positive points do most of the work.
 *  - Slips can cost points, but they never reduce your level (XP only counts
 *    positive days), so one bad day doesn't wipe out your progress.
 *  - Random bonus days (2x positive points) add surprise to the rewards.
 *  - Streaks are forgiving: every 7 winning days earns a freeze, and a freeze
 *    covers a missed day automatically.
 */

export const BONUS_CHANCE = 0.15
export const BONUS_MULTIPLIER = 2
export const FREEZE_EVERY = 7
export const MAX_FREEZES = 2
export const STARTING_FREEZES = 1
/** Points for logging a long-term goal (once per goal per day) */
export const GOAL_LOG_POINTS = 5
/** XP for each 10% of the way to a long-term goal */
export const MILESTONE_XP = 25

export interface DayScore {
  date: DayKey
  positive: number
  negative: number
  checkIn: number
  goalLogs: number
  goalPoints: number
  bonus: boolean
  total: number
  win: boolean
}

/** FNV-1a: small, deterministic string hash */
function hash(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic per install, so a bonus day stays a bonus day after a reload. */
export function isBonusDay(date: DayKey, seed: number): boolean {
  return (hash(`${date}#${seed}`) % 10_000) / 10_000 < BONUS_CHANCE
}

export interface DayExtras {
  checkedIn: boolean
  /** Number of different long-term goals logged that day */
  goalLogs: number
}

export function scoreDay(
  date: DayKey,
  logs: HabitLog[],
  extras: DayExtras,
  settings: Pick<Settings, 'dailyGoal' | 'checkInPoints' | 'seed'>,
): DayScore {
  let positive = 0
  let negative = 0
  for (const l of logs) {
    if (l.points >= 0) positive += l.points
    else negative += l.points
  }
  const bonus = isBonusDay(date, settings.seed)
  const checkIn = extras.checkedIn ? settings.checkInPoints : 0
  const goalPoints = extras.goalLogs * GOAL_LOG_POINTS
  const total = positive * (bonus ? BONUS_MULTIPLIER : 1) + checkIn + goalPoints + negative
  return {
    date,
    positive,
    negative,
    checkIn,
    goalLogs: extras.goalLogs,
    goalPoints,
    bonus,
    total,
    win: total >= settings.dailyGoal,
  }
}

/** XP needed to reach level n: 0, 100, 300, 600, 1000, ... */
export function xpForLevel(n: number): number {
  return 50 * n * (n - 1)
}

export function levelFromXp(xp: number): { level: number; current: number; next: number; progress: number } {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, current, next, progress: (xp - current) / (next - current) }
}

export interface Progress {
  streak: number
  bestStreak: number
  freezes: number
  /** True if today isn't a win yet but the streak is still alive from yesterday */
  streakAtRisk: boolean
  frozenDays: Set<DayKey>
  xp: number
  level: ReturnType<typeof levelFromXp>
  winDays: number
}

/**
 * Walks every day from the first activity up to today.
 * Today only counts toward the streak once it's won; until then it's "at risk".
 */
export function computeProgress(scores: Map<DayKey, DayScore>, today: DayKey, bonusXp = 0): Progress {
  const dates = [...scores.keys()].filter((d) => daysBetween(d, today) >= 0).sort()
  let streak = 0
  let best = 0
  let freezes = STARTING_FREEZES
  let winsTowardFreeze = 0
  let xp = bonusXp
  let winDays = 0
  const frozenDays = new Set<DayKey>()

  for (const s of scores.values()) {
    if (daysBetween(s.date, today) >= 0) xp += Math.max(0, s.total)
  }

  if (dates.length === 0) {
    return { streak: 0, bestStreak: 0, freezes, streakAtRisk: false, frozenDays, xp, level: levelFromXp(xp), winDays }
  }

  const yesterday = addDays(today, -1)
  const past = daysBetween(dates[0], yesterday) >= 0 ? rangeDays(dates[0], yesterday) : []

  for (const d of past) {
    const s = scores.get(d)
    if (s?.win) {
      streak++
      winDays++
      winsTowardFreeze++
      if (winsTowardFreeze >= FREEZE_EVERY) {
        winsTowardFreeze = 0
        freezes = Math.min(MAX_FREEZES, freezes + 1)
      }
    } else if (streak > 0 && freezes > 0) {
      freezes--
      frozenDays.add(d)
    } else {
      streak = 0
      winsTowardFreeze = 0
    }
    best = Math.max(best, streak)
  }

  const todayWin = scores.get(today)?.win ?? false
  if (todayWin) {
    streak++
    winDays++
    best = Math.max(best, streak)
  }

  return {
    streak,
    bestStreak: best,
    freezes,
    streakAtRisk: !todayWin && streak > 0,
    frozenDays,
    xp,
    level: levelFromXp(xp),
    winDays,
  }
}

/** Builds a score for every day that has any activity. */
export function buildScores(
  habitLogs: HabitLog[],
  checkInDates: Set<DayKey>,
  settings: Pick<Settings, 'dailyGoal' | 'checkInPoints' | 'seed'>,
  goalLogsByDate: Map<DayKey, number> = new Map(),
): Map<DayKey, DayScore> {
  const byDate = new Map<DayKey, HabitLog[]>()
  for (const l of habitLogs) {
    const arr = byDate.get(l.date)
    if (arr) arr.push(l)
    else byDate.set(l.date, [l])
  }
  const allDates = new Set<DayKey>([...byDate.keys(), ...checkInDates, ...goalLogsByDate.keys()])
  const out = new Map<DayKey, DayScore>()
  for (const d of allDates) out.set(d, scoreDay(d, byDate.get(d) ?? [], { checkedIn: checkInDates.has(d), goalLogs: goalLogsByDate.get(d) ?? 0 }, settings))
  return out
}
