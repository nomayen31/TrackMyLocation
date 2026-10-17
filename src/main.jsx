import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LanApp from './components/lan/LanApp.jsx'
import { checkBackend } from './healthCheck'
// Leaflet's stylesheet first, so our design-system overrides below win.
import 'leaflet/dist/leaflet.css'
import './index.css'

/**
 * Bootstrap decides which application to mount.
 *
 * On the Raspberry Pi hotspot the backend serves this bundle and exposes
 * /api/lan/info with `lanMode: true` — so we mount the offline hotspot UI and
 * never touch the cloud API (which isn't reachable without internet).
 *
 * Everywhere else this is a quick check that fails gracefully (a static host
 * may answer with the SPA's index.html, making res.json() throw), and we mount
 * the normal cloud app.
 */
const root = ReactDOM.createRoot(document.getElementById('root'))

async function boot() {
  let lanMode = false
  try {
    const res = await fetch('/api/lan/info', { credentials: 'same-origin' })
    if (res.ok) {
      const info = await res.json()
      lanMode = Boolean(info?.lanMode)
    }
  } catch {
    // Not a LAN backend (or the SPA fallback returned HTML) — cloud mode.
  }

  root.render(
    <React.StrictMode>{lanMode ? <LanApp /> : <App />}</React.StrictMode>
  )

  if (!lanMode) checkBackend()
}

boot()
