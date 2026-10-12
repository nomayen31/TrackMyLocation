import React from 'react';

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

/**
 * VoiceParticipant — one person in the room: avatar, name, mic state and a
 * glowing ring + waveform when they are speaking.
 */
export default function VoiceParticipant({ participant, isSpeaking, isSelf }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition duration-200 ${
        isSpeaking
          ? 'border-accent/60 bg-accent/10 shadow-[0_0_24px_rgba(16,185,129,0.45)]'
          : 'border-mono-800/80 bg-mono-900/60'
      }`}
    >
      <div className="relative">
        {isSpeaking && (
          <span className="absolute -inset-1 rounded-full bg-accent/25 blur-sm" aria-hidden="true" />
        )}
        <span
          className={`relative block h-12 w-12 overflow-hidden rounded-full border-2 ${
            isSpeaking ? 'border-accent' : 'border-mono-700'
          }`}
        >
          {participant.avatarUrl ? (
            <img src={participant.avatarUrl} alt={participant.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-mono-800 text-sm font-bold text-mono-100">
              {participant.name?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </span>
        {/* Mic badge */}
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-mono-950 ${
            participant.muted ? 'bg-sos text-white' : 'bg-accent text-mono-950'
          }`}
          title={participant.muted ? 'Muted' : 'Mic on'}
        >
          {participant.muted ? <MicOff className="h-3 w-3" /> : <MicOn className="h-3 w-3" />}
        </span>
      </div>

      <span className="max-w-[7rem] truncate text-xs font-semibold text-white">
        {participant.name}
        {isSelf && <span className="ml-1 text-[10px] font-normal text-mono-500">(you)</span>}
      </span>

      {/* Speaking waveform */}
      <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-0.5 rounded-full transition-all duration-150 ${
              isSpeaking ? 'bg-accent' : 'bg-mono-700'
            }`}
            style={{ height: isSpeaking ? `${4 + ((i * 5) % 11)}px` : '3px' }}
          />
        ))}
      </span>
    </div>
  );
}
