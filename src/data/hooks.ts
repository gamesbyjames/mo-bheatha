import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { allFeelLogs, allGoalEntries, allHabitLogs, getSettings, listGoals, listHabits } from './repo'
import { buildScores, computeProgress, MILESTONE_XP } from '../lib/scoring'
import { dayKey, type DayKey } from '../lib/dates'

export const useSettings = () => useLiveQuery(getSettings, [])
export const useHabits = () => useLiveQuery(listHabits, [])
export const useHabitLogs = () => useLiveQuery(allHabitLogs, [])
export const useFeelLogs = () => useLiveQuery(allFeelLogs, [])
export const useGoals = () => useLiveQuery(listGoals, [])
export const useGoalEntries = () => useLiveQuery(allGoalEntries, [])

/** Today's key. Updates when the app comes back to the foreground on a new day. */
export function useToday() {
  const [today, setToday] = useState(dayKey())
  useEffect(() => {
    const update = () => setToday(dayKey())
    document.addEventListener('visibilitychange', update)
    const t = setInterval(update, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', update)
      clearInterval(t)
    }
  }, [])
  return today
}

export function useProgress() {
  const habitLogs = useHabitLogs()
  const feelLogs = useFeelLogs()
  const goals = useGoals()
  const goalEntries = useGoalEntries()
  const settings = useSettings()
  const today = useToday()

  return useMemo(() => {
    if (!habitLogs || !feelLogs || !settings || !goals || !goalEntries) return undefined
    const checkIns = new Set(feelLogs.map((f) => f.date))

    // Count each goal once per day
    const seen = new Set<string>()
    const goalLogsByDate = new Map<DayKey, number>()
    for (const e of goalEntries) {
      const k = `${e.date}|${e.goalId}`
      if (seen.has(k)) continue
      seen.add(k)
      goalLogsByDate.set(e.date, (goalLogsByDate.get(e.date) ?? 0) + 1)
    }

    const milestoneXp = goals.reduce((sum, g) => sum + (g.milestone ?? 0) * MILESTONE_XP, 0)
    const scores = buildScores(habitLogs, checkIns, settings, goalLogsByDate)
    const progress = computeProgress(scores, today, milestoneXp)
    return { scores, progress, settings, today, habitLogs, feelLogs, goals, goalEntries }
  }, [habitLogs, feelLogs, goals, goalEntries, settings, today])
}
