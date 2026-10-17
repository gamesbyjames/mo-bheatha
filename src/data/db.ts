import Dexie, { type Table } from 'dexie'
import type { FeelLog, Habit, HabitLog } from './types'

interface MetaRow {
  key: string
  value: unknown
}

class MoBheathaDB extends Dexie {
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  feelLogs!: Table<FeelLog, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('mo-bheatha')
    this.version(1).stores({
      habits: 'id, order',
      habitLogs: 'id, date, habitId',
      feelLogs: 'id, ts, date',
      meta: 'key',
    })
  }
}

export const db = new MoBheathaDB()
