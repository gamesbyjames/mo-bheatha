import Dexie, { type Table } from 'dexie'
import type { FeelLog, Goal, GoalEntry, Habit, HabitLog } from './types'

interface MetaRow {
  key: string
  value: unknown
}

class MoBheathaDB extends Dexie {
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  feelLogs!: Table<FeelLog, string>
  goals!: Table<Goal, string>
  goalEntries!: Table<GoalEntry, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('mo-bheatha')
    this.version(1).stores({
      habits: 'id, order',
      habitLogs: 'id, date, habitId',
      feelLogs: 'id, ts, date',
      meta: 'key',
    })
    this.version(2)
      .stores({
        goals: 'id, order',
        goalEntries: 'id, goalId, date, ts',
      })
      .upgrade(async (tx) => {
        // Pain tracking is now off by default. Keep it on for anyone who has used it.
        const meta = tx.table<MetaRow, string>('meta')
        const row = await meta.get('settings')
        const value = row?.value as Record<string, unknown> | undefined
        if (value && value.trackPain === undefined) {
          const withPain = await tx
            .table<FeelLog, string>('feelLogs')
            .filter((l) => Object.keys(l.pain ?? {}).length > 0)
            .first()
          await meta.put({ key: 'settings', value: { ...value, trackPain: !!withPain } })
        }
      })
  }
}

export const db = new MoBheathaDB()
