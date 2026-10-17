/**
 * All reads and writes go through this module. Only this file and db.ts know
 * about IndexedDB, so adding cloud sync later means changing these two files.
 */
import { db } from './db'
import { defaultHabits, defaultSettings } from './defaults'
import type { ExportBundle, FeelLog, Goal, Habit, HabitLog, PainMap, Settings } from './types'
import { dayKey, type DayKey } from '../lib/dates'
import { pointsFor, targetReached } from '../lib/habits'
import { goalStatus } from '../lib/goals'

const SETTINGS_KEY = 'settings'
const SEEDED_KEY = 'seeded'

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** First-run setup. Idempotent (fixed ids + put), so it's safe to call twice. */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.habits, db.meta, async () => {
    const seeded = await db.meta.get(SEEDED_KEY)
    if (seeded) return
    await db.habits.bulkPut(defaultHabits())
    const existing = await db.meta.get(SETTINGS_KEY)
    if (!existing) await db.meta.put({ key: SETTINGS_KEY, value: defaultSettings() })
    await db.meta.put({ key: SEEDED_KEY, value: true })
  })
}

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const row = await db.meta.get(SETTINGS_KEY)
  return { ...defaultSettings(), ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.meta.put({ key: SETTINGS_KEY, value: { ...current, ...patch } })
}

// ---------- Habits ----------

export async function listHabits(): Promise<Habit[]> {
  return db.habits.orderBy('order').toArray()
}

export async function saveHabit(h: Omit<Habit, 'id' | 'order' | 'createdAt'> & Partial<Habit>): Promise<void> {
  if (h.id) {
    await db.habits.update(h.id, h)
    return
  }
  const last = await db.habits.orderBy('order').last()
  await db.habits.add({ ...h, id: uid(), order: (last?.order ?? -1) + 1, createdAt: Date.now() } as Habit)
}

export async function setHabitActive(id: string, active: boolean): Promise<void> {
  await db.habits.update(id, { active })
}

export async function moveHabit(id: string, dir: -1 | 1): Promise<void> {
  const all = (await listHabits()).filter((h) => h.active)
  const i = all.findIndex((h) => h.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= all.length) return
  ;[all[i], all[j]] = [all[j], all[i]]
  await db.transaction('rw', db.habits, async () => {
    await Promise.all(all.map((h, idx) => db.habits.update(h.id, { order: idx })))
  })
}

// ---------- Habit logs ----------

/**
 * Set a habit's log for a day. `value` is the signed tap count for do/avoid
 * habits (0 clears it). For target habits pass the `amount`.
 */
export async function setHabitLog(habit: Habit, date: DayKey, value: number, amount?: number): Promise<HabitLog | null> {
  const id = `${date}:${habit.id}`
  const empty = habit.kind === 'target' ? !amount || amount <= 0 : value === 0
  if (empty) {
    await db.habitLogs.delete(id)
    return null
  }
  const log: HabitLog = {
    id,
    habitId: habit.id,
    date,
    value,
    ...(habit.kind === 'target' ? { amount } : {}),
    points: pointsFor(habit, value),
    ts: Date.now(),
  }
  await db.habitLogs.put(log)
  return log
}

export function setTargetAmount(habit: Habit, date: DayKey, amount: number) {
  const a = Math.max(0, amount)
  return setHabitLog(habit, date, targetReached(habit, a) ? 1 : 0, a)
}

export const allHabitLogs = () => db.habitLogs.toArray()

// ---------- Feel logs ----------

export async function addFeelLog(entry: { mood: number | null; pain: PainMap; tags: string[] }): Promise<FeelLog> {
  const ts = Date.now()
  const log: FeelLog = { id: uid(), ts, date: dayKey(ts), ...entry }
  await db.feelLogs.add(log)
  return log
}

export const deleteFeelLog = (id: string) => db.feelLogs.delete(id)
export const allFeelLogs = () => db.feelLogs.orderBy('ts').toArray()

// ---------- Goals ----------

export const listGoals = () => db.goals.orderBy('order').toArray()
export const allGoalEntries = () => db.goalEntries.orderBy('ts').toArray()

export async function saveGoal(g: Omit<Goal, 'id' | 'order' | 'createdAt' | 'milestone'> & Partial<Goal>): Promise<void> {
  if (g.id) {
    await db.goals.update(g.id, g)
    return
  }
  const last = await db.goals.orderBy('order').last()
  await db.goals.add({ ...g, milestone: 0, id: uid(), order: (last?.order ?? -1) + 1, createdAt: Date.now() } as Goal)
}

export const setGoalActive = (id: string, active: boolean) => db.goals.update(id, { active })

export interface GoalLogResult {
  firstToday: boolean
  /** Number of new 10% milestones reached by this entry */
  newMilestones: number
  milestone: number
}

export async function addGoalEntry(goalId: string, value: number): Promise<GoalLogResult> {
  const ts = Date.now()
  const date = dayKey(ts)
  return db.transaction('rw', db.goals, db.goalEntries, async () => {
    const goal = await db.goals.get(goalId)
    if (!goal) throw new Error('Goal not found')
    const firstToday = (await db.goalEntries.where('date').equals(date).filter((e) => e.goalId === goalId).count()) === 0
    await db.goalEntries.add({ id: uid(), goalId, date, ts, value })
    const entries = await db.goalEntries.where('goalId').equals(goalId).toArray()
    const status = goalStatus(goal, entries, date)
    const prev = goal.milestone ?? 0
    // Milestones only ever go up
    if (status.milestone > prev) await db.goals.update(goalId, { milestone: status.milestone })
    return { firstToday, newMilestones: Math.max(0, status.milestone - prev), milestone: Math.max(prev, status.milestone) }
  })
}

export const deleteGoalEntry = (id: string) => db.goalEntries.delete(id)

// ---------- Backup ----------

export async function exportAll(): Promise<ExportBundle> {
  const [habits, habitLogs, feelLogs, goals, goalEntries, settings] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.feelLogs.toArray(),
    db.goals.toArray(),
    db.goalEntries.toArray(),
    getSettings(),
  ])
  return { app: 'mo-bheatha', version: 2, exportedAt: new Date().toISOString(), habits, habitLogs, feelLogs, goals, goalEntries, settings }
}

const ALL_TABLES = () => [db.habits, db.habitLogs, db.feelLogs, db.goals, db.goalEntries, db.meta]

export async function importAll(data: unknown): Promise<void> {
  const b = data as Partial<ExportBundle>
  if (!b || b.app !== 'mo-bheatha' || !Array.isArray(b.habits) || !Array.isArray(b.habitLogs) || !Array.isArray(b.feelLogs)) {
    throw new Error("This doesn't look like a Mo Bheatha backup file.")
  }
  const feelLogs = b.feelLogs
  const settings: Settings = {
    ...defaultSettings(),
    // Version 1 backups predate the pain setting: keep it on if pain was logged
    trackPain: feelLogs.some((l) => Object.keys(l.pain ?? {}).length > 0),
    ...(b.settings ?? {}),
  }
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()))
    await db.habits.bulkPut(b.habits!)
    await db.habitLogs.bulkPut(b.habitLogs!)
    await db.feelLogs.bulkPut(feelLogs)
    await db.goals.bulkPut(b.goals ?? [])
    await db.goalEntries.bulkPut(b.goalEntries ?? [])
    await db.meta.put({ key: SETTINGS_KEY, value: settings })
    await db.meta.put({ key: SEEDED_KEY, value: true })
  })
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()))
  })
  await ensureSeeded()
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

