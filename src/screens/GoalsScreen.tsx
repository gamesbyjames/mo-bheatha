import { useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import Sheet, { Label, NumberField } from '../components/Sheet'
import { useGoalEntries, useGoals, useToday } from '../data/hooks'
import { addGoalEntry, deleteGoalEntry, saveGoal, setGoalActive } from '../data/repo'
import type { Goal, GoalEntry } from '../data/types'
import { parseKey, prettyDay, shortDay, timeOf, type DayKey } from '../lib/dates'
import { formatGoalValue, GOAL_TEMPLATES, goalStatus, parseNumber, type GoalStatus } from '../lib/goals'
import { GOAL_LOG_POINTS, MILESTONE_XP } from '../lib/scoring'
import { confetti } from '../lib/fx'
import { toast } from '../lib/toast'

type Editing = { goal: Goal | null; template?: (typeof GOAL_TEMPLATES)[number] }

export default function GoalsScreen() {
  const goals = useGoals()
  const entries = useGoalEntries()
  const today = useToday()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [picking, setPicking] = useState(false)
  const [logging, setLogging] = useState<Goal | null>(null)

  if (!goals || !entries) return null
  const active = goals.filter((g) => g.active)
  const archived = goals.filter((g) => !g.active)

  async function log(goal: Goal, value: number) {
    setLogging(null)
    const res = await addGoalEntry(goal.id, value)
    if (res.newMilestones > 0) {
      confetti(window.innerWidth / 2, window.innerHeight / 3, 90)
      toast(
        res.milestone >= 10
          ? `🏆 ${goal.name} goal reached! +${res.newMilestones * MILESTONE_XP} XP`
          : `🎉 ${res.milestone * 10}% of the way there! +${res.newMilestones * MILESTONE_XP} XP`,
        'good',
        3500,
      )
    } else if (res.firstToday) {
      toast(`Logged ✓  +${GOAL_LOG_POINTS} points`, 'good')
    } else {
      toast('Logged ✓', 'good')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Goals</h1>
        {active.length > 0 && (
          <button onClick={() => setPicking(true)} className="press rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-emerald-400">
            + New goal
          </button>
        )}
      </div>

      {active.length === 0 && (
        <div className="rounded-3xl bg-slate-900 p-5 text-center ring-1 ring-slate-800">
          <div className="text-4xl">🎯</div>
          <p className="mt-2 font-bold">Set your first goal</p>
          <p className="mt-1 text-sm text-slate-400">
            Track something longer-term, like weight or waist size. Log it now and then and watch the trend. Every 10% of the way
            earns +{MILESTONE_XP} XP.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map((t) => (
              <button
                key={t.name || 'custom'}
                onClick={() => setEditing({ goal: null, template: t })}
                className="press rounded-2xl bg-slate-800 p-3 font-semibold ring-1 ring-slate-700"
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="block text-sm">{t.name || 'Custom'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          entries={entries.filter((e) => e.goalId === g.id)}
          status={goalStatus(g, entries, today)}
          today={today}
          onLog={() => setLogging(g)}
          onEdit={() => setEditing({ goal: g })}
        />
      ))}

      {archived.length > 0 && (
        <details className="text-sm">
          <summary className="text-slate-500">Archived ({archived.length})</summary>
          <ul className="mt-2 space-y-1">
            {archived.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
                <span>
                  {g.emoji} {g.name}
                </span>
                <button onClick={() => setGoalActive(g.id, true)} className="font-semibold text-emerald-400">
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {picking && (
        <Sheet title="New goal" onClose={() => setPicking(false)}>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map((t) => (
              <button
                key={t.name || 'custom'}
                onClick={() => {
                  setPicking(false)
                  setEditing({ goal: null, template: t })
                }}
                className="press rounded-2xl bg-slate-800 p-4 font-semibold ring-1 ring-slate-700"
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="block">{t.name || 'Custom'}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {editing && <GoalEditor {...editing} onClose={() => setEditing(null)} />}

      {logging && (
        <LogSheet
          goal={logging}
          last={entries.filter((e) => e.goalId === logging.id).at(-1)?.value ?? logging.start}
          onClose={() => setLogging(null)}
          onSave={(v) => log(logging, v)}
        />
      )}
    </div>
  )
}

function GoalCard({
  goal,
  entries,
  status,
  today,
  onLog,
  onEdit,
}: {
  goal: Goal
  entries: GoalEntry[]
  status: GoalStatus
  today: DayKey
  onLog: () => void
  onEdit: () => void
}) {
  const fmt = (v: number) => formatGoalValue(v, goal.step)
  const down = goal.target < goal.start
  const loggedToday = entries.some((e) => e.date === today)
  const chart = status.series.map((p) => ({ date: shortDay(p.date), value: p.value, trend: Number(fmt(p.trend)) }))
  const change = status.trend != null ? status.trend - goal.start : null
  const toGo = status.trend != null ? Math.abs(goal.target - status.trend) : Math.abs(goal.target - goal.start)
  const done = status.progress >= 1

  // Y axis range that always includes start and target
  const values = [goal.start, goal.target, ...status.series.map((p) => p.value)]
  const pad = Math.max(goal.step, (Math.max(...values) - Math.min(...values)) * 0.1)
  const domain = [Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)]

  return (
    <section className="rounded-3xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="flex items-start gap-3">
        <button onClick={onEdit} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className="text-3xl">{goal.emoji}</span>
          <span className="min-w-0">
            <span className="block font-bold">{goal.name}</span>
            <span className="block text-xs text-slate-400">
              {fmt(goal.start)} → {fmt(goal.target)} {goal.unit}
              {goal.targetDate && ` by ${parseKey(goal.targetDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </span>
          </span>
        </button>
        <button onClick={onLog} className="press shrink-0 rounded-xl bg-emerald-500 px-4 py-2 font-black text-emerald-950">
          Log
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">7-day trend</div>
          <div className="text-3xl font-black tabular-nums">
            {status.trend != null ? fmt(status.trend) : '–'}
            <span className="text-base font-bold text-slate-500"> {goal.unit}</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          {change != null && (
            <div className={(down ? change < 0 : change > 0) ? 'font-semibold text-emerald-400' : ''}>
              {change > 0 ? '+' : change < 0 ? '−' : ''}
              {fmt(Math.abs(change))} {goal.unit} so far
            </div>
          )}
          <div>{done ? '🏆 Target reached' : `${fmt(toGo)} ${goal.unit} to go`}</div>
          {status.latest != null && !loggedToday && <div className="text-slate-500">Not logged today</div>}
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${status.progress * 100}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          <span className="tracking-tight text-amber-400">{'★'.repeat(goal.milestone)}</span>
          <span className="tracking-tight">{'☆'.repeat(10 - goal.milestone)}</span>
        </span>
        <span>
          {goal.milestone}/10 milestones · +{MILESTONE_XP} XP each
        </span>
      </div>

      {status.onTrack != null && !done && (
        <p className={`mt-2 text-sm font-semibold ${status.onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
          {status.onTrack ? '✓ On track' : `Slightly behind: aim for about ${fmt(status.expectedValue!)} ${goal.unit} by now`}
        </p>
      )}

      {chart.length >= 2 ? (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis domain={domain} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v: number) => String(Math.round(v))} width={32} tickCount={5} allowDecimals={false} />
              <ReferenceLine y={goal.target} stroke="#34d399" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
              <Scatter dataKey="value" fill="#64748b" name="Logged" />
              <Line dataKey="trend" stroke="#34d399" strokeWidth={2.5} dot={false} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[11px] text-slate-500">
            <span>● logged</span>
            <span className="text-emerald-400">━ 7-day trend</span>
            <span className="text-emerald-400">┄ target</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500">Log a couple of times to see your trend chart.</p>
      )}

      {entries.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="text-xs text-slate-500">History</summary>
          <ul className="mt-2 space-y-1">
            {[...entries]
              .reverse()
              .slice(0, 20)
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-1.5">
                  <span className="text-slate-400">
                    {prettyDay(e.date, today)} · {timeOf(e.ts)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {fmt(e.value)} {goal.unit}
                    </span>
                    <button onClick={() => confirm('Delete this entry?') && deleteGoalEntry(e.id)} className="px-1 text-slate-600" aria-label="Delete entry">
                      ✕
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function LogSheet({ goal, last, onSave, onClose }: { goal: Goal; last: number; onSave: (v: number) => void; onClose: () => void }) {
  const fmt = (v: number) => formatGoalValue(v, goal.step)
  const [v, setV] = useState(fmt(last))
  const n = parseNumber(v)
  const ok = Number.isFinite(n) && n > 0
  const bump = (d: number) => setV(fmt(Math.max(0, (ok ? n : last) + d)))
  return (
    <Sheet title={`${goal.emoji} ${goal.name}`} onClose={onClose} action={{ label: 'Save', onClick: () => ok && onSave(n), disabled: !ok }}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => bump(-goal.step)} className="press h-16 w-16 shrink-0 rounded-2xl bg-slate-800 text-2xl font-black">
            −
          </button>
          <NumberField value={v} onChange={setV} suffix={goal.unit} decimal={goal.step < 1} big />
          <button onClick={() => bump(goal.step)} className="press h-16 w-16 shrink-0 rounded-2xl bg-slate-800 text-2xl font-black">
            +
          </button>
        </div>
        <p className="text-center text-xs text-slate-500">
          Last: {fmt(last)} {goal.unit}. Day-to-day changes are normal; the 7-day trend is what counts.
        </p>
        <button
          onClick={() => ok && onSave(n)}
          disabled={!ok}
          className="press w-full rounded-2xl bg-emerald-500 py-4 text-lg font-black text-emerald-950 disabled:bg-slate-800 disabled:text-slate-600"
        >
          Log it
        </button>
      </div>
    </Sheet>
  )
}

function GoalEditor({ goal, template, onClose }: Editing & { onClose: () => void }) {
  const t = template ?? GOAL_TEMPLATES[3]
  const [name, setName] = useState(goal?.name ?? t.name)
  const [emoji, setEmoji] = useState(goal?.emoji ?? t.emoji)
  const [unit, setUnit] = useState(goal?.unit ?? t.unit)
  const [step, setStep] = useState(String(goal?.step ?? t.step))
  const [start, setStart] = useState(goal ? String(goal.start) : '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [date, setDate] = useState(goal?.targetDate ?? '')

  const s = parseNumber(start)
  const tg = parseNumber(target)
  const st = parseNumber(step)
  const valid = name.trim() && Number.isFinite(s) && Number.isFinite(tg) && s !== tg && Number.isFinite(st) && st > 0

  async function save() {
    if (!valid) return
    await saveGoal({
      ...(goal ?? {}),
      name: name.trim(),
      emoji: emoji.trim() || '🎯',
      unit: unit.trim(),
      step: st,
      start: s,
      target: tg,
      targetDate: date || null,
      active: goal?.active ?? true,
    })
    if (!goal) toast('Goal set. Log it whenever you measure.', 'good')
    onClose()
  }

  return (
    <Sheet title={goal ? 'Edit goal' : 'New goal'} onClose={onClose} action={{ label: 'Save', onClick: save, disabled: !valid }}>
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-16 rounded-xl bg-slate-800 p-3 text-center text-2xl outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
            aria-label="Emoji"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Body fat"
            className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3 font-semibold outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start (now)</Label>
            <NumberField value={start} onChange={setStart} suffix={unit} decimal placeholder="90" />
          </div>
          <div>
            <Label>Target</Label>
            <NumberField value={target} onChange={setTarget} suffix={unit} decimal placeholder="82" />
          </div>
          <div>
            <Label>Unit</Label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg"
              className="w-full rounded-xl bg-slate-800 p-3 font-bold outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
            />
          </div>
          <div>
            <Label>± step</Label>
            <NumberField value={step} onChange={setStep} decimal />
          </div>
        </div>
        <div>
          <Label>Target date (optional)</Label>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3 font-semibold text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
            />
            {date && (
              <button onClick={() => setDate('')} className="rounded-xl bg-slate-800 px-3 text-sm text-slate-400">
                Clear
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            With a date, the card shows whether you're on track. For weight, about 0.5 kg (1 lb) a week is a sustainable pace.
          </p>
        </div>
        {goal && goal.active && (
          <button
            onClick={async () => {
              await setGoalActive(goal.id, false)
              onClose()
            }}
            className="w-full rounded-xl bg-rose-500/10 py-3 font-semibold text-rose-400"
          >
            Archive goal
          </button>
        )}
      </div>
    </Sheet>
  )
}
