import { lazy, Suspense, useState } from 'react'
import DoScreen from './screens/DoScreen'
import FeelScreen from './screens/FeelScreen'
import SettingsScreen from './screens/SettingsScreen'
import Toaster from './components/Toaster'

// Charts are heavy; load them only when Insights is opened
const InsightsScreen = lazy(() => import('./screens/InsightsScreen'))

const TABS = [
  { id: 'do', label: 'Do', icon: '✅' },
  { id: 'feel', label: 'Feel', icon: '🫀' },
  { id: 'insights', label: 'Insights', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('do')

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <main className="pt-safe flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'do' && <DoScreen />}
        {tab === 'feel' && <FeelScreen />}
        {tab === 'insights' && (
          <Suspense fallback={<p className="py-10 text-center text-slate-500">Loading…</p>}>
            <InsightsScreen />
          </Suspense>
        )}
        {tab === 'settings' && <SettingsScreen />}
      </main>

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

      <Toaster />
    </div>
  )
}
