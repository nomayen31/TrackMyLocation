# TrackMyLocation

React + Vite frontend for **Trip Tracker** — a live group-travel tracker with a
black & white minimalist UI.

## Features
- **Landing page** — monochrome hero, feature grid, interactive preview mockup and Create/Join CTAs
- Realtime group map inside a framed card with a live expedition stats bar
- **Location search** for any place, with a road-wise blue route and live distance + ETA (drive/walk/cycle)
- Green distance polylines between you and selected group members (`geolib`)
- **Floating map widgets** — nearby members, current weather, quick chat, and an **SOS** safety signal
- **Geofenced safe zone** — admins set a radius around their live position; the map shows the circle and everyone is alerted when a member crosses the boundary
- **Admin map broadcasts** — Notice / Alert / Danger announcements rendered as dismissible overlays on the map
- **Group invites** — code, share link and QR code; scanning a QR auto-joins the trip
- **Admin controls** — promote/demote admins and remove members
- **Chat** — group and 1:1 direct messages with **images and voice notes**
- **Voice calls** — peer-to-peer audio over WebRTC with Socket.IO signalling
- **Stories** — photo/video/text with privacy tiers (trip group · everyone · selected people) and a **view-once** mode
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
