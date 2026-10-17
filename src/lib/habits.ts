import type { Habit } from '../data/types'

/** Max taps per habit per day, in either direction */
export const MAX_TAPS = 3

export type TapAction = 'yes' | 'no' | 'minus'

export const isRepeatable = (h: Pick<Habit, 'kind' | 'repeatable'>) => h.kind !== 'target' && h.repeatable !== false

/**
 * Next signed tap count for a do/avoid habit (0 = cleared).
 * ✓ and ✗ are exclusive: tapping one replaces the other.
 */
export function nextValue(current: number, action: TapAction, repeatable: boolean): number {
  if (action === 'minus') return current > 0 ? current - 1 : current < 0 ? current + 1 : 0
  if (action === 'yes') {
    if (current <= 0) return 1
    return repeatable ? Math.min(MAX_TAPS, current + 1) : 0
  }
  if (current >= 0) return -1
  return repeatable ? Math.max(-MAX_TAPS, current - 1) : 0
}

export function pointsFor(habit: Pick<Habit, 'kind' | 'points' | 'slipPoints'>, value: number): number {
  if (habit.kind === 'target') return value > 0 ? habit.points : 0
  if (value > 0) return habit.points * value
  if (value < 0) return habit.slipPoints * -value
  return 0
}

export const targetReached = (h: Pick<Habit, 'target'>, amount: number) => amount >= (h.target ?? Infinity)

export function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}
