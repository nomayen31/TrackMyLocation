import React, { useState } from 'react';

/* -------------------------------------------------------------------------
 * Inline icon set (no icon dependency).
 * ---------------------------------------------------------------------- */
const I = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Compass = (p) => (
  <svg {...I} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z" />
  </svg>
);
const Pin = (p) => (
  <svg {...I} {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
const Route = (p) => (
  <svg {...I} {...p}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8 16.5c4-1 3-6 8-6.8" />
  </svg>
);
const Shield = (p) => (
  <svg {...I} {...p}>
    <path d="M12 3 5 6v6c0 4.5 3 7.2 7 9 4-1.8 7-4.5 7-9V6z" />
    <path d="m9.5 12 1.8 1.8 3.4-3.6" />
  </svg>
);
const Lock = (p) => (
  <svg {...I} {...p}>
    <rect x="5" y="10" width="14" height="10" rx="2.5" />
    <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
  </svg>
);
const Users = (p) => (
  <svg {...I} {...p}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.6 5.2a3.2 3.2 0 0 1 0 6.1" />
  </svg>
);
const Bell = (p) => (
  <svg {...I} {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);
const Chat = (p) => (
  <svg {...I} {...p}>
    <path d="M20 12a7 7 0 0 1-7 7H9l-4 3v-4.6A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7z" />
  </svg>
);
const Mic = (p) => (
  <svg {...I} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const QrIcon = (p) => (
  <svg {...I} {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <path d="M14 14h2.5v2.5H14zM19.5 14v2.5M14 19.5h5.5" />
  </svg>
);
const Arrow = (p) => (
  <svg {...I} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const Check = (p) => (
  <svg {...I} {...p}>
    <path d="m5 13 4.5 4.5L19 7" />
  </svg>
);

/* -------------------------------------------------------------------------
 * Feature grid data
 * ---------------------------------------------------------------------- */
const FEATURES = [
  {
    icon: Pin,
    title: 'Live GPS tracking',
    body: 'Every member’s position streaming in real time on a clean monochrome map. No refreshing, no guesswork.',
  },
  {
    icon: Route,
    title: 'Live distance calc',
    body: 'Green distance lines between you and the group, with a live km readout and road-wise routing.',
  },
  {
    icon: Lock,
    title: 'Private expeditions',
    body: 'Invite-only channels. Share a code, a link, or a QR — nobody gets in uninvited.',
  },
  {
    icon: Users,
    title: 'Secure member control',
    body: 'Admins promote and remove members instantly. Roles are enforced on the server, not just the UI.',
  },
  {
    icon: Bell,
    title: 'Safety signals',
    body: 'One-tap SOS, remote vibrate and ring to reach a straggler — even if their phone is in a pocket.',
  },
  {
    icon: Chat,
    title: 'Channels & DMs',
    body: 'Group channels and private 1:1 chat with photos and voice notes, all in the same expedition.',
  },
  {
    icon: Mic,
    title: 'Voice calls',
    body: 'Peer-to-peer audio over WebRTC. Rally the group without leaving the map.',
  },
  {
    icon: QrIcon,
    title: 'Stories & view-once',
    body: 'Share trip moments with privacy tiers — trip-only, everyone, or selected people — plus view-once.',
  },
];

/* -------------------------------------------------------------------------
 * Interactive preview mockup (tabbed, pure CSS)
 * ---------------------------------------------------------------------- */
const PREVIEW_TABS = ['Map', 'Chat', 'Stories'];

function PreviewMap() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-mono-950">
      <div className="hero-grid absolute inset-0" />
      {/* Fake distance line + markers */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 240" preserveAspectRatio="none">
        <path d="M80 170 C150 150 210 120 320 70" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 7" fill="none" />
      </svg>
      {[
        { x: '20%', y: '70%', label: 'You', accent: true },
        { x: '50%', y: '52%', label: 'Maya' },
        { x: '78%', y: '28%', label: 'Arif' },
      ].map((m) => (
        <div key={m.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: m.x, top: m.y }}>
          <div className="relative">
            {m.accent && <span className="absolute -inset-1.5 rounded-full bg-white/15" />}
            <div className="story-ring-ui absolute -inset-1 rounded-full" />
            <div className="relative m-[3px] flex h-9 w-9 items-center justify-center rounded-full border border-mono-950 bg-mono-800 text-[10px] font-bold text-white">
              {m.label[0]}
            </div>
          </div>
          <span className="mt-1 block rounded-full border border-mono-800 bg-mono-900/90 px-2 py-0.5 text-center text-[9px] font-semibold text-mono-200">
            {m.label}
          </span>
        </div>
      ))}
      <span className="absolute left-1/2 top-[46%] -translate-x-1/2 rounded-full border border-accent/50 bg-mono-950/90 px-2 py-0.5 text-[10px] font-bold text-white">
        1.4 km
      </span>
      {/* Chips */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-mono-800 bg-mono-900/90 px-2.5 py-1 text-[10px] font-semibold text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 4 sharing
      </div>
      <div className="absolute right-3 top-3 rounded-full border border-mono-800 bg-mono-900/90 px-2.5 py-1 text-[10px] font-semibold text-mono-200">
        24°C · Clear
      </div>
    </div>
  );
}

function PreviewChat() {
  const lines = [
    { me: false, text: 'Waiting at the north gate 🧭' },
    { me: true, text: '5 min out — sending my pin' },
    { me: false, text: 'Voice note', audio: true },
  ];
  return (
    <div className="flex h-full flex-col gap-2 bg-mono-950 p-3">
      {lines.map((l, i) => (
        <div key={i} className={`flex ${l.me ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-[11px] ${
              l.me ? 'rounded-br-md bg-white text-mono-950' : 'rounded-bl-md border border-mono-800 bg-mono-900 text-mono-100'
            }`}
          >
            {l.audio ? (
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mono-800 text-white">▶</span>
                <span className="flex items-end gap-0.5">
                  {[6, 12, 8, 16, 10, 14, 7].map((h, k) => (
                    <span key={k} className="w-0.5 rounded-full bg-current opacity-60" style={{ height: h }} />
                  ))}
                </span>
                <span className="text-[9px] opacity-70">0:06</span>
              </span>
            ) : (
              l.text
            )}
          </div>
        </div>
      ))}
      <div className="mt-auto flex items-center gap-2 rounded-2xl border border-mono-800 bg-mono-900 px-3 py-2">
        <span className="text-[11px] text-mono-500">Message the trip…</span>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg bg-white text-mono-950">
          <Arrow className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function PreviewStories() {
  return (
    <div className="flex h-full flex-col bg-mono-950 p-3">
      <div className="flex gap-2">
        {['You', 'Maya', 'Arif', 'Sam'].map((n) => (
          <div key={n} className="flex w-12 flex-col items-center gap-1">
            <div className="relative">
              <div className="story-ring-ui absolute -inset-0.5 rounded-full" />
              <div className="relative m-[2px] flex h-10 w-10 items-center justify-center rounded-full border border-mono-950 bg-mono-800 text-[10px] font-bold text-white">
                {n[0]}
              </div>
            </div>
            <span className="text-[9px] text-mono-400">{n}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex-1 overflow-hidden rounded-xl border border-mono-800 bg-gradient-to-br from-mono-850 to-mono-950">
        <span className="absolute left-3 top-3 rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-300">
          View once
        </span>
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-bold text-white">
          “Sunset at the ridge — we made it.”
        </p>
      </div>
    </div>
  );
}

function PreviewMockup() {
  const [tab, setTab] = useState('Map');
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-8 glow-soft" />
      <div className="relative overflow-hidden rounded-[26px] border border-mono-800 bg-mono-900 shadow-lift">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-mono-800 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-mono-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-mono-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-mono-700" />
          <span className="ml-2 truncate font-mono text-[10px] text-mono-500">trip-tracker/expedition</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-accent-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> live
          </span>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-mono-800 p-1.5">
          {PREVIEW_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                tab === t ? 'bg-white text-mono-950' : 'text-mono-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="h-64">
          {tab === 'Map' && <PreviewMap />}
          {tab === 'Chat' && <PreviewChat />}
          {tab === 'Stories' && <PreviewStories />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * LandingPage
 * ---------------------------------------------------------------------- */
export default function LandingPage({ onStart, onSignIn, invited = false }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-mono-950 text-mono-200">
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-mono-800/80 bg-mono-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-mono-950">
            <Compass className="h-5 w-5" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-white">Trip Tracker</span>
          <nav className="ml-6 hidden items-center gap-6 text-xs font-semibold text-mono-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#preview" className="transition hover:text-white">Preview</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onSignIn} className="btn btn-ghost btn-sm">
              Sign in
            </button>
            <button type="button" onClick={() => onStart('create')} className="btn btn-primary btn-sm">
              Get started
            </button>
          </div>
        </div>
      </header>

      {invited && (
        <div className="border-b border-accent/30 bg-accent/10 px-5 py-2.5 text-center text-xs font-semibold text-accent-300">
          You’ve been invited to an expedition — sign in to join automatically.
        </div>
      )}

      {/* --------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="glow-soft pointer-events-none absolute -top-24 left-1/2 h-80 w-[36rem] -translate-x-1/2" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-mono-800 bg-mono-900/70 px-3 py-1 text-[11px] font-semibold text-mono-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Real-time group travel, without the clutter
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Ultimate Real-Time Tourist Group Companion
              <span className="block text-mono-400">& Expedition Tracker</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-mono-400">
              One calm, monochrome surface for your whole trip: live GPS, live distances,
              private channels, secure member control and real-time safety signals — with
              nothing you don’t need.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={() => onStart('create')} className="btn btn-primary px-5 py-3">
                Create Expedition
                <Arrow className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onStart('join')} className="btn btn-secondary px-5 py-3">
                <QrIcon className="h-4 w-4" />
                Join via QR Code
              </button>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-mono-400">
              {['No account required to browse', 'Invite-only channels', 'Works on any phone'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="animate-drift">
              <PreviewMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ marquee */}
      <div className="relative overflow-hidden border-y border-mono-800 bg-mono-900/40 py-3">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {['Live GPS', 'Distance lines', 'Private channels', 'QR invites', 'SOS safety', 'Group & DM chat', 'Voice notes', 'Voice calls', 'Stories', 'Expense splitting'].map(
                (t) => (
                  <span key={t} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mono-500">
                    {t}
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mono-500">Why it exists</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Built for groups that move together
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-mono-400">
            Group trips fall apart in the details — who’s where, how far ahead, who’s falling
            behind, who’s in the channel. Trip Tracker answers all of it on one quiet screen,
            so the group stays together and the day keeps flowing.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-mono-800 bg-mono-900 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-mono-600"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-mono-800 bg-mono-850 text-white transition group-hover:bg-white group-hover:text-mono-950">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-mono-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ preview */}
      <section id="preview" className="border-y border-mono-800 bg-mono-900/30">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mono-500">The dashboard</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              One screen. The whole expedition.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-mono-400">
              Tap between the map, the channel and stories without losing context. The map carries
              the group; the channel carries the plan; the stories carry the memories.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                'Framed map card with live expedition stats on top',
                'Story-ring avatars, green distance lines and km readouts',
                'Floating widgets: nearby members, weather, quick chat, SOS',
                'Marker popups for DM, vibrate, ring and one-time stories',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-mono-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mono-700 text-accent-300">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <PreviewMockup />
        </div>
      </section>

      {/* ---------------------------------------------------------------- how */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mono-500">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Three steps to a tracked trip
          </h2>
        </div>
        <ol className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            { n: '01', t: 'Create the expedition', b: 'You become the admin instantly. Name the trip and a private channel is created.' },
            { n: '02', t: 'Share the QR', b: 'Send the code, the link or the QR. Friends scan and auto-join — no manual setup.' },
            { n: '03', t: 'Move together', b: 'Watch the map, message, set stories and use SOS if anyone needs help.' },
          ].map((step) => (
            <li key={step.n} className="rounded-2xl border border-mono-800 bg-mono-900 p-6">
              <span className="font-mono text-3xl font-extrabold text-mono-600">{step.n}</span>
              <h3 className="mt-3 text-sm font-bold text-white">{step.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-mono-400">{step.b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- final CTA */}
      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-mono-800 bg-mono-900 px-6 py-14 text-center framed">
          <div className="glow-soft pointer-events-none absolute -top-20 left-1/2 h-56 w-96 -translate-x-1/2" />
          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to lead the expedition?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm text-mono-400">
            Create a private channel in seconds and bring your group onto one calm, live map.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <button type="button" onClick={() => onStart('create')} className="btn btn-primary px-5 py-3">
              Create Expedition
              <Arrow className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onStart('join')} className="btn btn-secondary px-5 py-3">
              <QrIcon className="h-4 w-4" />
              Join via QR Code
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-mono-800 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-mono-950">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-mono-300">Trip Tracker</span>
          </div>
          <p className="text-[11px] text-mono-500">
            Real-time group travel · Built with React, Socket.IO & WebRTC
          </p>
        </div>
      </footer>
    </div>
  );
}
