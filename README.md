# TrackMyLocation

React + Vite frontend for **Trip Tracker** — a live group-travel tracker with a
**Cyber-Travel neon glassmorphism** dark UI (deep-space canvas, glowing glass
cards, violet → cyan → emerald accents).

## Features
- **Landing page** — monochrome hero, feature grid, interactive preview mockup and Create/Join CTAs- Realtime group map inside a framed card with a live expedition stats bar
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
- **Hotspot mode** — an offline Raspberry Pi LAN mode: auto-discovers everyone on the Wi-Fi and runs peer-to-peer group voice with no internet (see the backend's `docs/HOTSPOT_SETUP.md`)
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
## Deploying the frontend (Render static site)

Everything runs on Render — no other host needed.

1. Render → **New → Blueprint** → pick the **frontend** repo. Render reads
   `render.yaml` and creates a **static site**.
2. Set `VITE_API_URL` to your deployed API URL, e.g.
   `https://trackmylocationbackend.onrender.com`.
3. Deploy. Vite bakes `VITE_API_URL` into the bundle at **build time**, so
   changing it later requires a **redeploy** (a restart won't pick it up).
4. Copy the static site URL (e.g. `https://trackmylocation-app.onrender.com`)
   into the **API's** `CLIENT_URL`, then redeploy the API so CORS and the
   session cookie match.

`render.yaml` adds a rewrite (`/* → /index.html`) so client routes such as the
QR invite links (`/join/<token>`) survive a hard refresh, plus asset caching.

<details>
<summary>Manual setup (if you prefer the dashboard over a Blueprint)</summary>

- Type: **Static Site**
- Build command: `npm install --include=dev && npm run build`
- Publish directory: `dist`
- Redirect/Rewrite rule: `/*` → `/index.html` (Rewrite)
- Env var: `VITE_API_URL` = your API URL

`--include=dev` matters: **Vite and Tailwind are devDependencies**, and a
production install would skip them and fail the build.
</details>

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
