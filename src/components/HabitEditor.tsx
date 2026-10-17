import { useState } from 'react'
import Sheet, { Label, NumberField, Toggle } from './Sheet'
import { saveHabit, setHabitActive } from '../data/repo'
import type { Habit, HabitKind } from '../data/types'
import { EMOJI_PALETTE, SUGGESTED_HABITS, type HabitTemplate } from '../data/defaults'
import { formatAmount, MAX_TAPS } from '../lib/habits'
import { parseNumber } from '../lib/goals'
import { toast } from '../lib/toast'

interface Props {
  habit: Habit | null // null = new habit
  existingNames: string[]
  onClose: () => void
}

const KINDS: Array<{ id: HabitKind; title: string; sub: string }> = [
  { id: 'do', title: 'Do it', sub: 'Tap when done' },
  { id: 'avoid', title: 'Avoid it', sub: '✓ kept, ✗ slipped' },
  { id: 'target', title: 'Target', sub: 'Reach a number' },
]

const num = (s: string, fallback = 0) => {
  const n = parseNumber(s)
  return Number.isFinite(n) ? n : fallback
}

export default function HabitEditor({ habit, existingNames, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '⭐')
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'do')
  const [points, setPoints] = useState(String(habit?.points ?? 10))
  const [slip, setSlip] = useState(String(Math.abs(habit?.slipPoints ?? 5)))
  const [repeatable, setRepeatable] = useState<boolean | null>(habit ? habit.repeatable !== false : null)
  const [target, setTarget] = useState(String(habit?.target ?? ''))
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [step, setStep] = useState(String(habit?.step ?? 1))

  // New habits: repeat taps default on for "avoid", off for "do"
  const rep = repeatable ?? kind === 'avoid'
  const valid = name.trim() && (kind !== 'target' || num(target) > 0)

  async function save() {
    if (!valid) return
    await saveHabit({
      ...(habit ?? {}),
      name: name.trim(),
      emoji: emoji.trim() || '⭐',
      kind,
      points: Math.max(0, Math.round(num(points))),
      slipPoints: kind === 'avoid' ? -Math.abs(Math.round(num(slip))) : 0,
      repeatable: kind === 'target' ? false : rep,
      ...(kind === 'target' ? { target: num(target), unit: unit.trim(), step: Math.max(0.1, num(step, 1)) } : {}),
      active: habit?.active ?? true,
    })
    onClose()
  }

  async function addSuggestion(t: HabitTemplate) {
    await saveHabit({ ...t, active: true })
    toast(`${t.emoji} ${t.name} added`, 'good')
    onClose()
  }

  async function archive() {
    if (!habit) return
    await setHabitActive(habit.id, false)
    onClose()
  }

  const suggestions = SUGGESTED_HABITS.filter((s) => !existingNames.some((n) => n.toLowerCase() === s.name.toLowerCase()))

  return (
    <Sheet title={habit ? 'Edit habit' : 'New habit'} onClose={onClose} action={{ label: 'Save', onClick: save, disabled: !valid }}>
      <div className="space-y-4">
        {!habit && suggestions.length > 0 && (
          <div>
            <Label>Suggestions (tap to add)</Label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s.name} onClick={() => addSuggestion(s)} className="press rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold ring-1 ring-slate-700">
                  {s.emoji} {s.name}
                  {s.kind === 'target' && <span className="text-slate-400"> ≥ {formatAmount(s.target ?? 0)}</span>}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center text-xs text-slate-500">or make your own</div>
          </div>
        )}

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
            placeholder={kind === 'do' ? 'e.g. Go for a walk' : kind === 'avoid' ? 'e.g. No sugary snacks' : 'e.g. Steps'}
            className="min-w-0 flex-1 rounded-xl bg-slate-800 p-3 font-semibold outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
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
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-xl p-2.5 text-left ring-1 ${kind === k.id ? 'bg-emerald-500/15 ring-emerald-400' : 'bg-slate-800 ring-slate-700'}`}
              >
                <div className="text-sm font-bold">{k.title}</div>
                <div className="text-[11px] leading-tight text-slate-400">{k.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {kind === 'target' && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Daily target</Label>
              <NumberField value={target} onChange={setTarget} placeholder="8000" decimal />
            </div>
            <div>
              <Label>Unit</Label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="steps"
                className="w-full rounded-xl bg-slate-800 p-3 font-bold outline-none ring-1 ring-slate-700 focus:ring-emerald-400"
              />
            </div>
            <div>
              <Label>Quick add</Label>
              <NumberField value={step} onChange={setStep} prefix="+" decimal />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{kind === 'do' ? 'Points per tap' : kind === 'avoid' ? 'Points per ✓' : 'Points when reached'}</Label>
            <NumberField value={points} onChange={setPoints} prefix="+" />
          </div>
          {kind === 'avoid' && (
            <div>
              <Label>Points lost per slip</Label>
              <NumberField value={slip} onChange={setSlip} prefix="−" />
            </div>
          )}
        </div>

        {kind !== 'target' && (
          <Toggle
            checked={rep}
            onChange={setRepeatable}
            label={`Allow repeat taps (up to ${MAX_TAPS})`}
            sub={
              kind === 'avoid'
                ? 'Tap ✓ again for each urge you resist (more points). Each ✗ is another slip.'
                : 'Tap again for extra effort, e.g. a long run or a whole afternoon.'
            }
          />
        )}

        {kind === 'avoid' && (
          <p className="text-xs text-slate-500">
            Tip: keep slip penalties small (or 0). Big penalties make it tempting to write the whole day off after one slip.
          </p>
        )}

        {habit && habit.active && (
          <>
            <button onClick={archive} className="w-full rounded-xl bg-rose-500/10 py-3 font-semibold text-rose-400">
              Archive habit
            </button>
            <p className="text-center text-xs text-slate-500">Archiving keeps its history. You can restore it from Settings.</p>
          </>
        )}
      </div>
    </Sheet>
  )
}
