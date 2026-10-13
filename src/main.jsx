import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { checkBackend } from './healthCheck'
// Leaflet's stylesheet first, so our design-system overrides below win.
import 'leaflet/dist/leaflet.css'
import './index.css'

// Report API reachability once on load (non-blocking).
checkBackend()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)