import { useEffect, useRef, useState, type ReactNode } from 'react'
import HabitEditor from '../components/HabitEditor'
import { useHabits, useSettings } from '../data/hooks'
import { exportAll, importAll, moveHabit, requestPersistence, resetAll, setHabitActive, updateSettings } from '../data/repo'
import type { Habit } from '../data/types'
import { dayKey } from '../lib/dates'
import { isIOS, isStandalone } from '../lib/pwa'
import { toast } from '../lib/toast'

export default function SettingsScreen() {
  const habits = useHabits()
  const settings = useSettings()
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined) // undefined = closed, null = new
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  if (!habits || !settings) return null
  const active = habits.filter((h) => h.active)
  const archived = habits.filter((h) => !h.active)

  async function doExport() {
    const data = await exportAll()
    const name = `mo-bheatha-backup-${dayKey()}.json`
    const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' })
    // iOS: the share sheet lets you save to Files, AirDrop or email it
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Mo Bheatha backup' })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function doImport(f: File) {
    try {
      const data = JSON.parse(await f.text())
      if (!confirm('Replace ALL current data with this backup?')) return
      await importAll(data)
      toast('Backup restored ✓', 'good')
    } catch (e) {
      toast((e as Error).message || 'Import failed', 'bad')
    }
  }

  async function doReset() {
    if (!confirm('Delete all habits, logs and settings? This cannot be undone.')) return
    if (!confirm('Really sure? Consider exporting a backup first.')) return
    await resetAll()
    toast('Everything reset')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">Settings</h1>

      {!isStandalone() && (
        <div className="rounded-2xl bg-sky-500/10 p-4 text-sm text-sky-100 ring-1 ring-sky-500/30">
          <p className="font-bold">📲 Install the app</p>
          <p className="mt-1 text-sky-200/80">
            {isIOS()
              ? 'In Safari, tap Share, then "Add to Home Screen". '
              : 'Use your browser menu: "Install app" or "Add to Home screen". '}
            This makes it work like a normal app and stops Safari deleting your data if you don't open it for a while.
          </p>
        </div>
      )}

      <Section title="Habits">
        <ul className="space-y-2">
          {active.map((h, i) => (
            <li key={h.id} className="flex items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-3 ring-1 ring-slate-800">
              <button onClick={() => setEditing(h)} className="flex flex-1 items-center gap-3 text-left">
                <span className="text-2xl">{h.emoji}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{h.name}</span>
                  <span className="text-xs text-slate-500">
                    {h.kind === 'do' ? 'Do' : 'Avoid'} · +{h.points}
                    {h.kind === 'avoid' && h.slipPoints ? ` / ${h.slipPoints}` : ''}
                  </span>
                </span>
              </button>
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => moveHabit(h.id, -1)} className="px-2 text-slate-400 disabled:opacity-20" aria-label="Move up">
                  ▲
                </button>
                <button
                  disabled={i === active.length - 1}
                  onClick={() => moveHabit(h.id, 1)}
                  className="px-2 text-slate-400 disabled:opacity-20"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button onClick={() => setEditing(null)} className="press mt-2 w-full rounded-2xl border border-dashed border-slate-700 py-3 font-semibold text-emerald-400">
          + Add habit
        </button>
        {archived.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="text-slate-500">Archived ({archived.length})</summary>
            <ul className="mt-2 space-y-1">
              {archived.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
                  <span>
                    {h.emoji} {h.name}
                  </span>
                  <button onClick={() => setHabitActive(h.id, true)} className="font-semibold text-emerald-400">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section title="Scoring">
        <div className="grid grid-cols-2 gap-3">
          <NumberSetting label="Daily goal" value={settings.dailyGoal} onSave={(v) => updateSettings({ dailyGoal: Math.max(1, v) })} />
          <NumberSetting label="Check-in points" value={settings.checkInPoints} onSave={(v) => updateSettings({ checkInPoints: Math.max(0, v) })} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Reach your daily goal to keep your streak. Every 7 goal days earns a ❄️ freeze (max 2), which covers a missed day
          automatically. About 1 day in 7 is a surprise ⚡ bonus day with double points. Slips lower that day's score but never
          your level.
        </p>
      </Section>

      <Section title="Feel tags">
        <TagEditor tags={settings.feelTags} onSave={(feelTags) => updateSettings({ feelTags })} />
      </Section>

      <Section title="Your data">
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Your data is stored only on this device and is never uploaded anywhere. Export a backup now and then, especially
          before changing phones.
          {persisted === true && ' ✓ Storage is protected from automatic clean-up.'}
        </p>
        {persisted === false && (
          <button
            onClick={async () => {
              const ok = await requestPersistence()
              setPersisted(ok)
              toast(ok ? 'Storage protected ✓' : "Your browser didn't allow it. Export backups to be safe.", ok ? 'good' : 'neutral')
            }}
            className="press mb-2 w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold"
          >
            🛡️ Protect data on this device
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={doExport} className="press rounded-xl bg-slate-800 py-3 font-semibold">
            ⬆️ Export
          </button>
          <button onClick={() => fileRef.current?.click()} className="press rounded-xl bg-slate-800 py-3 font-semibold">
            ⬇️ Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
        <button onClick={doReset} className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-rose-400">
          Reset everything
        </button>
      </Section>

      <p className="pb-4 text-center text-xs text-slate-600">Mo Bheatha · v{__APP_VERSION__}</p>

      {editing !== undefined && <HabitEditor habit={editing} onClose={() => setEditing(undefined)} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

function NumberSetting({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(value)), [value])
  return (
    <label className="block rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = Number(v)
          if (Number.isFinite(n) && n !== value) onSave(Math.round(n))
          else setV(String(value))
        }}
        className="block w-full bg-transparent text-2xl font-black outline-none"
      />
    </label>
  )
}

function TagEditor({ tags, onSave }: { tags: string[]; onSave: (t: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (t && !tags.includes(t)) onSave([...tags, t])
    setDraft('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-slate-800 py-1 pl-3 pr-1 text-sm">
            {t}
            <button onClick={() => onSave(tags.filter((x) => x !== t))} className="px-1.5 text-slate-500" aria-label={`Remove ${t}`}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a tag, e.g. Headache"
          className="flex-1 rounded-xl bg-slate-900 px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-emerald-400"
        />
        <button className="rounded-xl bg-slate-800 px-4 font-semibold">Add</button>
      </form>
    </div>
  )
}
