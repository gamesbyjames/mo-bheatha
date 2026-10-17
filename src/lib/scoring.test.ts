import { describe, expect, it } from 'vitest'
import type { HabitLog } from '../data/types'
import { addDays, dayKey, daysBetween, rangeDays } from './dates'
import { buildScores, computeProgress, isBonusDay, levelFromXp, scoreDay, xpForLevel, type DayScore } from './scoring'
import { habitImpact, dailyFeel } from './insights'

// Wins score 40 and "L" days score 10, so a 2x bonus day never flips win/loss (goal is 30).
const S = { dailyGoal: 30, checkInPoints: 5, seed: 0 }
const nonBonusDay = (from: string, seed = S.seed) => {
  let d = from
  while (isBonusDay(d, seed)) d = addDays(d, 1)
  return d
}

const log = (date: string, points: number, habitId = 'h'): HabitLog => ({
  id: `${date}:${habitId}`,
  habitId,
  date,
  value: points >= 0 ? 1 : -1,
  points,
  ts: 0,
})

/** Build scores where `pattern` is a string like "WWW.W" (W = win, . = nothing) */
function scoresFrom(start: string, pattern: string): Map<string, DayScore> {
  const logs: HabitLog[] = []
  ;[...pattern].forEach((c, i) => {
    if (c === 'W') logs.push(log(addDays(start, i), 40))
    if (c === 'L') logs.push(log(addDays(start, i), 10))
  })
  return buildScores(logs, new Set(), S)
}

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('counts days between', () => {
    expect(daysBetween('2026-03-28', '2026-04-02')).toBe(5)
    expect(rangeDays('2026-01-01', '2026-01-03')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })
  it('treats 1am as the previous day', () => {
    expect(dayKey(new Date(2026, 4, 10, 1, 30).getTime())).toBe('2026-05-09')
    expect(dayKey(new Date(2026, 4, 10, 9, 0).getTime())).toBe('2026-05-10')
  })
})

describe('scoreDay', () => {
  it('sums positives, negatives and check-in', () => {
    const d = nonBonusDay('2026-01-05')
    const s = scoreDay(d, [log(d, 15), log(d, -5, 'b')], { checkedIn: true, goalLogs: 0 }, S)
    expect(s).toMatchObject({ positive: 15, negative: -5, checkIn: 5, total: 15, win: false })
  })
  it('doubles only positive points on bonus days', () => {
    let d = '2026-01-01'
    while (!isBonusDay(d, 42)) d = addDays(d, 1)
    const s = scoreDay(d, [log(d, 20), log(d, -5, 'b')], { checkedIn: false, goalLogs: 0 }, { ...S, seed: 42 })
    expect(s.total).toBe(35)
    expect(s.bonus).toBe(true)
  })
  it('bonus days are deterministic and roughly 15% of days', () => {
    const days = rangeDays('2026-01-01', '2028-12-31')
    const n = days.filter((d) => isBonusDay(d, 7)).length / days.length
    expect(n).toBeGreaterThan(0.1)
    expect(n).toBeLessThan(0.2)
    expect(isBonusDay('2026-06-01', 7)).toBe(isBonusDay('2026-06-01', 7))
  })
})

describe('levels', () => {
  it('follows the triangular curve', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000])
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(450)).toMatchObject({ level: 3, progress: 0.5 })
  })
})

describe('computeProgress', () => {
  const start = '2026-01-01'

  it('counts consecutive wins, with today pending', () => {
    const p = computeProgress(scoresFrom(start, 'WWW.'), addDays(start, 3))
    expect(p.streak).toBe(3)
    expect(p.streakAtRisk).toBe(true)
  })

  it('includes today once won', () => {
    const p = computeProgress(scoresFrom(start, 'WWWW'), addDays(start, 3))
    expect(p.streak).toBe(4)
    expect(p.streakAtRisk).toBe(false)
  })

  it('uses the starting freeze to bridge one missed day', () => {
    const p = computeProgress(scoresFrom(start, 'WW.WW'), addDays(start, 4))
    expect(p.streak).toBe(4)
    expect(p.freezes).toBe(0)
    expect(p.frozenDays.has(addDays(start, 2))).toBe(true)
  })

  it('breaks the streak when no freezes are left', () => {
    const p = computeProgress(scoresFrom(start, 'WW.W.WW'), addDays(start, 6))
    expect(p.streak).toBe(2)
    expect(p.bestStreak).toBe(3)
  })

  it('earns a freeze every 7 wins, capped at 2', () => {
    const p = computeProgress(scoresFrom(start, 'W'.repeat(21) + '.'), addDays(start, 21))
    expect(p.freezes).toBe(2)
    expect(p.streak).toBe(21)
  })

  it('XP ignores negative days', () => {
    const d = nonBonusDay('2026-01-01')
    const logs = [log(d, 40), log(addDays(d, 1), -20)]
    const p = computeProgress(buildScores(logs, new Set(), S), addDays(d, 1))
    expect(p.xp).toBe(40)
  })

  it('a losing (non-goal) day is not a win', () => {
    const p = computeProgress(scoresFrom(start, 'L.'), addDays(start, 1))
    expect(p.streak).toBe(0)
  })
})

describe('habitImpact', () => {
  it('compares feel on habit days vs other days', () => {
    const dates = rangeDays('2026-01-01', '2026-01-04')
    const habitLogs = [log('2026-01-01', 10, 'ex'), log('2026-01-03', 10, 'ex')]
    const feel = dailyFeel([
      { id: '1', ts: 0, date: '2026-01-01', mood: 5, pain: { lower_back: 1 }, tags: [] },
      { id: '2', ts: 0, date: '2026-01-02', mood: 2, pain: { lower_back: 3 }, tags: [] },
      { id: '3', ts: 0, date: '2026-01-03', mood: 4, pain: {}, tags: [] },
      { id: '4', ts: 0, date: '2026-01-04', mood: 3, pain: { lower_back: 2, neck: 1 }, tags: [] },
    ])
    const same = habitImpact('ex', dates, habitLogs, feel, 0)
    expect(same).toMatchObject({ nWith: 2, nWithout: 2, moodWith: 4.5, moodWithout: 2.5, painWith: 0.5, painWithout: 3 })
    const next = habitImpact('ex', dates.slice(0, -1), habitLogs, feel, 1)
    expect(next).toMatchObject({ nWith: 2, nWithout: 1, moodWith: 2.5, moodWithout: 4 })
  })
})
