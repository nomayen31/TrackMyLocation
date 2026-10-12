import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

const IMAGE_MS = 5000;
const TEXT_MS = 6000;

function timeAgo(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/**
 * StoryViewer — full-screen player for one member's active stories.
 *
 * Supports image / video / text stories and enforces **view-once**: the feed
 * withholds the media of an unopened one-time story, so it is fetched exactly
 * once from POST /api/stories/:id/view. Afterwards the API returns 410 and the
 * story is never shown again.
 */
export default function StoryViewer({ user, stories, currentUser, onClose, onViewed, onDelete }) {
  const items = stories || [];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [consumed, setConsumed] = useState(() => new Set());
  const [payload, setPayload] = useState(null); // one-time media, once revealed
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const current = items[index];
  const isOwn = current?.userId === currentUser?.id;
  const oneTime = Boolean(current && current.viewOnce && !isOwn);
  const blocked = Boolean(current && oneTime && consumed.has(current.id));
  const waiting = Boolean(current && oneTime && !blocked && !payload);

  // The effective story content (revealed payload wins over the masked row).
  const active = payload ? { ...current, ...payload } : current;

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 < items.length) return i + 1;
      onClose?.();
      return i;
    });
  }, [items.length, onClose]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Reset per-story state as the visible story changes.
  useEffect(() => {
    setProgress(0);
    setPayload(null);
  }, [index]);

  // Record the view; for a one-time story this fetches the single-use payload.
  useEffect(() => {
    if (!current) return undefined;
    const story = current;
    const own = story.userId === currentUser?.id;

    if (!own && !story.viewed) {
      if (story.viewOnce) setLoading(true);
      api
        .post(`/api/stories/${story.id}/view`)
        .then((res) => {
          if (res.data?.payload) setPayload(res.data.payload);
          // Refresh immediately for normal stories; for one-time stories we
          // wait until the viewer leaves, otherwise the feed would drop it
          // from the list before the user has seen it.
          if (!story.viewOnce) onViewed?.(story.id);
        })
        .catch((err) => {
          if (err.response?.status === 410) {
            setConsumed((s) => new Set(s).add(story.id));
          }
        })
        .finally(() => setLoading(false));
    }

    // Lock (and refresh) a one-time story once we navigate away from it.
    return () => {
      if (story.viewOnce && !own) {
        setConsumed((s) => new Set(s).add(story.id));
        onViewed?.(story.id);
      }
    };
  }, [current, currentUser?.id, onViewed]);

  // Timed advance for image / text stories (starts once content is ready).
  useEffect(() => {
    if (!current || blocked || waiting) return undefined;
    if (active?.mediaType === 'video') return undefined; // advances on "ended"

    const duration = active?.mediaType === 'text' ? TEXT_MS : IMAGE_MS;
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) next();
    }, 60);
    return () => clearInterval(timerRef.current);
  }, [current, active?.mediaType, blocked, waiting, next]);

  // Consumed one-time stories flash a notice, then advance.
  useEffect(() => {
    if (!blocked) return undefined;
    const t = setTimeout(next, 1400);
    return () => clearTimeout(t);
  }, [blocked, next]);

  // Keyboard controls.
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

  const media = (() => {
    if (blocked) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-mono-950 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-mono-700 text-mono-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-6 w-6">
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A9 9 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.4 2-1.2 3.1M6.3 6.6C4.3 8 3 10 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-white">Already viewed</p>
          <p className="text-xs text-mono-400">This story could only be opened once.</p>
        </div>
      );
    }
    if (waiting) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-mono-950">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-mono-600 border-t-white" />
        </div>
      );
    }
    if (active?.mediaType === 'video' && active.media) {
      return (
        <video
          src={active.media}
          className="h-full w-full object-contain"
          autoPlay
          playsInline
          onEnded={next}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
          }}
        />
      );
    }
    if (active?.mediaType === 'text') {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mono-900 to-mono-950 px-8">
          <p className="max-h-full overflow-y-auto text-center text-2xl font-bold leading-snug text-white">
            {active.text}
          </p>
        </div>
      );
    }
    if (active?.media) {
      return (
        <img
          src={active.media}
          alt={active.caption || `${user.name}'s story`}
          className="h-full w-full object-contain"
        />
      );
    }
    return <div className="h-full w-full bg-mono-950" />;
  })();

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
            <p className="flex flex-wrap items-center gap-2 truncate text-sm font-bold text-white">
              {user.name}
              {current.viewOnce && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-300">
                  View once
                </span>
              )}
              {current.privacy === 'global' && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mono-200">
                  Everyone
                </span>
              )}
              {current.privacy === 'selected' && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mono-200">
                  Selected
                </span>
              )}
            </p>
            <p className="text-[11px] text-mono-400">
              {timeAgo(current.createdAt)}
              {current.groupName ? ` · ${current.groupName}` : ''}
            </p>
          </div>
          {isOwn && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(current.id)}
              aria-label="Delete story"
              className="flex h-9 w-9 items-center justify-center rounded-full text-mono-300 hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
                <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
              </svg>
            </button>
          )}
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
            {media}
            <button type="button" aria-label="Previous story" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
            <button type="button" aria-label="Next story" onClick={next} className="absolute inset-y-0 right-0 w-1/3" />
            {active?.caption && !blocked && !waiting && (
              <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-10 text-sm font-medium text-white">
                {active.caption}
              </p>
            )}
          </div>
          {loading && (
            <span className="pointer-events-none absolute right-5 top-5 h-4 w-4 animate-spin rounded-full border-2 border-mono-600 border-t-white" />
          )}
        </div>
      </div>
    </div>
  );
}
