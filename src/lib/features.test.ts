import { describe, expect, it } from 'vitest'
import type { Goal, GoalEntry } from '../data/types'
import { nextValue, pointsFor, targetReached, MAX_TAPS } from './habits'
import { goalSeries, goalStatus, progressOf, formatGoalValue, parseNumber } from './goals'
import { describePain, expandLegacy, painScore, REGION_LABELS, SHAPES } from './body'
import { painHeat } from './insights'
import { computeProgress, scoreDay, isBonusDay, GOAL_LOG_POINTS } from './scoring'
import { addDays } from './dates'

describe('tap counts', () => {
  it('✓ counts up to the max, ✗ counts down to -max', () => {
    let v = 0
    for (let i = 0; i < 5; i++) v = nextValue(v, 'yes', true)
    expect(v).toBe(MAX_TAPS)
    v = 0
    for (let i = 0; i < 5; i++) v = nextValue(v, 'no', true)
    expect(v).toBe(-MAX_TAPS)
  })
  it('✓ and ✗ replace each other', () => {
    expect(nextValue(2, 'no', true)).toBe(-1)
    expect(nextValue(-3, 'yes', true)).toBe(1)
  })
  it('minus moves one step towards zero', () => {
    expect(nextValue(3, 'minus', true)).toBe(2)
    expect(nextValue(-1, 'minus', true)).toBe(0)
    expect(nextValue(0, 'minus', true)).toBe(0)
  })
  it('non-repeatable habits toggle', () => {
    expect(nextValue(0, 'yes', false)).toBe(1)
    expect(nextValue(1, 'yes', false)).toBe(0)
    expect(nextValue(-1, 'no', false)).toBe(0)
  })
  it('points multiply by tap count', () => {
    const h = { kind: 'avoid' as const, points: 10, slipPoints: -5 }
    expect(pointsFor(h, 3)).toBe(30)
    expect(pointsFor(h, -2)).toBe(-10)
    expect(pointsFor(h, 0)).toBe(0)
  })
  it('target habits score once when reached', () => {
    const h = { kind: 'target' as const, points: 10, slipPoints: 0, target: 8000 }
    expect(targetReached(h, 7999)).toBe(false)
    expect(targetReached(h, 8000)).toBe(true)
    expect(pointsFor(h, 1)).toBe(10)
    expect(pointsFor(h, 0)).toBe(0)
  })
})

describe('goal points in day score', () => {
  it('adds points per goal logged, not doubled on bonus days', () => {
    let d = '2026-01-01'
    while (!isBonusDay(d, 42)) d = addDays(d, 1)
    const s = scoreDay(d, [], { checkedIn: false, goalLogs: 2 }, { dailyGoal: 35, checkInPoints: 5, seed: 42 })
    expect(s.total).toBe(2 * GOAL_LOG_POINTS)
  })
  it('milestone XP is added to progress', () => {
    const p = computeProgress(new Map(), '2026-01-01', 75)
    expect(p.xp).toBe(75)
  })
})

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g',
  name: 'Weight',
  emoji: '⚖️',
  unit: 'kg',
  start: 90,
  target: 80,
  targetDate: null,
  step: 0.1,
  milestone: 0,
  active: true,
  order: 0,
  createdAt: new Date(2026, 0, 1, 12).getTime(),
  ...over,
})
const entry = (date: string, value: number, id = date): GoalEntry => ({ id, goalId: 'g', date, ts: 0, value })

describe('goals', () => {
  it('averages multiple entries per day and builds a 7-day trend', () => {
    const s = goalSeries([
      entry('2026-01-01', 90),
      entry('2026-01-02', 89, 'a'),
      entry('2026-01-02', 91, 'b'),
      entry('2026-01-08', 86),
      entry('2026-01-09', 84),
    ])
    expect(s.map((p) => p.value)).toEqual([90, 90, 86, 84])
    // Jan 8 window = Jan 2..8 → (90 + 86) / 2
    expect(s[2].trend).toBe(88)
    // Jan 9 window = Jan 3..9 → (86 + 84) / 2
    expect(s[3].trend).toBe(85)
  })
  it('progress works for goals going down or up', () => {
    expect(progressOf({ start: 90, target: 80 }, 85)).toBe(0.5)
    expect(progressOf({ start: 90, target: 80 }, 95)).toBe(0)
    expect(progressOf({ start: 50, target: 60 }, 57)).toBeCloseTo(0.7)
    expect(progressOf({ start: 90, target: 80 }, 70)).toBe(1)
  })
  it('milestones come from the trend, in 10% steps', () => {
    const st = goalStatus(goal(), [entry('2026-01-05', 87), entry('2026-01-06', 86.8)], '2026-01-06')
    expect(st.trend).toBeCloseTo(86.9)
    expect(st.milestone).toBe(3)
  })
  it('on-track compares progress with a straight line to the target date', () => {
    const g = goal({ targetDate: '2026-01-11' }) // 10 days
    const behind = goalStatus(g, [entry('2026-01-06', 89)], '2026-01-06')
    expect(behind.expectedValue).toBeCloseTo(85)
    expect(behind.onTrack).toBe(false)
    const ahead = goalStatus(g, [entry('2026-01-06', 84)], '2026-01-06')
    expect(ahead.onTrack).toBe(true)
  })
  it('formats and parses numbers', () => {
    expect(formatGoalValue(82.456, 0.1)).toBe('82.5')
    expect(formatGoalValue(72.4, 1)).toBe('72')
    expect(parseNumber('82,5')).toBe(82.5)
    expect(parseNumber('')).toBeNaN()
  })
})

describe('split torso', () => {
  it('every shape has a label and ids are unique per view', () => {
    for (const view of ['front', 'back'] as const) {
      const ids = SHAPES[view].map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(REGION_LABELS[id]).toBeTruthy()
    }
    expect(SHAPES.back.map((s) => s.id)).toContain('lower_back_l')
    expect(SHAPES.front.map((s) => s.id)).toContain('chest_r')
  })
  it('old whole-region entries expand to both halves', () => {
    expect(expandLegacy({ lower_back: 2, knee_l: 1 })).toEqual({ lower_back_l: 2, lower_back_r: 2, knee_l: 1 })
  })
  it('pain score counts torso halves once, so old and new entries compare', () => {
    expect(painScore({ lower_back: 2 })).toBe(2)
    expect(painScore({ lower_back_l: 2, lower_back_r: 2 })).toBe(2)
    expect(painScore({ lower_back_l: 3, lower_back_r: 1, knee_l: 1, knee_r: 1 })).toBe(5)
  })
  it('heatmap shows legacy pain on both halves', () => {
    const heat = painHeat([{ id: '1', ts: 0, date: '2026-01-01', mood: null, pain: { lower_back: 3 }, tags: [] }])
    expect(heat.lower_back_l).toBe(1)
    expect(heat.lower_back_r).toBe(1)
  })
  it('describes pain, merging matching halves', () => {
    expect(describePain({ lower_back_l: 2, lower_back_r: 2 })).toEqual(['Lower back (moderate)'])
    expect(describePain({ lower_back_l: 2 })).toEqual(['Left lower back (moderate)'])
    expect(describePain({ upper_back: 1 })).toEqual(['Upper back (mild)'])
  })
})
