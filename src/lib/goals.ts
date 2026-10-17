import type { Goal, GoalEntry } from '../data/types'
import { dayKey, daysBetween, type DayKey } from './dates'

/*
 * Daily measurements like weight bounce around (water, salt, time of day),
 * so progress uses a 7-day rolling average rather than the latest weigh-in.
 */
export const TREND_DAYS = 7
/** Allowed slack before we say "behind" (fraction of the whole journey) */
const ON_TRACK_SLACK = 0.05

export const GOAL_TEMPLATES = [
  { name: 'Weight', emoji: '⚖️', unit: 'kg', step: 0.1 },
  { name: 'Waist', emoji: '📏', unit: 'cm', step: 0.5 },
  { name: 'Resting heart rate', emoji: '❤️', unit: 'bpm', step: 1 },
  { name: '', emoji: '🎯', unit: '', step: 1 },
] as const

export interface GoalPoint {
  date: DayKey
  value: number
  trend: number
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** One value per day (mean of that day's entries), oldest first, with a trailing 7-day average. */
export function goalSeries(entries: GoalEntry[]): GoalPoint[] {
  const byDay = new Map<DayKey, number[]>()
  for (const e of entries) {
    const arr = byDay.get(e.date)
    if (arr) arr.push(e.value)
    else byDay.set(e.date, [e.value])
  }
  const daily = [...byDay.keys()].sort().map((date) => ({ date, value: mean(byDay.get(date)!) }))
  return daily.map((p, i) => {
    const window = daily.slice(0, i + 1).filter((q) => daysBetween(q.date, p.date) < TREND_DAYS)
    return { ...p, trend: mean(window.map((q) => q.value)) }
  })
}

/** 0..1 of the way from start to target. Works for goals going up or down. */
export function progressOf(goal: Pick<Goal, 'start' | 'target'>, value: number): number {
  const span = goal.target - goal.start
  if (span === 0) return 1
  return clamp((value - goal.start) / span, 0, 1)
}

export interface GoalStatus {
  series: GoalPoint[]
  latest: number | null
  trend: number | null
  progress: number
  /** Completed 10% steps (0-10), from the trend */
  milestone: number
  /** Value you'd be at today on a straight line to the target date */
  expectedValue: number | null
  onTrack: boolean | null
}

export function goalStatus(goal: Goal, entries: GoalEntry[], today: DayKey): GoalStatus {
  const series = goalSeries(entries.filter((e) => e.goalId === goal.id))
  const last = series.at(-1)
  const trend = last?.trend ?? null
  const progress = trend == null ? 0 : progressOf(goal, trend)
  const milestone = Math.floor(progress * 10 + 1e-9)

  let expectedValue: number | null = null
  let onTrack: boolean | null = null
  if (goal.targetDate) {
    const startDay = dayKey(goal.createdAt)
    const total = daysBetween(startDay, goal.targetDate)
    const expected = total > 0 ? clamp(daysBetween(startDay, today) / total, 0, 1) : 1
    expectedValue = goal.start + expected * (goal.target - goal.start)
    onTrack = last ? progress >= expected - ON_TRACK_SLACK : null
  }

  return { series, latest: last?.value ?? null, trend, progress, milestone, expectedValue, onTrack }
}

export function decimalsFor(step: number): number {
  if (step >= 1) return 0
  return Math.min(3, String(step).split('.')[1]?.length ?? 1)
}

export function formatGoalValue(v: number, step: number): string {
  return v.toFixed(decimalsFor(step))
}

/** Parses "82,5" or "82.5" */
export function parseNumber(s: string): number {
  const n = Number(s.replace(',', '.').trim())
  return s.trim() === '' ? NaN : n
}
