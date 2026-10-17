import type { FeelLog, HabitLog } from '../data/types'
import { addDays, type DayKey } from './dates'

export interface DayFeel {
  mood: number | null
  /** Average across the day's logs of total pain (sum of region intensities) */
  pain: number
  count: number
}

export function painScore(pain: Record<string, number>): number {
  return Object.values(pain).reduce((a, b) => a + b, 0)
}

export function dailyFeel(logs: FeelLog[]): Map<DayKey, DayFeel> {
  const acc = new Map<DayKey, { moodSum: number; moodN: number; pain: number; n: number }>()
  for (const l of logs) {
    const a = acc.get(l.date) ?? { moodSum: 0, moodN: 0, pain: 0, n: 0 }
    if (l.mood != null) {
      a.moodSum += l.mood
      a.moodN++
    }
    a.pain += painScore(l.pain)
    a.n++
    acc.set(l.date, a)
  }
  const out = new Map<DayKey, DayFeel>()
  for (const [d, a] of acc) out.set(d, { mood: a.moodN ? a.moodSum / a.moodN : null, pain: a.pain / a.n, count: a.n })
  return out
}

export interface Impact {
  habitId: string
  nWith: number
  nWithout: number
  moodWith: number | null
  moodWithout: number | null
  painWith: number | null
  painWithout: number | null
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/**
 * Compare how you felt on days you did a habit vs days you didn't.
 * offset = 1 compares with how you felt the *next* day.
 */
export function habitImpact(
  habitId: string,
  dates: DayKey[],
  habitLogs: HabitLog[],
  feel: Map<DayKey, DayFeel>,
  offset: 0 | 1,
): Impact {
  const done = new Set(habitLogs.filter((l) => l.habitId === habitId && l.value === 1).map((l) => l.date))
  const mW: number[] = [], mWo: number[] = [], pW: number[] = [], pWo: number[] = []
  let nWith = 0
  let nWithout = 0
  for (const d of dates) {
    const f = feel.get(offset ? addDays(d, offset) : d)
    if (!f) continue
    if (done.has(d)) {
      nWith++
      if (f.mood != null) mW.push(f.mood)
      pW.push(f.pain)
    } else {
      nWithout++
      if (f.mood != null) mWo.push(f.mood)
      pWo.push(f.pain)
    }
  }
  return { habitId, nWith, nWithout, moodWith: avg(mW), moodWithout: avg(mWo), painWith: avg(pW), painWithout: avg(pWo) }
}

/** 0..1 per region: how much pain that region had across logs in range */
export function painHeat(logs: FeelLog[]): Record<string, number> {
  if (!logs.length) return {}
  const sum: Record<string, number> = {}
  for (const l of logs) for (const [r, v] of Object.entries(l.pain)) sum[r] = (sum[r] ?? 0) + v
  const max = Math.max(...Object.values(sum), 1)
  return Object.fromEntries(Object.entries(sum).map(([r, v]) => [r, v / max]))
}
