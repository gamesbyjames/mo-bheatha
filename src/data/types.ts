import type { DayKey } from '../lib/dates'

/**
 * 'do'     = something to do (exercise)
 * 'avoid'  = something to resist (alcohol)
 * 'target' = a daily number to reach (8,000 steps)
 */
export type HabitKind = 'do' | 'avoid' | 'target'

export interface Habit {
  id: string
  name: string
  emoji: string
  kind: HabitKind
  /** Points per tap (do/avoid), or for reaching the target */
  points: number
  /** Points per slip (avoid habits only). Usually zero or negative. */
  slipPoints: number
  /** do/avoid: allow up to MAX_TAPS taps a day. Undefined means true (older data). */
  repeatable?: boolean
  /** target habits only */
  target?: number
  unit?: string
  /** Quick-add amount for target habits */
  step?: number
  active: boolean
  order: number
  createdAt: number
}

export interface HabitLog {
  /** `${date}:${habitId}`, so one entry per habit per day */
  id: string
  habitId: string
  date: DayKey
  /**
   * do/avoid: +n = done / kept it n times, −n = slipped n times (|n| ≤ 3).
   * target: 1 = reached, 0 = not yet.
   */
  value: number
  /** target habits: amount so far today */
  amount?: number
  /** Points snapshot at time of logging, so later edits don't rewrite history */
  points: number
  ts: number
}

/** Pain intensity per body region: 1 = mild, 2 = moderate, 3 = severe */
export type PainMap = Record<string, number>

export interface FeelLog {
  id: string
  ts: number
  date: DayKey
  /** 1 (awful) to 5 (great), or null if not given */
  mood: number | null
  pain: PainMap
  tags: string[]
}

/** A long-term goal, e.g. weight 90 → 82 kg */
export interface Goal {
  id: string
  name: string
  emoji: string
  unit: string
  start: number
  target: number
  targetDate: DayKey | null
  /** Increment for the ± buttons (also sets decimal places) */
  step: number
  /** Highest 10% milestone reached (0-10). Never goes down. */
  milestone: number
  active: boolean
  order: number
  createdAt: number
}

export interface GoalEntry {
  id: string
  goalId: string
  date: DayKey
  ts: number
  value: number
}

export interface Settings {
  dailyGoal: number
  checkInPoints: number
  feelTags: string[]
  bodyView: 'front' | 'back'
  /** Show the pain body map on the Feel tab */
  trackPain: boolean
  /** Per-install random seed for bonus days */
  seed: number
  welcomeDismissed: boolean
}

export interface ExportBundle {
  app: 'mo-bheatha'
  version: 1 | 2
  exportedAt: string
  habits: Habit[]
  habitLogs: HabitLog[]
  feelLogs: FeelLog[]
  goals?: Goal[]
  goalEntries?: GoalEntry[]
  settings: Settings
}
