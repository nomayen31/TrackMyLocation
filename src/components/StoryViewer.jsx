import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';

const STORY_DURATION = 5000; // ms per story

function timeAgo(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

/**
 * StoryViewer — full-screen story player with auto-advance and segmented
 * progress bars. Renders one member's active stories in order.
 */
export default function StoryViewer({ user, stories, onClose }) {
  const items = stories || [];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const current = items[index];

  const next = React.useCallback(() => {
    setIndex((i) => {
      if (i + 1 < items.length) return i + 1;
      onClose?.();
      return i;
    });
  }, [items.length, onClose]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Reset the progress bar whenever the visible story changes.
  useEffect(() => {
    setProgress(0);
  }, [index]);

  // Drive the progress bar + auto-advance.
  useEffect(() => {
    if (!current) return undefined;
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / STORY_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) next();
    }, 60);
    return () => clearInterval(timerRef.current);
  }, [current, next]);

  // Keyboard: Escape closes, arrows navigate.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, onClose]);

  if (!user || !current) return null;

  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-black/95 backdrop-blur">
      <div className="relative flex h-full w-full max-w-md flex-col">
        {/* Progress segments */}
        <div className="flex gap-1 px-3 pt-3">
          {items.map((story, i) => (
            <span key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full bg-white transition-[width] duration-100 ease-linear"
                style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
              />
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user.name}</p>
            <p className="text-[11px] text-mono-400">{timeAgo(current.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close story"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Media + tap zones */}
        <div className="relative flex-1 overflow-hidden px-2 pb-6">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-mono-800 bg-mono-900">
            <img
              src={current.media}
              alt={current.caption || `${user.name}'s story`}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              aria-label="Previous story"
              onClick={prev}
              className="absolute inset-y-0 left-0 w-1/3"
            />
            <button
              type="button"
              aria-label="Next story"
              onClick={next}
              className="absolute inset-y-0 right-0 w-1/3"
            />
            {current.caption && (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-10 text-sm font-medium text-white">
                {current.caption}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
