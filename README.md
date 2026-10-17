# Trip Tracker — Frontend

**The Ultimate Real-Time Tourist Group Companion & Expedition Tracker.**

A React + Vite single-page app for tourist groups that want to stay together:
live GPS on one map, live distances, private trip channels, stories, group and
1-to-1 voice, expenses, and real-time safety signals — in a dark,
neon-glassmorphism UI.

> This is the **frontend**. It talks to the API in
> [`TrackMyLocationBackend-`](https://github.com/nomayen31/TrackMyLocationBackend-).

---

## Table of contents

1. [What the site does](#1-what-the-site-does)
2. [Feature tour](#2-feature-tour)
3. [Tech stack](#3-tech-stack)
4. [Project structure](#4-project-structure)
5. [Getting started](#5-getting-started)
6. [Environment variables](#6-environment-variables)
7. [Scripts](#7-scripts)
8. [How the key features work](#8-how-the-key-features-work)
9. [Hotspot (offline) mode](#9-hotspot-offline-mode)
10. [Design system](#10-design-system)
11. [Deployment](#11-deployment)
12. [Browser support & limits](#12-browser-support--limits)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What the site does

A tourist group lands on the app, creates a **trip** (or scans an invite QR),
and from then on:

- everyone's **live position** streams onto one map,
- each member sees the **distance** to the others, and to any place they search,
- they can **talk** (group voice rooms or a private call),
- they can **message**, share **photos** and **voice notes**,
- they can post **stories** that expire in 24 hours,
- admins can draw a **safe zone** and get alerted when someone leaves it,
- admins can push **Notice / Alert / Danger** announcements onto the map,
- anyone can raise an **SOS**,
- and the trip's **expenses** are split fairly and settled up.

Two entry points:

| Mode | Who | What you get |
| --- | --- | --- |
| **Cloud** (default) | normal deployment | the full app — accounts, trips, map, chat, voice rooms, expenses, stories |
| **Hotspot** | an offline Raspberry Pi access point | a lightweight lobby: everyone on the Wi-Fi appears in "the signal", then a peer-to-peer group voice call |

---

## 2. Feature tour

### Landing page
Hero with an interactive product mockup (Map / Chat / Stories tabs), a feature
grid, "Why it exists", "How it works", and **Create Expedition** / **Join via QR
Code** CTAs.

### Accounts & profiles
- Email + password sign-up / sign-in (Better Auth cookie session).
- Optional **profile photo** and phone number at sign-up.
- **Profile editor**: name, photo, phone, social handle. The photo appears on map
  markers, member lists and chat instantly.

### Trips (groups)
- Create a trip — you become **admin**; joiners are **members**.
- Join by **short code**, **invite link**, or **QR scan**.
- Admins can **promote/demote** and **remove** members.
- Invite card with code, shareable link and a generated **QR code**.

### Live map
- MapTiler **Hybrid** satellite basemap (with a monochrome alternative).
- Custom **avatar markers** with a glowing **story ring** when someone has an
  active story, and a pulsing beacon for you.
- **Green dashed distance polylines** from you to each selected member, labelled
  with the live distance; choose which members to connect.
- **Place search** for anywhere: drops a pin, flies there, and draws a
  **road-wise blue route** with distance and ETA (drive / walk / cycle).
- **Framed map card** with a live stats bar (members sharing, nearest, spread).
- Floating widgets: **weather**, **nearby members** (with call/DM/vibrate/ring),
  **quick chat**, and **SOS**.
- **Safe zone**: admins set a radius around their live position; a green circle
  marks the boundary and everyone is alerted when a member crosses it.
- **Admin broadcasts**: dismissible Notice / Alert / Danger overlays on the map.
- Marker popups: story, message, call, vibrate, ring, plus phone/social.

### Stories
- Photo, video or **text** stories.
- **Privacy tiers**: trip-only, everyone, or **selected people**.
- **View once**: media is withheld until the single view is consumed; afterwards
  it returns `410 Gone` and never appears again.
- 24-hour expiry; authors can delete.

### Chat
- **Trip channel** and **private 1-to-1 DMs**.
- Text, **images**, and **voice notes**.
- Grouped bubbles by sender, day separators, timestamps, smart auto-scroll
  (only when you're at the bottom), "jump to latest", quick emoji.

### Voice
- **Group voice rooms** (LiveKit): create/join, participant counts, invite-only
  private rooms, speaking indicators, mute.
- **1-to-1 calls** (WebRTC): full-screen ringing UI, minimize to a floating pill,
  screen wake lock, noise suppression / echo cancellation, accurate timer.
- **Calls ring when the tab is closed** via Web Push + a service worker.

### Expenses
- 7 categories (food, transport, stay, activity, shopping, tickets, other).
- Split **equally**, by **custom amounts**, or **payer-only**.
- Real per-person balances, spend-by-category chart, and **settle-up** transfers.

### Safety
- **SOS**: one tap alerts the whole trip with sound + vibration; a banner shows
  until cleared.
- **Vibrate / Ring** a member's device remotely.
- **Geofenced safe zone** with boundary-breach alerts.

---

## 3. Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 18, Vite 5 |
| Styling | Tailwind CSS 3 + custom CSS (neon glassmorphism) |
| Maps | Leaflet 1.9 + react-leaflet 4, MapTiler tiles |
| Geo | `geolib` for distances, OSRM for road routing |
| Realtime | `socket.io-client` |
| Voice | `livekit-client` (group rooms), native WebRTC (1-to-1) |
| QR | `qrcode` (generate), `jsqr` (camera scan) |
| HTTP | `axios` |
| Push | Service worker + Web Push API |

---

## 4. Project structure

```
Frontend/
├── index.html
├── vite.config.js            # dev server + API/socket proxy
├── tailwind.config.js        # monochrome design tokens + neon accents
├── render.yaml               # Render static-site blueprint
├── public/
│   └── sw.js                 # service worker: push + notification clicks
└── src/
    ├── main.jsx              # bootstrap: decides Cloud app vs Hotspot app
    ├── App.jsx               # cloud shell: sidebar, tabs, overlays, sockets
    ├── api.js                # axios baseURL resolution (cloud / LAN / local)
    ├── index.css             # component library + Leaflet overrides
    ├── distance.js           # geolib helpers
    ├── geocode.js            # place search (MapTiler → Nominatim)
    ├── routing.js            # OSRM road routes
    ├── weather.js            # Open-Meteo
    ├── invite.js             # parse /join/<token> from the URL
    ├── push.js               # service worker + VAPID subscription
    ├── useCall.js            # 1-to-1 WebRTC call hook
    ├── healthCheck.js        # startup API reachability check
    ├── components/
    │   ├── LandingPage, AuthForm, GroupManager, InviteCard, QrJoinModal
    │   ├── ExpeditionMap, LiveMap, MapStatsBar, WeatherWidget,
    │   │   NearbyMembersWidget, QuickChat, SafeZonePanel,
    │   │   BroadcastPanel, MapAlertOverlay
    │   ├── StoriesBar, StoryComposer, StoryViewer
    │   ├── GroupChat, DirectMessages, MediaBubble, useVoiceRecorder
    │   ├── MembersPanel, MemberActionSheet, ProfileEditor, Avatar
    │   ├── ExpensePanel, CallOverlay, ToastStack, alertSound
    │   ├── voice/            # LiveKit group-voice UI
    │   └── lan/              # hotspot lobby + mesh voice UI
    ├── voice/useVoiceChat.js # LiveKit rooms + `voice:*` socket protocol
    ├── lan/                  # LAN client, identity, mesh voice hook
    └── hooks/useWakeLock.js
```

---

## 5. Getting started

```bash
git clone https://github.com/nomayen31/TrackMyLocation.git
cd TrackMyLocation
npm install
cp .env.example .env      # optional; sensible defaults exist
npm run dev               # http://localhost:5173
```

The backend must be running (default `http://localhost:5000`):

```bash
cd ../TrackMyLocationBackend-
npm install && npm run migrate && npm run dev
```

`vite.config.js` proxies `/api` and `/socket.io` to `VITE_PROXY_TARGET`
(default `http://localhost:5000`), so relative API calls work in dev exactly
like the production same-origin setup.

---

## 6. Environment variables

Copy `.env.example` → `.env`. Only `VITE_*` variables reach the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | production | Backend URL, e.g. `https://trackmylocationbackend.onrender.com`. Optional — the app defaults correctly (see `src/api.js`). |
| `VITE_MAPTILER_KEY` | optional | Hybrid basemap key (a fallback is built in). |
| `VITE_PROXY_TARGET` | dev only | Where the dev server proxies `/api` (default `:5000`; use `:3000` for LAN mode). |
| `VITE_TURN_URL` / `_USER` / `_CREDENTIAL` | optional | TURN server for 1-to-1 calls on restrictive networks. |

**API URL resolution** (`src/api.js`):

1. `VITE_API_URL` if set
2. a private LAN IP → same origin (the Pi serves the app)
3. a public domain → the Render API
4. `localhost` → `http://localhost:5000`

---

## 7. Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the build |
| `npm run lint` | Lint |

---

## 8. How the key features work

### Live positions & distances
`App` opens a geolocation `watchPosition` and emits `update-location` over
Socket.IO; the server broadcasts `user-moved`. `LiveMap` renders each member as
a Leaflet `divIcon` and draws a `Polyline` to every selected member; the length
comes from `geolib.getDistance` and updates on every GPS tick.

### Place search & road routing
Search debounces, then calls MapTiler Geocoding (Nominatim fallback). Selecting a
place flies the map there and requests an OSRM route; the returned geometry is
drawn as a **blue polyline with a white casing**, with distance and ETA at the
midpoint. Changing the travel mode re-routes.

### Stories & view-once
The feed never includes the media of an unopened one-time story. Opening it calls
`POST /api/stories/:id/view`, which returns the payload **once**; afterwards the
story is hidden from the feed and the endpoint returns `410`.

### Group voice (LiveKit)
`useVoiceChat` joins a LiveKit room with a short-lived token minted by the
backend, publishes the microphone, and subscribes to peers. Speaking is detected
with LiveKit's `ActiveSpeakersChanged` — audio never travels through Socket.IO.

### 1-to-1 calls
`useCall` negotiates a direct `RTCPeerConnection` with Google STUN, exchanging
offers/answers/ICE over Socket.IO. The overlay plays the remote track through a
hidden `<audio>` element, holds a **screen wake lock**, and asks `getUserMedia`
for **noise suppression / echo cancellation / auto gain**.

### Closed-tab ringing
The service worker (`public/sw.js`) receives Web Push messages from the backend
and shows an incoming-call notification with a click handler that focuses or
opens the app.

---

## 9. Hotspot (offline) mode

`main.jsx` first calls `/api/lan/info`. If the backend reports `lanMode: true`
(the Raspberry Pi build), the app mounts the **hotspot UI** instead of the cloud
app:

1. enter a display name (no account, no database),
2. see everyone connected to the same Wi-Fi,
3. **Join group voice** — a WebRTC mesh over the LAN, no internet, no STUN/TURN.

> Browsers only allow the microphone on HTTPS or `localhost`, so the Pi must
> serve the app over TLS. See the backend's `docs/HOTSPOT_SETUP.md`.

---

## 10. Design system

A dark "Cyber-Travel" theme: deep-space `#030712` canvas, translucent glass cards,
`#262626` borders, and a violet → cyan → emerald accent gradient.

- **Primary actions**: `bg-neon-tri` gradient with a violet glow.
- **Status**: emerald for live/GPS, electric blue for routes, amber for warnings,
  rose for SOS.
- **Surfaces**: `.card`, `.glass`, `.neon-frame`, `.sheet`.
- **Motion**: `.animate-drift`, `.animate-pop-in`, `.story-ring-ui`, `.sos-pulse`.
- Responsive: slide-over sidebar, bottom navigation dock, full-height map.

Design tokens live in `tailwind.config.js`; reusable classes in `src/index.css`.

---

## 11. Deployment

### Render (static site) — recommended
`render.yaml` provisions a Render **Static Site**:

- build: `npm install --include=dev && npm run build`
  (Vite and Tailwind are devDependencies, so `--include=dev` is required)
- publish: `dist`
- SPA rewrite `/* → /index.html` so `/join/<token>` links survive a refresh
- set `VITE_API_URL` to the backend URL, `VITE_MAPTILER_KEY` to your key

### Manual setup
Static site · build `npm install --include=dev && npm run build` · publish `dist`
· rewrite `/*` → `/index.html` · env `VITE_API_URL`.

> After deploying, copy the site URL into the backend's `CLIENT_URL` and redeploy
> the API — otherwise the browser blocks every request with a CORS error.

---

## 12. Browser support & limits

- **Microphone** requires HTTPS or `localhost` (browser rule, not app code).
- **Web Push** requires HTTPS; on **iOS 16.4+** the app must be **added to the
  Home Screen** for push to work.
- **Wake lock** is Chrome/Edge/Android; it silently no-ops elsewhere.
- **Vibration** (`navigator.vibrate`) is Android/Firefox only.
- **Self-signed certificates** on a hotspot must be trusted per device, or the
  mic stays blocked.
- 1-to-1 calls on symmetric NATs need a **TURN** server (`VITE_TURN_*`).

---

## 13. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Everything 404s / `Failed to fetch` | `VITE_API_URL` missing on the host, or backend `CLIENT_URL` doesn't include this origin. |
| CORS error in console | Add this site's exact origin to the backend `CLIENT_URL`, then redeploy the API. |
| Map tiles blank | `VITE_MAPTILER_KEY` invalid or domain-restricted. |
| "Microphone blocked" | You're on `http://` — use `https://` (or localhost). |
| Voice connects but no audio | Check the browser's mic permission and the output device; try TURN for restrictive networks. |
| Push never arrives | Notification permission denied, or (iOS) the app isn't installed to the Home Screen. |
| Invite link points at localhost | Backend `CLIENT_URL` isn't set — the backend now derives it from the request Origin, but setting it explicitly is best. |

---

## Credits

Built with React, Vite, Tailwind CSS, Leaflet, Socket.IO, LiveKit and WebRTC.
Map data © OpenStreetMap contributors · tiles © MapTiler / CARTO · routing OSRM ·
weather Open-Meteo.
