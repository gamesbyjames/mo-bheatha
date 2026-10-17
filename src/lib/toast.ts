import { useEffect, useState } from 'react'

export interface Toast {
  id: number
  text: string
  tone: 'good' | 'neutral' | 'bad'
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<(t: Toast[]) => void>()
const emit = () => listeners.forEach((l) => l(toasts))

export function toast(text: string, tone: Toast['tone'] = 'neutral', ms = 2600) {
  const t = { id: nextId++, text, tone }
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    emit()
  }, ms)
}

export function useToasts() {
  const [state, setState] = useState(toasts)
  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
