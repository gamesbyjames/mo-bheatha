import { useState, type MouseEvent } from 'react'
import { useHabits, useProgress } from '../data/hooks'
import { setHabitOutcome, updateSettings } from '../data/repo'
import type { Habit, HabitLog, HabitOutcome } from '../data/types'
import { addDays, daysBetween, prettyDay, type DayKey } from '../lib/dates'
import { BONUS_MULTIPLIER, scoreDay } from '../lib/scoring'
import { confetti, floatText } from '../lib/fx'
import { toast } from '../lib/toast'
import { isIOS, isStandalone } from '../lib/pwa'

const SLIP_MESSAGES = [
  'Logged. Being honest counts too.',
  "Noted. Tomorrow's a fresh start.",
  "One slip doesn't undo your progress.",
  'Logged. Your level is safe.',
]

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

export default function DoScreen() {
  const data = useProgress()
  const habits = useHabits()
  const [picked, setPicked] = useState<DayKey | null>(null)

  if (!data || !habits) return null
  const { scores, progress, settings, habitLogs, today } = data
  const date = picked ?? today
  const isToday = date === today

  const dayLogs = habitLogs.filter((l) => l.date === date)
  const byHabit = new Map(dayLogs.map((l) => [l.habitId, l]))
  const checkedIn = (scores.get(date)?.checkIn ?? 0) > 0
  const score = scores.get(date) ?? scoreDay(date, [], false, settings)
  const active = habits.filter((h) => h.active)
  const goalPct = Math.min(1, Math.max(0, score.total / settings.dailyGoal))

  async function handle(habit: Habit, value: HabitOutcome | null, e: MouseEvent) {
    const { clientX: x, clientY: y } = e
    await setHabitOutcome(habit, date, value)

    // Work out the new day score so we can celebrate crossing the goal
    const others = dayLogs.filter((l) => l.habitId !== habit.id)
    const next: HabitLog[] = value
      ? [...others, { id: '', habitId: habit.id, date, value, points: value === 1 ? habit.points : habit.slipPoints, ts: 0 }]
      : others
    const after = scoreDay(date, next, checkedIn, settings)

    if (value === 1) {
      const pts = habit.points * (score.bonus ? BONUS_MULTIPLIER : 1)
      floatText(`+${pts}`, x, y)
      confetti(x, y, 16)
      if (!score.win && after.win) {
        setTimeout(() => {
          confetti(window.innerWidth / 2, window.innerHeight / 3, 90)
          toast('Daily goal hit! 🎉', 'good')
        }, 250)
      }
    } else if (value === -1) {
      if (habit.slipPoints) floatText(`${habit.slipPoints}`, x, y, '#fb7185')
      const canStillWin = !after.win && isToday
      toast(canStillWin ? `${pick(SLIP_MESSAGES)} You can still hit today's goal.` : pick(SLIP_MESSAGES))
    }
  }

  return (
    <div className="space-y-4">
      {/* Date switcher */}
      <div className="flex items-center justify-between">
        <button className="press rounded-full px-3 py-2 text-2xl text-slate-400" onClick={() => setPicked(addDays(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <button className="text-lg font-bold" onClick={() => setPicked(null)}>
          {prettyDay(date, today)}
          {!isToday && <span className="ml-2 text-xs font-medium text-emerald-400">back to today</span>}
        </button>
        <button
          className="press rounded-full px-3 py-2 text-2xl text-slate-400 disabled:opacity-20"
          disabled={daysBetween(date, today) <= 0}
          onClick={() => setPicked(addDays(date, 1))}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* Score card */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-lg ring-1 ring-slate-700/50">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Points</div>
            <div className="text-4xl font-black tabular-nums">
              <span className={score.total < 0 ? 'text-rose-400' : ''}>{score.total}</span>
              <span className="text-lg font-bold text-slate-500"> / {settings.dailyGoal}</span>
            </div>
          </div>
          <div className="flex gap-3 text-right">
            <Stat icon="🔥" value={progress.streak} label={progress.streakAtRisk ? 'at risk' : 'streak'} warn={progress.streakAtRisk} />
            <Stat icon="❄️" value={progress.freezes} label="freezes" />
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${score.win ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${goalPct * 100}%` }}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-bold text-violet-300">Lv {progress.level.level}</div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full bg-violet-400" style={{ width: `${progress.level.progress * 100}%` }} />
          </div>
          <div className="text-xs tabular-nums text-slate-400">
            {progress.xp} / {progress.level.next} XP
          </div>
        </div>
      </section>

      {score.bonus && (
        <div className="animate-pop rounded-2xl bg-amber-400/15 px-4 py-3 text-sm font-semibold text-amber-300 ring-1 ring-amber-400/40">
          ⚡ Bonus day! Positive points are doubled.
        </div>
      )}

      {!settings.welcomeDismissed && (
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/30">
          <p className="font-bold">Welcome to Mo Bheatha 👋</p>
          <p className="mt-1 text-emerald-200/80">
            Tap a habit when you do it. For things you're avoiding, tap ✓ at the end of the day, or ✗ if you slipped. Hit{' '}
            {settings.dailyGoal} points to keep your streak going. Log how you feel any time in the Feel tab (+
            {settings.checkInPoints} for your first check-in each day). You can change habits and points in Settings.
          </p>
          {!isStandalone() && (
            <p className="mt-2 text-emerald-200/80">
              📲 Add it to your Home Screen first ({isIOS() ? 'Safari → Share → Add to Home Screen' : 'browser menu → Install'}), so
              your data stays safe.
            </p>
          )}
          <button className="mt-2 font-bold text-emerald-300" onClick={() => updateSettings({ welcomeDismissed: true })}>
            Got it
          </button>
        </div>
      )}

      {/* Habits */}
      <section className="space-y-2.5">
        {active.map((h) =>
          h.kind === 'do' ? (
            <DoCard key={h.id} habit={h} log={byHabit.get(h.id)} onSet={handle} />
          ) : (
            <AvoidCard key={h.id} habit={h} log={byHabit.get(h.id)} onSet={handle} />
          ),
        )}
        {active.length === 0 && <p className="py-8 text-center text-slate-500">No habits yet. Add some in Settings.</p>}
      </section>

      {checkedIn && (
        <p className="text-center text-xs text-slate-500">
          +{settings.checkInPoints} check-in points from logging how you felt
        </p>
      )}
    </div>
  )
}

function Stat({ icon, value, label, warn }: { icon: string; value: number; label: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-2xl font-black tabular-nums">
        {icon}
        {value}
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${warn ? 'text-amber-400' : 'text-slate-500'}`}>{label}</div>
    </div>
  )
}

interface CardProps {
  habit: Habit
  log?: HabitLog
  onSet: (h: Habit, v: HabitOutcome | null, e: MouseEvent) => void
}

function DoCard({ habit, log, onSet }: CardProps) {
  const done = log?.value === 1
  return (
    <button
      onClick={(e) => onSet(habit, done ? null : 1, e)}
      className={`press flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors ${
        done ? 'bg-emerald-500/20 ring-emerald-400/60' : 'bg-slate-800/70 ring-slate-700/60'
      }`}
    >
      <span className="text-3xl">{habit.emoji}</span>
      <span className="flex-1 text-base font-semibold">{habit.name}</span>
      <span className={`text-sm font-bold tabular-nums ${done ? 'text-emerald-300' : 'text-slate-500'}`}>+{habit.points}</span>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-black ${
          done ? 'animate-pop bg-emerald-400 text-emerald-950' : 'bg-slate-700 text-transparent'
        }`}
      >
        ✓
      </span>
    </button>
  )
}

function AvoidCard({ habit, log, onSet }: CardProps) {
  const v = log?.value
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-3 ring-1 transition-colors ${
        v === 1 ? 'bg-emerald-500/20 ring-emerald-400/60' : v === -1 ? 'bg-rose-500/15 ring-rose-400/50' : 'bg-slate-800/70 ring-slate-700/60'
      }`}
    >
      <span className="text-3xl">{habit.emoji}</span>
      <span className="flex-1 text-base font-semibold">{habit.name}</span>
      <button
        onClick={(e) => onSet(habit, v === -1 ? null : -1, e)}
        className={`press flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-bold ${
          v === -1 ? 'animate-pop bg-rose-400 text-rose-950' : 'bg-slate-700 text-slate-400'
        }`}
        aria-label={`Slipped: ${habit.name}`}
      >
        ✗{habit.slipPoints ? ` ${habit.slipPoints}` : ''}
      </button>
      <button
        onClick={(e) => onSet(habit, v === 1 ? null : 1, e)}
        className={`press flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-bold ${
          v === 1 ? 'animate-pop bg-emerald-400 text-emerald-950' : 'bg-slate-700 text-slate-300'
        }`}
        aria-label={`Stuck to it: ${habit.name}`}
      >
        ✓ +{habit.points}
      </button>
    </div>
  )
}
