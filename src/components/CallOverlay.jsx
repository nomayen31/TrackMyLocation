import React, { useEffect, useRef } from 'react';

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Round neon control button. */
function CallButton({ label, onClick, variant = 'glass', pulsing = false, children }) {
  const variants = {
    // Glowing emerald — accept / unmute-to-talk.
    accept:
      'border border-accent/50 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_28px_rgba(16,185,129,0.6)] hover:shadow-[0_0_38px_rgba(16,185,129,0.85)]',
    // Glowing crimson — decline / end.
    danger:
      'border border-sos/60 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_28px_rgba(244,63,94,0.6)] hover:shadow-[0_0_38px_rgba(244,63,94,0.85)]',
    // Frosted glass — mute.
    glass:
      'border border-mono-700/80 bg-white/5 text-white backdrop-blur-xl hover:border-neon/60 hover:bg-white/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-16 w-16 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 ${variants[variant]} ${
        pulsing ? 'animate-pulse' : ''
      }`}
    >
      {children}
    </button>
  );
}

/**
 * CallOverlay — full-screen neon call UI for incoming / outgoing / active calls.
 *
 * The remote audio stream is attached to a hidden <audio> element, so the browser
 * plays it with no visible player.
 */
export default function CallOverlay({ call }) {
  const audioRef = useRef(null);
  const { state, peer, muted, seconds, remoteStream, error, accept, reject, hangup, toggleMute } =
    call;

  // Play the remote track through the invisible audio element.
  useEffect(() => {
    const el = audioRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  if (state === 'idle' || !peer) return null;

  const isIncoming = state === 'incoming';
  const isOngoing = state === 'active' || state === 'calling';

  // Status copy + semantic colour.
  let statusText = 'Call ended';
  let statusClass = 'text-mono-400';
  let statusDot = 'bg-mono-600';
  if (state === 'incoming') {
    statusText = 'Incoming call…';
    statusClass = 'text-accent-300';
    statusDot = 'bg-accent';
  } else if (state === 'calling') {
    statusText = 'Ringing…';
    statusClass = 'text-electric-300';
    statusDot = 'bg-electric-400';
  } else if (state === 'active') {
    statusText = 'Connected';
    statusClass = 'text-accent-300';
    statusDot = 'bg-accent';
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-mono-950/90 px-5 backdrop-blur-md">
      {/* Ambient neon glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
            state === 'active' ? 'bg-accent/25' : state === 'incoming' ? 'bg-neon/25' : 'bg-electric/20'
          }`}
        />
      </div>

      {/* Invisible remote-audio sink */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="relative w-full max-w-sm rounded-3xl border border-mono-800/80 bg-mono-900/70 p-7 text-center shadow-lift backdrop-blur-xl">
        {/* Caller avatar with a rotating neon ring */}
        <div className="relative mx-auto h-32 w-32">
          <span
            className={`absolute inset-0 rounded-full ${
              isOngoing ? 'story-ring-ui' : 'border border-mono-700'
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

        {/* Caller identity */}
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white">{peer.name}</h2>

        {/* Status + timer */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot} ${isOngoing ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-semibold ${statusClass}`}>{statusText}</span>
          {state === 'active' && (
            <>
              <span className="text-mono-600">·</span>
              <span className="font-mono text-sm font-semibold text-white">{clock(seconds)}</span>
            </>
          )}
        </div>

        {state === 'active' && muted && (
          <p className="mt-2 text-xs font-semibold text-warning-300">Microphone muted</p>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
                  <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
                  <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
                </svg>
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
                <CallButton label={muted ? 'Unmute' : 'Mute'} variant="glass" onClick={toggleMute}>
                  {muted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6">
                      <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 12V6a3 3 0 0 0-5.9-.7" />
                      <path d="M5 11v1a7 7 0 0 0 10.8 6M19 11v1a7 7 0 0 1-1.2 3.9M12 19v3M4 4l16 16" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                    </svg>
                  )}
                </CallButton>
              )}
              <CallButton label="End call" variant="danger" onClick={hangup}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
                  <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
                  <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
                </svg>
              </CallButton>
            </>
          )}
        </div>

        {state === 'calling' && (
          <p className="mt-5 text-xs text-mono-400">Waiting for {peer.name} to answer…</p>
        )}
        {state === 'incoming' && (
          <p className="mt-5 text-xs text-mono-400">Tap the green button to answer</p>
        )}
      </div>
    </div>
  );
}
