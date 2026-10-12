import React from 'react';

/** mm:ss for a voice-note length. */
function clock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * MediaBubble — renders a chat attachment (image or voice note) inside a
 * message bubble. `mine` switches the surrounding look between the sender's
 * white bubble and the incoming dark bubble.
 *
 * Voice notes use a compact custom player; images open in a lightbox on tap.
 */
export default function MediaBubble({ type, data, mime, duration, mine = false, caption }) {
  if (!data) return null;

  if (type === 'audio') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              mine ? 'bg-white/20 text-white' : 'bg-white/10 text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          <audio
            controls
            src={data}
            preload="metadata"
            className="h-9 w-52 max-w-[60vw]"
          />
        </div>
        <span className={`text-[10px] ${mine ? 'text-white/70' : 'text-mono-400'}`}>
          Voice note{duration ? ` · ${clock(duration)}` : ''}
        </span>
      </div>
    );
  }

  // image
  return (
    <a
      href={data}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl"
      title="Open image"
    >
      <img
        src={data}
        alt={caption || 'Shared image'}
        loading="lazy"
        className="max-h-64 w-full max-w-[15rem] object-cover"
      />
    </a>
  );
}
