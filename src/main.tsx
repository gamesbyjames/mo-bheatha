import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { ensureSeeded, requestPersistence } from './data/repo'

registerSW({ immediate: true })

ensureSeeded()
  .catch((e) => console.error('Seeding failed', e))
  .finally(() => {
    requestPersistence()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
