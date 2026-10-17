import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { allFeelLogs, allHabitLogs, getSettings, listHabits } from './repo'
import { buildScores, computeProgress } from '../lib/scoring'
import { dayKey } from '../lib/dates'

export const useSettings = () => useLiveQuery(getSettings, [])
export const useHabits = () => useLiveQuery(listHabits, [])
export const useHabitLogs = () => useLiveQuery(allHabitLogs, [])
export const useFeelLogs = () => useLiveQuery(allFeelLogs, [])

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
  const settings = useSettings()
  const today = useToday()

  return useMemo(() => {
    if (!habitLogs || !feelLogs || !settings) return undefined
    const checkIns = new Set(feelLogs.map((f) => f.date))
    const scores = buildScores(habitLogs, checkIns, settings)
    const progress = computeProgress(scores, today)
    return { scores, progress, settings, today, habitLogs, feelLogs }
  }, [habitLogs, feelLogs, settings, today])
}
