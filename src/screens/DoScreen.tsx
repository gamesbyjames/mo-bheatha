import { useState, type MouseEvent } from 'react'
import Sheet, { NumberField } from '../components/Sheet'
import { useHabits, useProgress } from '../data/hooks'
import { setHabitLog, updateSettings } from '../data/repo'
import type { Habit, HabitLog } from '../data/types'
import { addDays, daysBetween, prettyDay, type DayKey } from '../lib/dates'
import { formatAmount, isRepeatable, MAX_TAPS, nextValue, type TapAction } from '../lib/habits'
import { parseNumber } from '../lib/goals'
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

type Pos = { x: number; y: number }
const posOf = (e?: MouseEvent): Pos => (e ? { x: e.clientX, y: e.clientY } : { x: window.innerWidth / 2, y: window.innerHeight / 2 })

export default function DoScreen() {
  const data = useProgress()
  const habits = useHabits()
  const [picked, setPicked] = useState<DayKey | null>(null)
  const [targetFor, setTargetFor] = useState<Habit | null>(null)

  if (!data || !habits) return null
  const { scores, progress, settings, habitLogs, today } = data
  const date = picked ?? today
  const isToday = date === today

  const dayLogs = habitLogs.filter((l) => l.date === date)
  const byHabit = new Map(dayLogs.map((l) => [l.habitId, l]))
  const score = scores.get(date) ?? scoreDay(date, [], { checkedIn: false, goalLogs: 0 }, settings)
  const extras = { checkedIn: score.checkIn > 0, goalLogs: score.goalLogs }
  const active = habits.filter((h) => h.active)
  const goalPct = Math.min(1, Math.max(0, score.total / settings.dailyGoal))

  /** Save a new value and give feedback based on the change in points */
  async function apply(habit: Habit, value: number, pos: Pos, amount?: number) {
    const prev = byHabit.get(habit.id)
    const log = await setHabitLog(habit, date, value, amount)
    const next: HabitLog[] = [...dayLogs.filter((l) => l.habitId !== habit.id), ...(log ? [log] : [])]
    const after = scoreDay(date, next, extras, settings)
    const delta = (log?.points ?? 0) - (prev?.points ?? 0)
    const prevValue = prev?.value ?? 0

    if (value < 0 && value < prevValue) {
      // New slip
      if (habit.slipPoints) floatText(`${habit.slipPoints}`, pos.x, pos.y, '#fb7185')
      // Only reassure on the first slip; repeat slips just show the points
      if (value === -1) toast(!after.win && isToday ? `${pick(SLIP_MESSAGES)} You can still hit today's goal.` : pick(SLIP_MESSAGES))
      return
    }
    if (delta <= 0) return

    floatText(`+${delta * (score.bonus ? BONUS_MULTIPLIER : 1)}`, pos.x, pos.y)
    confetti(pos.x, pos.y, 16)
    if (habit.kind === 'avoid' && value >= 2) toast('💪 Urge resisted. That counts double.', 'good')
    if (habit.kind === 'target') toast(`🎯 ${habit.name} target reached!`, 'good')
    if (!score.win && after.win) {
      setTimeout(() => {
        confetti(window.innerWidth / 2, window.innerHeight / 3, 90)
        toast('Daily goal hit! 🎉', 'good')
      }, 250)
    }
  }

  function tap(habit: Habit, action: TapAction, e: MouseEvent) {
    const current = byHabit.get(habit.id)?.value ?? 0
    const value = nextValue(current, action, isRepeatable(habit))
    if (value === current) {
      toast(`That's the max for one day (${MAX_TAPS})`)
      return
    }
    apply(habit, value, posOf(e))
  }

  function setAmount(habit: Habit, amount: number, e?: MouseEvent) {
    const a = Math.max(0, Math.round(amount * 10) / 10)
    const reached = a >= (habit.target ?? Infinity) ? 1 : 0
    apply(habit, reached, posOf(e), a)
  }

  return (
    <div className="space-y-4">
      {/* Date switcher */}
      <div className="flex items-center justify-between">
        <button className="press rounded-full px-3 py-1 text-2xl text-slate-400" onClick={() => setPicked(addDays(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <button className="text-lg font-bold" onClick={() => setPicked(null)}>
          {prettyDay(date, today)}
          {!isToday && <span className="ml-2 text-xs font-medium text-emerald-400">back to today</span>}
        </button>
        <button
          className="press rounded-full px-3 py-1 text-2xl text-slate-400 disabled:opacity-20"
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
          ⚡ Bonus day! Positive habit points are doubled.
        </div>
      )}

      {!settings.welcomeDismissed && (
        <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/30">
          <p className="font-bold">Welcome to Mo Bheatha 👋</p>
          <p className="mt-1 text-emerald-200/80">
            Tap a habit when you do it. For things you're avoiding, tap ✓ when you've stuck to it and tap it again each time you
            resist an urge (💪 earns more). Tap ✗ if you slipped. Hit {settings.dailyGoal} points to keep your streak going.
          </p>
          <p className="mt-2 text-emerald-200/80">
            Log how you feel any time in the Feel tab, and set longer-term goals like weight in Goals. Change habits and points
            with ⚙️.
          </p>
          {!isStandalone() && (
            <p className="mt-2 text-emerald-200/80">
              📲 Add it to your Home Screen first ({isIOS() ? 'Safari → Share → Add to Home Screen' : 'browser menu → Install'}), so
              your data stays safe.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-full bg-emerald-500 px-4 py-1.5 font-bold text-emerald-950" onClick={() => updateSettings({ welcomeDismissed: true })}>
              Got it
            </button>
            {!settings.trackPain && (
              <button
                className="rounded-full bg-emerald-500/15 px-4 py-1.5 font-semibold text-emerald-200"
                onClick={() => {
                  updateSettings({ trackPain: true })
                  toast('Body map turned on in the Feel tab', 'good')
                }}
              >
                Dealing with pain? Track it
              </button>
            )}
          </div>
        </div>
      )}

      {/* Habits */}
      <section className="space-y-2.5">
        {active.map((h) => {
          const log = byHabit.get(h.id)
          if (h.kind === 'target')
            return <TargetCard key={h.id} habit={h} log={log} onOpen={() => setTargetFor(h)} onAdd={(e) => setAmount(h, (log?.amount ?? 0) + (h.step ?? 1), e)} />
          if (h.kind === 'avoid') return <AvoidCard key={h.id} habit={h} log={log} onTap={(a, e) => tap(h, a, e)} />
          return <DoCard key={h.id} habit={h} log={log} onTap={(a, e) => tap(h, a, e)} />
        })}
        {active.length === 0 && <p className="py-8 text-center text-slate-500">No habits yet. Add some with ⚙️.</p>}
      </section>

      {(score.checkIn > 0 || score.goalPoints > 0) && (
        <p className="text-center text-xs text-slate-500">
          {[score.checkIn > 0 && `+${score.checkIn} for checking in`, score.goalPoints > 0 && `+${score.goalPoints} for logging goals`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {targetFor && (
        <TargetSheet
          habit={targetFor}
          amount={byHabit.get(targetFor.id)?.amount ?? 0}
          onClose={() => setTargetFor(null)}
          onSave={(a) => {
            setAmount(targetFor, a)
            setTargetFor(null)
          }}
        />
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

const cardTone = (v: number) =>
  v > 0 ? 'bg-emerald-500/20 ring-emerald-400/60' : v < 0 ? 'bg-rose-500/15 ring-rose-400/50' : 'bg-slate-800/70 ring-slate-700/60'

function MinusButton({ onClick, label }: { onClick: (e: MouseEvent) => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700/80 text-lg font-bold text-slate-300"
    >
      −
    </button>
  )
}

interface TapProps {
  habit: Habit
  log?: HabitLog
  onTap: (a: TapAction, e: MouseEvent) => void
}

function DoCard({ habit, log, onTap }: TapProps) {
  const n = Math.max(0, log?.value ?? 0)
  const rep = isRepeatable(habit)
  const sub = !rep || n === 0 ? null : n === 1 ? 'Went big? Tap again' : `Extra effort ×${n}`
  return (
    <div className={`flex items-center gap-2 rounded-2xl pr-3 ring-1 transition-colors ${cardTone(n)}`}>
      <button onClick={(e) => onTap('yes', e)} className="press flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
        <span className="text-3xl">{habit.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-tight">{habit.name}</span>
          {sub && <span className="block text-xs text-slate-400">{sub}</span>}
        </span>
        <span className={`text-sm font-bold tabular-nums ${n ? 'text-emerald-300' : 'text-slate-500'}`}>+{habit.points * Math.max(1, n)}</span>
      </button>
      {rep && n > 0 && <MinusButton onClick={(e) => onTap('minus', e)} label={`Remove one: ${habit.name}`} />}
      <button
        onClick={(e) => onTap('yes', e)}
        aria-label={`Done: ${habit.name}`}
        className={`press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black ${
          n ? 'animate-pop bg-emerald-400 text-emerald-950' : 'bg-slate-700 text-transparent'
        }`}
      >
        {n <= 1 ? '✓' : `×${n}`}
      </button>
    </div>
  )
}

function AvoidCard({ habit, log, onTap }: TapProps) {
  const v = log?.value ?? 0
  const rep = isRepeatable(habit)
  const slip = habit.slipPoints
  const sub =
    v === 1 && rep
      ? 'Resisted an urge? Tap ✓ again'
      : v === 2
        ? '💪 Resisted an urge'
        : v >= 3
          ? '💪 Resisted strong urges'
          : v < 0
            ? `${-v} slip${v < -1 ? 's' : ''}`
            : null
  return (
    <div className={`flex items-center gap-2 rounded-2xl py-2.5 pl-4 pr-3 ring-1 transition-colors ${cardTone(v)}`}>
      <span className="text-3xl">{habit.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-tight">{habit.name}</span>
        {sub && <span className="block text-xs text-slate-400">{sub}</span>}
      </span>
      {rep && v !== 0 && <MinusButton onClick={(e) => onTap('minus', e)} label={`Remove one: ${habit.name}`} />}
      <button
        onClick={(e) => onTap('no', e)}
        className={`press flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-2 text-sm font-bold ${
          v < 0 ? 'animate-pop bg-rose-400 text-rose-950' : 'bg-slate-700 text-slate-400'
        }`}
        aria-label={`Slipped: ${habit.name}`}
      >
        {v < 0 ? `✗${v < -1 ? `×${-v}` : ''}${slip ? ` ${slip * -v}` : ''}` : `✗${slip ? ` ${slip}` : ''}`}
      </button>
      <button
        onClick={(e) => onTap('yes', e)}
        className={`press flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-2 text-sm font-bold ${
          v > 0 ? 'animate-pop bg-emerald-400 text-emerald-950' : 'bg-slate-700 text-slate-300'
        }`}
        aria-label={`Stuck to it: ${habit.name}`}
      >
        {v > 1 ? `${'💪'.repeat(v - 1)} +${habit.points * v}` : `✓ +${habit.points}`}
      </button>
    </div>
  )
}

function TargetCard({ habit, log, onOpen, onAdd }: { habit: Habit; log?: HabitLog; onOpen: () => void; onAdd: (e: MouseEvent) => void }) {
  const amount = log?.amount ?? 0
  const target = habit.target ?? 1
  const reached = amount >= target
  return (
    <div className={`flex items-center gap-2 rounded-2xl pr-3 ring-1 transition-colors ${cardTone(reached ? 1 : 0)}`}>
      <button onClick={onOpen} className="press flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
        <span className="text-3xl">{habit.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-semibold">{habit.name}</span>
            <span className={`text-sm font-bold tabular-nums ${reached ? 'text-emerald-300' : 'text-slate-500'}`}>+{habit.points}</span>
          </span>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-700">
            <span
              className={`block h-full rounded-full transition-all duration-500 ${reached ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(1, amount / target) * 100}%` }}
            />
          </span>
          <span className="mt-1 block text-xs tabular-nums text-slate-400">
            {formatAmount(amount)} / {formatAmount(target)} {habit.unit}
          </span>
        </span>
      </button>
      <button
        onClick={onAdd}
        className="press flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-slate-700 px-2 text-sm font-bold text-sky-300"
        aria-label={`Add ${habit.step ?? 1} ${habit.unit ?? ''}`}
      >
        +{formatAmount(habit.step ?? 1)}
      </button>
    </div>
  )
}

function TargetSheet({ habit, amount, onSave, onClose }: { habit: Habit; amount: number; onSave: (a: number) => void; onClose: () => void }) {
  const [v, setV] = useState(amount ? String(amount) : '')
  const n = parseNumber(v)
  const cur = Number.isFinite(n) ? n : 0
  const step = habit.step ?? 1
  const target = habit.target ?? 0
  const bump = (d: number) => setV(String(Math.max(0, Math.round((cur + d) * 10) / 10)))
  return (
    <Sheet title={`${habit.emoji} ${habit.name}`} onClose={onClose} action={{ label: 'Save', onClick: () => onSave(cur) }}>
      <div className="space-y-4">
        <NumberField value={v} onChange={setV} placeholder="0" decimal={step < 1} big />
        <p className="text-center text-sm text-slate-400">
          Target: {formatAmount(target)} {habit.unit} · {cur >= target ? '🎯 reached' : `${formatAmount(Math.max(0, target - cur))} to go`}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => bump(-step)} className="press rounded-xl bg-slate-800 py-3 font-bold">
            −{formatAmount(step)}
          </button>
          <button onClick={() => bump(step)} className="press rounded-xl bg-slate-800 py-3 font-bold">
            +{formatAmount(step)}
          </button>
          <button onClick={() => setV(String(target))} className="press rounded-xl bg-emerald-500/20 py-3 font-bold text-emerald-300">
            Hit it 🎯
          </button>
        </div>
        {amount > 0 && (
          <button onClick={() => onSave(0)} className="w-full py-2 text-sm font-semibold text-rose-400">
            Clear today
          </button>
        )}
      </div>
    </Sheet>
  )
}
