import type { Habit, Settings } from './types'

export type HabitTemplate = Omit<Habit, 'id' | 'order' | 'createdAt' | 'active'>

const STEPS: HabitTemplate = { name: 'Steps', emoji: '👣', kind: 'target', points: 10, slipPoints: 0, target: 8000, unit: 'steps', step: 1000 }
const WATER: HabitTemplate = { name: 'Water', emoji: '💧', kind: 'target', points: 5, slipPoints: 0, target: 6, unit: 'glasses', step: 1 }
const PHONE: HabitTemplate = { name: 'Phone away at family time', emoji: '📵', kind: 'avoid', points: 10, slipPoints: -5, repeatable: true }

const SEED_HABITS: Array<HabitTemplate & { id: string }> = [
  { id: 'd-exercise', name: 'Exercise', emoji: '🏃', kind: 'do', points: 15, slipPoints: 0, repeatable: true },
  { id: 'd-family', name: 'Present with family', emoji: '👨‍👩‍👧', kind: 'do', points: 15, slipPoints: 0, repeatable: true },
  { id: 'd-steps', ...STEPS },
  { id: 'd-water', ...WATER },
  { id: 'd-junk', name: 'No junk food', emoji: '🥗', kind: 'avoid', points: 10, slipPoints: -5, repeatable: true },
  { id: 'd-alcohol', name: 'No alcohol', emoji: '🍺', kind: 'avoid', points: 10, slipPoints: -5, repeatable: true },
  { id: 'd-phone', ...PHONE },
]

export function defaultHabits(now = Date.now()): Habit[] {
  return SEED_HABITS.map((h, i) => ({ ...h, active: true, order: i, createdAt: now }))
}

/** One-tap suggestions in the "Add habit" sheet */
export const SUGGESTED_HABITS: HabitTemplate[] = [
  STEPS,
  WATER,
  PHONE,
  { name: 'Back stretches', emoji: '🧘', kind: 'do', points: 10, slipPoints: 0, repeatable: false },
  { name: 'Time outside', emoji: '🌳', kind: 'do', points: 10, slipPoints: 0, repeatable: false },
  { name: 'In bed by 11', emoji: '😴', kind: 'do', points: 10, slipPoints: 0, repeatable: false },
  { name: 'Read 20 minutes', emoji: '📖', kind: 'do', points: 10, slipPoints: 0, repeatable: false },
  { name: 'Meditate', emoji: '🧠', kind: 'do', points: 10, slipPoints: 0, repeatable: false },
  { name: 'No sugary drinks', emoji: '🥤', kind: 'avoid', points: 10, slipPoints: -5, repeatable: true },
  { name: 'No smoking', emoji: '🚭', kind: 'avoid', points: 15, slipPoints: -5, repeatable: true },
]

export const DEFAULT_TAGS = [
  'Tired',
  'Energised',
  'Stressed',
  'Calm',
  'Anxious',
  'Focused',
  'Low',
  'Grateful',
  'Irritable',
  'Stiff',
]

export function defaultSettings(): Settings {
  return {
    dailyGoal: 35,
    checkInPoints: 5,
    feelTags: [...DEFAULT_TAGS],
    bodyView: 'back',
    trackPain: false,
    seed: Math.floor(Math.random() * 1_000_000_000),
    welcomeDismissed: false,
  }
}

export const EMOJI_PALETTE = [
  '🏃', '🚶', '🏋️', '🚴', '🏊', '🧘', '😴', '💧',
  '🥗', '🍎', '🚭', '📵', '👨‍👩‍👧', '❤️', '📖', '✍️',
  '🌳', '☀️', '🧠', '🙏', '🎸', '🧹', '💊', '👣',
]
