# TrackMyLocation

React + Vite frontend for **Trip Tracker** — a live group-travel tracker with a
**Cyber-Travel neon glassmorphism** dark UI (deep-space canvas, glowing glass
cards, violet → cyan → emerald accents).

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
- **Voice calls** — free peer-to-peer 1-to-1 audio over WebRTC with Socket.IO signalling and STUN
- **Voice rooms** — Discord-style group voice chat powered by LiveKit (create/join rooms, live participant counts, speaking indicators, invite-only private rooms)
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

Point the app at your backend (required in production):
```bash
# .env
VITE_API_URL=http://localhost:5000            # local dev
VITE_API_URL=https://your-api.onrender.com    # deployed backend
```

## Deploying the frontend (Vercel)
1. Vercel → **New Project** → import this repo.
2. Framework preset: **Vite** (`vercel.json` sets build + output).
3. Add `VITE_API_URL` = your deployed backend URL, and `VITE_MAPTILER_KEY`.
4. Deploy, then set the backend's `CLIENT_URL` to the resulting
   `https://…vercel.app` origin (and redeploy the backend) so CORS and the
   cross-site session cookie line up.

`vercel.json` also adds a SPA rewrite, which is required for the QR invite links
(`/join/<token>`) to resolve on a hard refresh.

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
