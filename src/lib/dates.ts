/**
 * A "day" starts at 3am, so logging something just after midnight
 * still counts towards the evening you're actually in.
 */
export const DAY_START_HOUR = 3

export type DayKey = string // YYYY-MM-DD (local)

const pad = (n: number) => String(n).padStart(2, '0')

export function formatKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(ts: number = Date.now()): DayKey {
  const d = new Date(ts)
  d.setHours(d.getHours() - DAY_START_HOUR)
  return formatKey(d)
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return formatKey(d)
}

/** Whole days from a to b (positive if b is later). DST-safe. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** Inclusive list of day keys from `from` to `to`. */
export function rangeDays(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = []
  const n = daysBetween(from, to)
  for (let i = 0; i <= n; i++) out.push(addDays(from, i))
  return out
}

export function prettyDay(key: DayKey, today: DayKey = dayKey()): string {
  const diff = daysBetween(key, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function shortDay(key: DayKey): string {
  return parseKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
