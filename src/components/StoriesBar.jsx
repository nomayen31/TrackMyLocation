import React, { useMemo } from 'react';
import Avatar from './Avatar';

/**
 * StoriesBar — horizontal rail of everyone whose active stories are visible to
 * the current user (group + global + selected). Each ring is tappable.
 */
export default function StoriesBar({ stories = [], currentUser, onOpen, onAdd }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const story of stories) {
      const entry = map.get(story.userId) || {
        userId: story.userId,
        name: story.name,
        avatarUrl: story.avatarUrl,
        items: [],
      };
      entry.items.push(story);
      entry.name = story.name || entry.name;
      entry.avatarUrl = story.avatarUrl || entry.avatarUrl;
      map.set(story.userId, entry);
    }
    const list = [...map.values()].map((entry) => ({
      ...entry,
      seen: entry.items.every((s) => s.viewed || s.userId === currentUser?.id),
    }));
    // Unseen first, then the current user, then the rest.
    return list.sort((a, b) => {
      if (a.userId === currentUser?.id) return -1;
      if (b.userId === currentUser?.id) return 1;
      return Number(a.seen) - Number(b.seen);
    });
  }, [stories, currentUser?.id]);

  if (groups.length === 0 && !onAdd) return null;

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-mono-800 bg-mono-950/90 px-3 py-2.5 backdrop-blur">
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-mono-600 text-mono-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-5 w-5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="w-full truncate text-center text-[10px] font-semibold text-mono-400">
            Your story
          </span>
        </button>
      )}

      {groups.map((group) => (
        <button
          key={group.userId}
          type="button"
          onClick={() => onOpen?.(group.userId)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <Avatar
            name={group.name}
            src={group.avatarUrl}
            size="lg"
            hasStory={!group.seen}
            className={group.seen ? 'opacity-60' : ''}
          />
          <span className="w-full truncate text-center text-[10px] font-semibold text-mono-300">
            {group.userId === currentUser?.id ? 'You' : group.name}
          </span>
        </button>
      ))}
    </div>
  );
}
