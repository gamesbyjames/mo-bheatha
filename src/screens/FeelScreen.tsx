import { useState } from 'react'
import BodyMap from '../components/BodyMap'
import { useFeelLogs, useSettings, useToday } from '../data/hooks'
import { addFeelLog, deleteFeelLog, updateSettings } from '../data/repo'
import type { PainMap } from '../data/types'
import { describePain, expandLegacy, PAIN_COLORS, PAIN_LABELS, REGION_LABELS } from '../lib/body'
import { timeOf } from '../lib/dates'
import { confetti } from '../lib/fx'
import { toast } from '../lib/toast'
import { MOODS, moodFace } from '../lib/mood'

export default function FeelScreen() {
  const settings = useSettings()
  const logs = useFeelLogs()
  const today = useToday()
  const [mood, setMood] = useState<number | null>(null)
  const [pain, setPain] = useState<PainMap>({})
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  if (!settings || !logs) return null
  const view = settings.bodyView
  const trackPain = settings.trackPain
  const todays = logs.filter((l) => l.date === today).reverse()
  const lastWithPain = [...logs].reverse().find((l) => Object.keys(l.pain).length > 0)
  const hasInput = mood !== null || Object.keys(pain).length > 0 || tags.length > 0

  const cycle = (id: string) =>
    setPain((p) => {
      const next = ((p[id] ?? 0) + 1) % 4
      const copy = { ...p }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })

  const toggleTag = (t: string) => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))

  async function save() {
    if (!hasInput || saving) return
    setSaving(true)
    const first = todays.length === 0
    await addFeelLog({ mood, pain: trackPain ? pain : {}, tags })
    setMood(null)
    setPain({})
    setTags([])
    setSaving(false)
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    if (first && settings!.checkInPoints > 0) {
      confetti(window.innerWidth / 2, window.innerHeight - 120, 30)
      toast(`Logged ✓  +${settings!.checkInPoints} check-in points`, 'good')
    } else {
      toast('Logged ✓', 'good')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">How are you right now?</h1>

      {/* Mood */}
      <section>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.v}
              onClick={() => setMood(mood === m.v ? null : m.v)}
              className={`press flex flex-col items-center rounded-2xl py-2 ring-1 ${
                mood === m.v ? 'animate-pop bg-emerald-500/20 ring-emerald-400' : 'bg-slate-800/70 ring-slate-700/60'
              }`}
            >
              <span className={`text-4xl ${mood && mood !== m.v ? 'opacity-40' : ''}`}>{m.face}</span>
              <span className="text-[11px] font-semibold text-slate-400">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tags */}
      <section>
        <div className="flex flex-wrap gap-2">
          {settings.feelTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`press rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ${
                tags.includes(t) ? 'bg-sky-500/25 text-sky-200 ring-sky-400' : 'bg-slate-800/70 text-slate-300 ring-slate-700/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Body */}
      {trackPain && (
      <section className="rounded-3xl bg-slate-900 p-3 ring-1 ring-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex rounded-full bg-slate-800 p-1 text-sm font-semibold">
            {(['front', 'back'] as const).map((v) => (
              <button
                key={v}
                onClick={() => updateSettings({ bodyView: v })}
                className={`rounded-full px-4 py-1.5 capitalize ${view === v ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {lastWithPain && Object.keys(pain).length === 0 && (
            <button onClick={() => setPain(expandLegacy(lastWithPain.pain))} className="press rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
              ↺ Same as last
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Tap where it hurts. Tap again for worse.</p>
        <BodyMap view={view} values={pain} onTap={cycle} className="mx-auto mt-1 h-[22rem] w-full" />
        <div className="mt-2 flex justify-center gap-3 text-[11px] text-slate-400">
          {PAIN_LABELS.slice(1).map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAIN_COLORS[i + 1] }} />
              {l}
            </span>
          ))}
        </div>
        {Object.keys(pain).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(pain).map(([id, v]) => (
              <button
                key={id}
                onClick={() => cycle(id)}
                className="press rounded-full px-3 py-1 text-xs font-bold text-slate-950"
                style={{ background: PAIN_COLORS[v] }}
              >
                {REGION_LABELS[id]} · {PAIN_LABELS[v]}
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent px-4 pb-2 pt-4">
        <button
          onClick={save}
          disabled={!hasInput || saving}
          className="press w-full rounded-2xl bg-emerald-500 py-4 text-lg font-black text-emerald-950 shadow-lg disabled:bg-slate-800 disabled:text-slate-600"
        >
          Log it
        </button>
      </div>

      {/* Today's entries */}
      {todays.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Today</h2>
          <ul className="space-y-2">
            {todays.map((l) => (
              <li key={l.id} className="flex items-start gap-3 rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
                <span className="text-2xl">{moodFace(l.mood)}</span>
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-slate-300">{timeOf(l.ts)}</div>
                  <div className="text-slate-400">
                    {[
                      ...describePain(l.pain),
                      ...l.tags,
                    ].join(' · ') || 'Mood only'}
                  </div>
                </div>
                <button
                  onClick={() => confirm('Delete this entry?') && deleteFeelLog(l.id)}
                  className="px-2 text-slate-600"
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!trackPain && (
        <button
          onClick={() => {
            updateSettings({ trackPain: true })
            toast('Body map turned on. Turn it off any time in ⚙️', 'good')
          }}
          className="block w-full py-2 text-center text-xs font-semibold text-slate-500"
        >
          Dealing with pain? Track it with a body map
        </button>
      )}
    </div>
  )
}
