import React, { useEffect, useRef } from 'react';
import Avatar from './Avatar';

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Round control button used by the call overlay. */
function CallButton({ label, onClick, tone = 'neutral', children }) {
  const tones = {
    accept: 'bg-accent text-mono-950 hover:brightness-110',
    danger: 'bg-sos text-white shadow-glowRose hover:bg-sos-600',
    neutral: 'border border-mono-700 bg-mono-850 text-white hover:border-mono-500',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition active:translate-y-px ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/**
 * CallOverlay — full-screen UI for incoming / outgoing / active voice calls.
 * Plays the remote audio track through a hidden <audio> element.
 */
export default function CallOverlay({ call }) {
  const audioRef = useRef(null);
  const { state, peer, muted, seconds, remoteStream, accept, reject, hangup, toggleMute } = call;

  // Attach the remote MediaStream to the audio element.
  useEffect(() => {
    const el = audioRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  if (state === 'idle' || !peer) return null;

  const ongoing = state === 'active' || state === 'calling';
  const statusText =
    state === 'incoming'
      ? 'Incoming voice call'
      : state === 'calling'
        ? 'Calling…'
        : state === 'ended'
          ? 'Call ended'
          : `In call · ${clock(seconds)}`;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-6 bg-black/95 px-6 backdrop-blur-md">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="relative">
        <span
          className={`absolute -inset-3 rounded-full ${
            ongoing ? 'story-ring-ui' : 'border border-mono-800'
          }`}
          aria-hidden="true"
        />
        <span className="relative block rounded-full bg-mono-950 p-1">
          <Avatar name={peer.name} src={peer.avatarUrl} size="xl" />
        </span>
      </div>

      <div className="text-center">
        <p className="text-xl font-extrabold tracking-tight text-white">{peer.name}</p>
        <p className="mt-1 text-sm text-mono-400">{statusText}</p>
      </div>

      <div className="flex items-center gap-4">
        {state === 'incoming' ? (
          <>
            <CallButton label="Decline" tone="danger" onClick={reject}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
                <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
                <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
              </svg>
            </CallButton>
            <CallButton label="Accept" tone="accept" onClick={accept}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6">
                <path d="M5 12.5c1-3.2 4-5.5 7-5.5s6 2.3 7 5.5" />
                <path d="M8 11.5 6.5 15M16 11.5 17.5 15" />
              </svg>
            </CallButton>
          </>
        ) : (
          <>
            {state === 'active' && (
              <CallButton label={muted ? 'Unmute' : 'Mute'} tone="neutral" onClick={toggleMute}>
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
            <CallButton label="Hang up" tone="danger" onClick={hangup}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
                <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
                <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
              </svg>
            </CallButton>
          </>
        )}
      </div>

      {state === 'calling' && <p className="text-xs text-mono-500">Waiting for {peer.name} to answer…</p>}
    </div>
  );
}
