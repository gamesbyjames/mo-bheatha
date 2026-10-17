/**
 * All reads and writes go through this module. Only this file and db.ts know
 * about IndexedDB, so adding cloud sync later means changing these two files.
 */
import { db } from './db'
import { defaultHabits, defaultSettings } from './defaults'
import type { ExportBundle, FeelLog, Habit, HabitLog, HabitOutcome, PainMap, Settings } from './types'
import { dayKey, type DayKey } from '../lib/dates'

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

/** Set (or clear, with null) the outcome of a habit on a given day. */
export async function setHabitOutcome(habit: Habit, date: DayKey, value: HabitOutcome | null): Promise<void> {
  const id = `${date}:${habit.id}`
  if (value === null) {
    await db.habitLogs.delete(id)
    return
  }
  const log: HabitLog = {
    id,
    habitId: habit.id,
    date,
    value,
    points: value === 1 ? habit.points : habit.slipPoints,
    ts: Date.now(),
  }
  await db.habitLogs.put(log)
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

// ---------- Backup ----------

export async function exportAll(): Promise<ExportBundle> {
  const [habits, habitLogs, feelLogs, settings] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.feelLogs.toArray(),
    getSettings(),
  ])
  return { app: 'mo-bheatha', version: 1, exportedAt: new Date().toISOString(), habits, habitLogs, feelLogs, settings }
}

export async function importAll(data: unknown): Promise<void> {
  const b = data as Partial<ExportBundle>
  if (!b || b.app !== 'mo-bheatha' || !Array.isArray(b.habits) || !Array.isArray(b.habitLogs) || !Array.isArray(b.feelLogs)) {
    throw new Error("This doesn't look like a Mo Bheatha backup file.")
  }
  await db.transaction('rw', [db.habits, db.habitLogs, db.feelLogs, db.meta], async () => {
    await Promise.all([db.habits.clear(), db.habitLogs.clear(), db.feelLogs.clear(), db.meta.clear()])
    await db.habits.bulkPut(b.habits!)
    await db.habitLogs.bulkPut(b.habitLogs!)
    await db.feelLogs.bulkPut(b.feelLogs!)
    await db.meta.put({ key: SETTINGS_KEY, value: { ...defaultSettings(), ...(b.settings ?? {}) } })
    await db.meta.put({ key: SEEDED_KEY, value: true })
  })
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.habits, db.habitLogs, db.feelLogs, db.meta], async () => {
    await Promise.all([db.habits.clear(), db.habitLogs.clear(), db.feelLogs.clear(), db.meta.clear()])
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
