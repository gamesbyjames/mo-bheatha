import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { ensureSeeded, requestPersistence } from './data/repo'
import { isStandalone } from './lib/pwa'

registerSW({ immediate: true })

ensureSeeded()
  .catch((e) => console.error('Seeding failed', e))
  .finally(() => {
    // Installed apps (e.g. iPhone Home Screen) get this silently. In a normal
    // browser tab some browsers (Firefox) show a prompt, so there we only ask
    // when the user taps the button in Settings.
    if (isStandalone()) requestPersistence()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
