import React, { useEffect, useRef, useState } from 'react';
import useWakeLock from '../hooks/useWakeLock';

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Round control button with neon variants. */
function CallButton({ label, onClick, variant = 'glass', pulsing = false, size = 'lg', children }) {
  const sizes = { lg: 'h-16 w-16', sm: 'h-11 w-11' };
  const variants = {
    accept:
      'border border-accent/50 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_28px_rgba(16,185,129,0.6)] hover:shadow-[0_0_40px_rgba(16,185,129,0.9)]',
    danger:
      'border border-sos/60 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_28px_rgba(244,63,94,0.6)] hover:shadow-[0_0_40px_rgba(244,63,94,0.9)]',
    glass:
      'border border-mono-700/80 bg-white/5 text-white backdrop-blur-xl hover:border-neon/60 hover:bg-white/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex ${sizes[size]} items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 ${variants[variant]} ${
        pulsing ? 'animate-pulse' : ''
      }`}
    >
      {children}
    </button>
  );
}

/**
 * CallOverlay — professional 1-to-1 call UI.
 *
 * • Full-screen while ringing, so it's unmissable on mobile.
 * • Minimises to a floating pill so you can keep using the app mid-call.
 * • Screen wake lock while the call is live.
 * • Shows the active DSP (noise suppression / echo cancellation).
 */
export default function CallOverlay({ call }) {
  const audioRef = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const { state, peer, muted, seconds, remoteStream, error, accept, reject, hangup, toggleMute } = call;

  const isIncoming = state === 'incoming';
  const isOngoing = state === 'active' || state === 'calling';
  const inCall = state !== 'idle' && Boolean(peer);

  useWakeLock(inCall);

  // Play the remote track via a hidden element.
  useEffect(() => {
    const el = audioRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  // Reset minimised state when a new call starts.
  useEffect(() => {
    if (state === 'incoming' || state === 'calling') setMinimized(false);
  }, [state]);

  if (!inCall) return null;

  let statusText = 'Call ended';
  let statusTone = 'text-mono-400';
  let dot = 'bg-mono-600';
  if (state === 'incoming') {
    statusText = 'Incoming voice call';
    statusTone = 'text-accent-300';
    dot = 'bg-accent';
  } else if (state === 'calling') {
    statusText = 'Ringing…';
    statusTone = 'text-electric-300';
    dot = 'bg-electric-400';
  } else if (state === 'active') {
    statusText = 'Connected';
    statusTone = 'text-accent-300';
    dot = 'bg-accent';
  }

  /* ------------------------------------------------------------ minimized */
  if (minimized && !isIncoming) {
    return (
      <>
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
        <div className="fixed inset-x-0 bottom-20 z-[3000] flex justify-center px-3 sm:bottom-6">
          <div className="flex items-center gap-3 rounded-full border border-accent/40 bg-mono-900/95 px-3 py-2 shadow-lift backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="flex items-center gap-2.5"
              aria-label="Expand call"
            >
              <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-accent/50 bg-mono-800 text-xs font-bold text-white">
                {peer.avatarUrl ? (
                  <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  peer.name?.[0]?.toUpperCase() || '?'
                )}
              </span>
              <span className="text-left">
                <span className="block max-w-[8rem] truncate text-xs font-bold text-white">
                  {peer.name}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-accent-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {state === 'calling' ? 'Ringing…' : clock(seconds)}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                muted ? 'border-sos/60 bg-sos text-white' : 'border-mono-700 bg-white/5 text-white'
              }`}
            >
              <MicGlyph muted={muted} className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={hangup}
              aria-label="End call"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sos text-white"
            >
              <HangupGlyph className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ------------------------------------------------------------ full view */
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-mono-950 px-5">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {peer.avatarUrl && (
          <img
            src={peer.avatarUrl}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-[0.06] blur-2xl"
          />
        )}
        <div
          className={`absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
            state === 'active' ? 'bg-accent/25' : state === 'incoming' ? 'bg-neon/25' : 'bg-electric/20'
          }`}
        />
      </div>

      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="relative w-full max-w-sm rounded-[28px] border border-mono-800/80 bg-mono-900/70 p-7 text-center shadow-lift backdrop-blur-2xl">
        {!isIncoming && (
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-mono-400 hover:bg-white/10 hover:text-white"
            aria-label="Minimize call"
            title="Minimize"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M5 12h14" />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div className="relative mx-auto h-32 w-32">
          <span
            className={`absolute inset-0 rounded-full ${
              isOngoing || isIncoming ? 'story-ring-ui' : 'border border-mono-700'
            }`}
            aria-hidden="true"
          />
          <span className="absolute inset-[3px] rounded-full bg-mono-950" aria-hidden="true" />
          <span className="absolute inset-[6px] flex items-center justify-center overflow-hidden rounded-full border border-mono-800 bg-mono-900">
            {peer.avatarUrl ? (
              <img src={peer.avatarUrl} alt={peer.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-white">
                {peer.name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </span>
        </div>

        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white">{peer.name}</h2>

        <div className="mt-2 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot} ${isOngoing ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-semibold ${statusTone}`}>{statusText}</span>
          {state === 'active' && (
            <>
              <span className="text-mono-600">·</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-white">
                {clock(seconds)}
              </span>
            </>
          )}
        </div>

        {/* Audio processing indicator */}
        {state === 'active' && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="chip chip-success">Noise suppression</span>
            <span className="chip chip-slate">Echo cancel</span>
            {muted && <span className="chip chip-danger">Muted</span>}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-sos/40 bg-sos/10 px-3 py-2 text-xs font-semibold text-sos-300">
            {error}
          </p>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-5">
          {isIncoming ? (
            <>
              <CallButton label="Decline call" variant="danger" onClick={reject}>
                <HangupGlyph className="h-6 w-6" />
              </CallButton>
              <CallButton label="Accept call" variant="accept" pulsing onClick={accept}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6">
                  <path d="M5 12.5c1-3.2 4-5.5 7-5.5s6 2.3 7 5.5" />
                  <path d="M8 11.5 6.5 15M16 11.5 17.5 15" />
                </svg>
              </CallButton>
            </>
          ) : (
            <>
              {state === 'active' && (
                <CallButton label={muted ? 'Unmute microphone' : 'Mute microphone'} variant="glass" onClick={toggleMute}>
                  <MicGlyph muted={muted} className="h-6 w-6" />
                </CallButton>
              )}
              <CallButton label="End call" variant="danger" onClick={hangup}>
                <HangupGlyph className="h-6 w-6" />
              </CallButton>
            </>
          )}
        </div>

        {state === 'calling' && (
          <p className="mt-5 text-xs text-mono-400">Waiting for {peer.name} to answer…</p>
        )}
        {isIncoming && (
          <p className="mt-5 text-xs text-mono-400">Green to answer · red to decline</p>
        )}
        {state === 'active' && (
          <p className="mt-5 text-[11px] text-mono-500">
            Tap minimize to keep browsing during the call
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- glyphs */
function MicGlyph({ muted, className = 'h-5 w-5' }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 12V6a3 3 0 0 0-5.9-.7" />
      <path d="M5 11v1a7 7 0 0 0 10.8 6M19 11v1a7 7 0 0 1-1.2 3.9M12 19v3M4 4l16 16" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function HangupGlyph({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={`${className} rotate-[135deg]`}>
      <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
      <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
    </svg>
  );
}
