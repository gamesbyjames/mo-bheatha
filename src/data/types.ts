import type { DayKey } from '../lib/dates'

/** 'do' = something to do (exercise). 'avoid' = something to resist (alcohol). */
export type HabitKind = 'do' | 'avoid'

export interface Habit {
  id: string
  name: string
  emoji: string
  kind: HabitKind
  /** Points for doing it / successfully avoiding it. */
  points: number
  /** Points for a slip (avoid habits only). Usually zero or negative. */
  slipPoints: number
  active: boolean
  order: number
  createdAt: number
}

/** 1 = done / avoided, -1 = slipped */
export type HabitOutcome = 1 | -1

export interface HabitLog {
  /** `${date}:${habitId}`, so one entry per habit per day */
  id: string
  habitId: string
  date: DayKey
  value: HabitOutcome
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

export interface Settings {
  dailyGoal: number
  checkInPoints: number
  feelTags: string[]
  bodyView: 'front' | 'back'
  /** Per-install random seed for bonus days */
  seed: number
  welcomeDismissed: boolean
}

export interface ExportBundle {
  app: 'mo-bheatha'
  version: 1
  exportedAt: string
  habits: Habit[]
  habitLogs: HabitLog[]
  feelLogs: FeelLog[]
  settings: Settings
}
