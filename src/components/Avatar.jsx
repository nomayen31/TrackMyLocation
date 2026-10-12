import React from 'react';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

/**
 * Avatar — monochrome user badge with an optional glowing "story ring".
 *
 * `hasStory` adds a rotating green ring; `onClick` makes the ring/photo
 * tappable (used to open the story viewer).
 */
export default function Avatar({
  name,
  src,
  size = 'md',
  hasStory = false,
  onClick,
  className = '',
}) {
  const sizeClass = SIZES[size] || size;

  const inner = src ? (
    <img src={src} alt={name || 'Member'} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-mono-800 font-bold text-mono-100">
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  );

  const photo = (
    <span className={`${sizeClass} block overflow-hidden rounded-full border border-mono-900`}>
      {inner}
    </span>
  );

  const content = hasStory ? (
    <span className="relative inline-flex items-center justify-center">
      <span className="story-ring-ui absolute inset-0 rounded-full" aria-hidden="true" />
      <span className="relative m-[3px] inline-flex">{photo}</span>
    </span>
  ) : (
    photo
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-full ${className}`}
        aria-label={hasStory ? `View ${name || 'member'}'s story` : name || 'Member'}
      >
        {content}
      </button>
    );
  }

  return <span className={`inline-flex shrink-0 ${className}`}>{content}</span>;
}
