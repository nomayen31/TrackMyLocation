# TrackMyLocation

React + Vite frontend for **Trip Tracker** — a live group-travel tracker with a
black & white minimalist UI.

## Features
- Realtime group map (Leaflet + MapTiler Hybrid basemap) with live member markers
- Green distance polylines between you and selected group members (`geolib`)
- Story rings on avatars/markers with a full-screen story viewer
- Direct messages, plus remote **Vibrate** and **Ring** alerts over Socket.IO
- Group chat, trip expenses with balances, and group management
- Responsive layout: slide-over drawer + bottom navigation on mobile

## Tech stack
React 18 · Vite · Tailwind CSS · react-leaflet / Leaflet · Socket.IO client · geolib

## Getting started
```bash
npm install
npm run dev      # http://localhost:5173
```

Set the MapTiler key (optional — a fallback is built in):
```bash
cp .env.example .env   # then edit VITE_MAPTILER_KEY
```

## Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint the source |

## Notes
- The app talks to the backend API on `http://localhost:5000` (see `src/api.js`).
- The MapTiler key is browser-exposed; restrict it by domain in the MapTiler dashboard.
