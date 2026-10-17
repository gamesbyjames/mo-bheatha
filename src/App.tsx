import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import DoScreen from './screens/DoScreen'
import FeelScreen from './screens/FeelScreen'
import SettingsScreen from './screens/SettingsScreen'
import Toaster from './components/Toaster'

// Charts are heavy; load them only when needed
const GoalsScreen = lazy(() => import('./screens/GoalsScreen'))
const InsightsScreen = lazy(() => import('./screens/InsightsScreen'))

const TABS = [
  { id: 'do', label: 'Do', icon: '✅' },
  { id: 'feel', label: 'Feel', icon: '🫀' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'insights', label: 'Insights', icon: '📈' },
] as const

type TabId = (typeof TABS)[number]['id']

const Loading = () => <p className="py-10 text-center text-slate-500">Loading…</p>

export default function App() {
  const [tab, setTab] = useState<TabId>('do')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [tab, settingsOpen])

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="pt-safe flex items-center justify-between px-4">
        {settingsOpen ? (
          <button onClick={() => setSettingsOpen(false)} className="press -ml-1 py-2 pr-4 font-semibold text-emerald-400">
            ‹ Back
          </button>
        ) : (
          <span className="py-2 text-sm font-black tracking-wide text-emerald-400">Mo Bheatha</span>
        )}
        {!settingsOpen && (
          <button onClick={() => setSettingsOpen(true)} className="press -mr-2 p-2 text-xl" aria-label="Settings">
            ⚙️
          </button>
        )}
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 pb-6">
        {settingsOpen ? (
          <SettingsScreen />
        ) : (
          <Suspense fallback={<Loading />}>
            {tab === 'do' && <DoScreen />}
            {tab === 'feel' && <FeelScreen />}
            {tab === 'goals' && <GoalsScreen />}
            {tab === 'insights' && <InsightsScreen />}
          </Suspense>
        )}
      </main>

      {!settingsOpen && (
        <nav className="pb-safe border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="grid grid-cols-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
                  tab === t.id ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <span className={`text-2xl ${tab === t.id ? '' : 'opacity-60 grayscale'}`}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <Toaster />
    </div>
  )
}
