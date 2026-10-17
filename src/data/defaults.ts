import type { Habit, Settings } from './types'

type Seed = Pick<Habit, 'id' | 'name' | 'emoji' | 'kind' | 'points' | 'slipPoints'>

const SEED_HABITS: Seed[] = [
  { id: 'd-exercise', name: 'Exercise', emoji: '🏃', kind: 'do', points: 15, slipPoints: 0 },
  { id: 'd-family', name: 'Present with family', emoji: '👨‍👩‍👧', kind: 'do', points: 15, slipPoints: 0 },
  { id: 'd-back', name: 'Back stretches', emoji: '🧘', kind: 'do', points: 10, slipPoints: 0 },
  { id: 'd-sleep', name: 'In bed by 11', emoji: '😴', kind: 'do', points: 10, slipPoints: 0 },
  { id: 'd-junk', name: 'No junk food', emoji: '🥗', kind: 'avoid', points: 10, slipPoints: -5 },
  { id: 'd-alcohol', name: 'No alcohol', emoji: '💧', kind: 'avoid', points: 10, slipPoints: -5 },
]

export function defaultHabits(now = Date.now()): Habit[] {
  return SEED_HABITS.map((h, i) => ({ ...h, active: true, order: i, createdAt: now }))
}

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
    seed: Math.floor(Math.random() * 1_000_000_000),
    welcomeDismissed: false,
  }
}

export const EMOJI_PALETTE = [
  '🏃', '🚶', '🏋️', '🚴', '🏊', '🧘', '😴', '💧',
  '🥗', '🍎', '🚭', '📵', '👨‍👩‍👧', '❤️', '📖', '✍️',
  '🌳', '☀️', '🧠', '🙏', '🎸', '🧹', '💊', '🦷',
]
