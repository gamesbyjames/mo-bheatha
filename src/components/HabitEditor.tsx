import { useState, type ReactNode } from 'react'
import { saveHabit, setHabitActive } from '../data/repo'
import type { Habit, HabitKind } from '../data/types'
import { EMOJI_PALETTE } from '../data/defaults'

interface Props {
  habit: Habit | null // null = new habit
  onClose: () => void
}

export default function HabitEditor({ habit, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '⭐')
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'do')
  const [points, setPoints] = useState(String(habit?.points ?? 10))
  const [slip, setSlip] = useState(String(Math.abs(habit?.slipPoints ?? 5)))

  async function save() {
    if (!name.trim()) return
    await saveHabit({
      ...(habit ?? {}),
      name: name.trim(),
      emoji: emoji.trim() || '⭐',
      kind,
      points: Math.max(0, Number(points) || 0),
      slipPoints: kind === 'avoid' ? -Math.abs(Number(slip) || 0) : 0,
      active: habit?.active ?? true,
    })
    onClose()
  }

  async function archive() {
    if (!habit) return
    await setHabitActive(habit.id, false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="animate-sheet pb-safe max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-900 p-5 ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onClose} className="text-slate-400">
            Cancel
          </button>
          <h2 className="font-bold">{habit ? 'Edit habit' : 'New habit'}</h2>
          <button onClick={save} disabled={!name.trim()} className="font-bold text-emerald-400 disabled:text-slate-600">
            Save
          </button>
        </div>

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
              placeholder={kind === 'do' ? 'e.g. Go for a walk' : 'e.g. No sugary snacks'}
              className="flex-1 rounded-xl bg-slate-800 p-3 font-semibold outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
              autoFocus={!habit}
            />
          </div>

          <div className="grid grid-cols-8 gap-1">
            {EMOJI_PALETTE.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className={`rounded-lg py-1.5 text-xl ${emoji === e ? 'bg-slate-700' : ''}`}>
                {e}
              </button>
            ))}
          </div>

          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <KindButton active={kind === 'do'} onClick={() => setKind('do')} title="Do it" sub="Tap when you've done it" />
              <KindButton active={kind === 'avoid'} onClick={() => setKind('avoid')} title="Avoid it" sub="✓ stuck to it, ✗ slipped" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{kind === 'do' ? 'Points when done' : 'Points for sticking to it'}</Label>
              <NumberInput value={points} onChange={setPoints} prefix="+" />
            </div>
            {kind === 'avoid' && (
              <div>
                <Label>Points lost for a slip</Label>
                <NumberInput value={slip} onChange={setSlip} prefix="−" />
              </div>
            )}
          </div>
          {kind === 'avoid' && (
            <p className="text-xs text-slate-500">
              Tip: keep slip penalties small (or 0). Big penalties make it tempting to write the whole day off after one slip.
            </p>
          )}

          {habit && habit.active && (
            <button onClick={archive} className="w-full rounded-xl bg-rose-500/10 py-3 font-semibold text-rose-400">
              Archive habit
            </button>
          )}
          {habit && <p className="text-center text-xs text-slate-500">Archiving keeps its history. You can restore it from Settings.</p>}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</div>
}

function KindButton({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={`rounded-xl p-3 text-left ring-1 ${active ? 'bg-emerald-500/15 ring-emerald-400' : 'bg-slate-800 ring-slate-700'}`}>
      <div className="font-bold">{title}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </button>
  )
}

function NumberInput({ value, onChange, prefix }: { value: string; onChange: (v: string) => void; prefix: string }) {
  return (
    <div className="flex items-center rounded-xl bg-slate-800 ring-1 ring-slate-700 focus-within:ring-emerald-400">
      <span className="pl-3 font-bold text-slate-500">{prefix}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent p-3 font-bold outline-none"
      />
    </div>
  )
}
