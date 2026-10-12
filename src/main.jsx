import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Leaflet's stylesheet first, so our design-system overrides below win.
import 'leaflet/dist/leaflet.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)