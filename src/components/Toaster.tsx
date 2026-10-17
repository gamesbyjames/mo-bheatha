import { useToasts } from '../lib/toast'

const TONES = {
  good: 'bg-emerald-500 text-emerald-950',
  neutral: 'bg-slate-700 text-slate-50',
  bad: 'bg-rose-500 text-rose-950',
}

export default function Toaster() {
  const toasts = useToasts()
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-pop rounded-full px-4 py-2 text-sm font-bold shadow-lg ${TONES[t.tone]}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
