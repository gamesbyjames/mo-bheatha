import { useMemo, useState, type ReactNode } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import BodyMap from '../components/BodyMap'
import { useHabits, useProgress } from '../data/hooks'
import { addDays, rangeDays, shortDay } from '../lib/dates'
import { dailyFeel, habitImpact, painHeat, type Impact } from '../lib/insights'
import { moodFace } from '../lib/mood'

const RANGES = [7, 30, 90] as const
const MIN_SAMPLES = 3

export default function InsightsScreen() {
  const data = useProgress()
  const habits = useHabits()
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [offset, setOffset] = useState<0 | 1>(0)

  const computed = useMemo(() => {
    if (!data || !habits) return null
    const { scores, feelLogs, habitLogs, today } = data
    const dates = rangeDays(addDays(today, -(range - 1)), today)
    const inRange = new Set(dates)
    const feel = dailyFeel(feelLogs)
    const feelInRange = feelLogs.filter((l) => inRange.has(l.date))

    const chart = dates.map((d) => ({
      date: shortDay(d),
      points: scores.get(d)?.total ?? 0,
      mood: feel.get(d)?.mood ?? null,
      pain: feel.has(d) ? Number(feel.get(d)!.pain.toFixed(1)) : null,
    }))

    const moods = chart.map((c) => c.mood).filter((m): m is number => m != null)
    const pains = chart.map((c) => c.pain).filter((p): p is number => p != null)
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

    const impacts = habits
      .filter((h) => h.active)
      .map((h) => ({ habit: h, impact: habitImpact(h.id, offset ? dates.slice(0, -1) : dates, habitLogs, feel, offset) }))

    return {
      chart,
      impacts,
      heat: painHeat(feelInRange),
      avgMood: avg(moods),
      avgPain: avg(pains),
      wins: dates.filter((d) => scores.get(d)?.win).length,
      logCount: feelInRange.length,
    }
  }, [data, habits, range, offset])

  if (!data || !computed) return null
  const { progress } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Insights</h1>
        <div className="flex rounded-full bg-slate-800 p-1 text-sm font-semibold">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 ${range === r ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Level" value={`${progress.level.level}`} sub={`${progress.xp} XP`} />
        <Tile label="Streak" value={`🔥${progress.streak}`} sub={`best ${progress.bestStreak}`} />
        <Tile label="Goal days" value={`${computed.wins}`} sub={`of ${range}`} />
        <Tile label="Avg mood" value={computed.avgMood ? moodFace(computed.avgMood) : '–'} sub={computed.avgMood?.toFixed(1) ?? 'no data'} />
        <Tile label="Avg pain" value={computed.avgPain?.toFixed(1) ?? '–'} sub="per check-in" />
        <Tile label="Check-ins" value={`${computed.logCount}`} sub={`in ${range}d`} />
      </div>

      <Card title="Points per day">
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={computed.chart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <ReferenceLine y={data.settings.dailyGoal} stroke="#34d399" strokeDasharray="4 4" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="points" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Mood and pain">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={computed.chart} margin={{ top: 5, right: -20, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis yAxisId="pain" tick={{ fill: '#f87171', fontSize: 10 }} allowDecimals={false} />
            <YAxis yAxisId="mood" orientation="right" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#34d399', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line yAxisId="mood" dataKey="mood" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
            <Line yAxisId="pain" dataKey="pain" stroke="#f87171" strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-1 flex justify-center gap-4 text-xs">
          <span className="text-emerald-400">● Mood (1–5)</span>
          <span className="text-red-400">● Pain score</span>
        </div>
      </Card>

      <Card
        title="What helps?"
        action={
          <div className="flex rounded-full bg-slate-800 p-0.5 text-[11px] font-semibold">
            {(['Same day', 'Next day'] as const).map((l, i) => (
              <button key={l} onClick={() => setOffset(i as 0 | 1)} className={`rounded-full px-2.5 py-1 ${offset === i ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
                {l}
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          How you felt {offset ? 'the day after' : 'on days'} you did each habit, compared with {offset ? 'the day after' : 'days'} you didn't.
          This shows a pattern, not proof of cause.
        </p>
        <ul className="space-y-2">
          {computed.impacts.map(({ habit, impact }) => (
            <ImpactRow key={habit.id} emoji={habit.emoji} name={habit.name} impact={impact} />
          ))}
        </ul>
      </Card>

      <Card title={`Where it hurt (last ${range} days)`}>
        {computed.logCount === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No check-ins yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(['front', 'back'] as const).map((v) => (
              <div key={v}>
                <BodyMap view={v} heat={computed.heat} className="mx-auto h-64 w-full" />
                <div className="text-center text-xs capitalize text-slate-500">{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-black">{value}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Delta({ label, a, b, higherIsBetter }: { label: string; a: number | null; b: number | null; higherIsBetter: boolean }) {
  if (a == null || b == null) return <span className="text-slate-600">{label} –</span>
  const diff = a - b
  const good = Math.abs(diff) < 0.05 ? null : higherIsBetter ? diff > 0 : diff < 0
  const color = good == null ? 'text-slate-400' : good ? 'text-emerald-400' : 'text-rose-400'
  return (
    <span className={color}>
      {label} {a.toFixed(1)} vs {b.toFixed(1)}
    </span>
  )
}

function ImpactRow({ emoji, name, impact }: { emoji: string; name: string; impact: Impact }) {
  const enough = impact.nWith >= MIN_SAMPLES && impact.nWithout >= MIN_SAMPLES
  return (
    <li className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-2.5">
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 text-sm">
        <div className="font-semibold">{name}</div>
        {enough ? (
          <div className="flex flex-wrap gap-x-3 text-xs">
            <Delta label="Mood" a={impact.moodWith} b={impact.moodWithout} higherIsBetter />
            <Delta label="Pain" a={impact.painWith} b={impact.painWithout} higherIsBetter={false} />
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Need more data ({impact.nWith} with, {impact.nWithout} without, {MIN_SAMPLES}+ each)
          </div>
        )}
      </div>
    </li>
  )
}
