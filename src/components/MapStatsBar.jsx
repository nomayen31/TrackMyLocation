import React from 'react';
import { formatDistance } from '../distance';

/**
 * MapStatsBar — the sleek top bar above the framed map card. Shows the active
 * expedition name and live stats: members sharing, nearest member, and spread.
 */
export default function MapStatsBar({ groupName, sharing = 0, nearest = null, farthest = null, weather = null }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-neon/20 bg-mono-900/70 px-3 py-2.5 shadow-card backdrop-blur-xl">
      {/* Expedition identity */}
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold tracking-tight text-white">
            {groupName || 'Expedition'}
          </p>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent-300 shadow-glowEmerald">
            Live GPS
          </span>
        </div>
      </div>

      <span className="h-8 w-px shrink-0 bg-mono-800" />

      <Stat label="Sharing" value={String(sharing)} />
      <Stat label="Nearest" value={nearest != null ? formatDistance(nearest) : '—'} accent />
      <Stat label="Spread" value={farthest != null ? formatDistance(farthest) : '—'} />

      {/* Weather chip (small screens — the floating widget covers desktop) */}
      {weather && !weather.error && (
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">
          <span className="text-[10px] font-semibold text-mono-400">
            {weather.temperature != null ? `${weather.temperature}° ${weather.label}` : '—'}
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false, hideOnDesktop = false }) {
  return (
    <div className={`shrink-0 ${hideOnDesktop ? 'md:hidden' : ''}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-mono-500">{label}</p>
      <p className={`text-sm font-extrabold leading-tight ${accent ? 'text-accent-300' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
