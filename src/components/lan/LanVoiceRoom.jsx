import React, { useRef } from 'react';
import useMeshVoice from '../../lan/useMeshVoice';

/** Mic on / off glyphs. */
const MicOn = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const MicOff = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
    <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 12V6a3 3 0 0 0-5.9-.7" />
    <path d="M5 11v1a7 7 0 0 0 10.8 6M19 11v1a7 7 0 0 1-1.2 3.9M12 19v3M4 4l16 16" />
  </svg>
);

const STATE = {
  idle: { label: 'Not in a call', dot: 'bg-mono-600', cls: 'text-mono-400' },
  connecting: { label: 'Connecting…', dot: 'bg-warning', cls: 'text-warning-300' },
  connected: { label: 'In the call', dot: 'bg-accent', cls: 'text-accent-300' },
};

/** One participant tile with a speaking ring. */
function Tile({ person, isSelf, speaking, muted }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
        speaking
          ? 'border-accent/60 bg-accent/10 shadow-[0_0_24px_rgba(16,185,129,0.45)]'
          : 'border-mono-800/80 bg-mono-900/60'
      }`}
    >
      <div className="relative">
        {speaking && <span className="absolute -inset-1 rounded-full bg-accent/25 blur-sm" aria-hidden="true" />}
        <span
          className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold text-white ${
            speaking ? 'border-accent bg-mono-850' : 'border-mono-700 bg-mono-850'
          }`}
        >
          {person.name?.[0]?.toUpperCase() || '?'}
        </span>
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-mono-950 ${
            muted ? 'bg-sos text-white' : 'bg-accent text-mono-950'
          }`}
        >
          {muted ? <MicOff className="h-3 w-3" /> : <MicOn className="h-3 w-3" />}
        </span>
      </div>

      <span className="max-w-[7rem] truncate text-xs font-semibold text-white">
        {person.name}
        {isSelf && <span className="ml-1 text-[10px] font-normal text-mono-500">(you)</span>}
      </span>

      <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-0.5 rounded-full ${speaking ? 'bg-accent' : 'bg-mono-700'}`}
            style={{ height: speaking ? `${4 + ((i * 5) % 11)}px` : '3px' }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * LanVoiceRoom — nearby people + group voice.
 * Audio comes from peer connections; the hidden host holds the <audio> elements.
 */
export default function LanVoiceRoom({ lan }) {
  const audioHostRef = useRef(null);
  const voice = useMeshVoice(lan.socket, lan.user, audioHostRef);

  const status = STATE[voice.connState] || STATE.idle;
  const selfId = lan.user?.deviceId;
  const nearby = lan.nearby || [];
  const others = nearby.filter((p) => p.deviceId !== selfId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Hidden sink for remote audio tracks */}
      <div ref={audioHostRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <div className="hero-panel">
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-300">
              Hotspot · offline
            </p>
            <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight text-white">
              {lan.info?.networkName || 'Hotspot'}
            </h1>
            <p className="mt-1 text-xs text-mono-300">
              {nearby.length} {nearby.length === 1 ? 'device' : 'devices'} connected · you are{' '}
              <span className="font-semibold text-white">{lan.user?.name}</span>
            </p>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-full border border-mono-800 bg-mono-950/60 px-3 py-1 text-[11px] font-semibold ${status.cls}`}>
            <span className={`h-2 w-2 rounded-full ${status.dot} ${voice.inCall ? 'animate-pulse' : ''}`} />
            {status.label}
          </span>
        </div>
      </div>

      {voice.error && (
        <div className="flex items-start gap-2 rounded-xl border border-sos/40 bg-sos/10 px-3 py-2.5 text-sm text-sos-300">
          <span className="flex-1">{voice.error}</span>
          <button type="button" onClick={voice.clearError} className="text-sos-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* In-call view */}
      {voice.inCall ? (
        <>
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="section-title">In the call</h2>
              <span className="chip chip-brand">{voice.participants.length}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {voice.participants.map((p) => (
                <Tile
                  key={p.deviceId}
                  person={p}
                  isSelf={p.deviceId === selfId}
                  speaking={voice.speakingSet.has(p.deviceId === selfId ? 'self' : p.deviceId)}
                  muted={p.deviceId === selfId ? voice.muted : false}
                />
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={voice.toggleMute}
                aria-pressed={voice.muted}
                className={`flex h-14 w-14 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95 ${
                  voice.muted
                    ? 'border-sos/60 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_26px_rgba(244,63,94,0.6)]'
                    : 'border-accent/50 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_26px_rgba(16,185,129,0.6)]'
                }`}
                aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {voice.muted ? <MicOff className="h-6 w-6" /> : <MicOn className="h-6 w-6" />}
              </button>

              <button
                type="button"
                onClick={voice.leave}
                aria-label="Leave the call"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-mono-700/80 bg-white/5 text-white backdrop-blur transition hover:scale-105 hover:border-sos/60 hover:bg-sos/15 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
                  <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
                  <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
                </svg>
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-mono-400">
              {voice.muted ? 'You are muted.' : 'Your microphone is live.'} Audio goes directly
              between devices over Wi-Fi.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Nearby list */}
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="section-title">In the signal</h2>
              <span className="chip chip-brand">{others.length}</span>
            </div>

            {others.length === 0 ? (
              <div className="empty-state py-8">
                <span className="empty-state-icon">📡</span>
                <p className="text-sm font-semibold text-white">You're the first one here</p>
                <p className="text-xs text-mono-400">
                  Others will appear as they join the Wi-Fi and open this page.
                </p>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {others.map((p) => (
                  <li
                    key={p.deviceId}
                    className="flex items-center gap-3 rounded-xl border border-mono-800/80 bg-mono-900/50 px-3 py-2.5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mono-800 text-sm font-bold text-white">
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                      {p.name}
                    </span>
                    <span className="chip chip-success">online</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={voice.join}
            disabled={voice.busy}
            className="btn btn-primary w-full py-3.5 text-base"
          >
            {voice.busy ? 'Starting…' : `Join group voice${others.length ? ` · ${others.length + 1} here` : ''}`}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-mono-500">
            The call is peer-to-peer over this Wi-Fi — no internet required. Allow microphone
            access when your browser asks. Up to {lan.info?.maxPeers || 6} people.
          </p>
        </>
      )}

      <button
        type="button"
        onClick={lan.leave}
        className="mx-auto text-xs font-semibold text-mono-500 underline-offset-4 hover:text-white hover:underline"
      >
        Leave this hotspot
      </button>
    </div>
  );
}
