import React from 'react';

/**
 * VoiceControls — mic toggle + leave. Glowing green when live, red when muted.
 */
export default function VoiceControls({ muted, onToggleMute, onLeave, disabled = false }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        className={`flex h-14 w-14 items-center justify-center rounded-full border transition duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 ${
          muted
            ? 'border-sos/60 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_26px_rgba(244,63,94,0.6)]'
            : 'border-accent/50 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_0_26px_rgba(16,185,129,0.6)]'
        }`}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6">
            <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 12V6a3 3 0 0 0-5.9-.7" />
            <path d="M5 11v1a7 7 0 0 0 10.8 6M19 11v1a7 7 0 0 1-1.2 3.9M12 19v3M4 4l16 16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={onLeave}
        disabled={disabled}
        aria-label="Leave the voice room"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-mono-700/80 bg-white/5 text-white backdrop-blur-xl transition duration-200 hover:scale-105 hover:border-sos/60 hover:bg-sos/15 active:scale-95 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-6 w-6 rotate-[135deg]">
          <path d="M4 13c0-3 4-6 8-6s8 3 8 6" />
          <path d="M7.5 11.5 6 15M16.5 11.5 18 15" />
        </svg>
      </button>
    </div>
  );
}
