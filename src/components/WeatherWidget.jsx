import React from 'react';

const P = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-5 w-5',
};

const GLYPHS = {
  clear: (
    <svg {...P}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  ),
  partly: (
    <svg {...P}>
      <circle cx="8.5" cy="9" r="3" />
      <path d="M8.5 3v1.5M3 9h1.5M14.5 15h4a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1.2" />
      <path d="M5 19h11a3 3 0 0 0 0-6" />
    </svg>
  ),
  cloudy: (
    <svg {...P}>
      <path d="M6 18h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 18z" />
    </svg>
  ),
  fog: (
    <svg {...P}>
      <path d="M6 15h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 15z" />
      <path d="M5 19h14M7 22h10" />
    </svg>
  ),
  drizzle: (
    <svg {...P}>
      <path d="M6 15h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 15z" />
      <path d="M9 18v2M13 18v2M17 18v2" />
    </svg>
  ),
  rain: (
    <svg {...P}>
      <path d="M6 14h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 14z" />
      <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
    </svg>
  ),
  showers: (
    <svg {...P}>
      <path d="M6 13h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 13z" />
      <path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3M20 17l-1 2" />
    </svg>
  ),
  snow: (
    <svg {...P}>
      <path d="M6 13h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 13z" />
      <path d="M9 17h.01M13 19h.01M17 17h.01M11 21h.01" />
    </svg>
  ),
  storm: (
    <svg {...P}>
      <path d="M6 13h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 6 13z" />
      <path d="m12 15-2 4h3l-1 3 3-4h-2.5z" />
    </svg>
  ),
  unknown: (
    <svg {...P}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

/**
 * WeatherWidget — floating current-conditions card for the expedition map.
 */
export default function WeatherWidget({ weather, className = '' }) {
  if (!weather) return null;

  return (
    <div
      className={`rounded-2xl border border-mono-800 bg-mono-900/90 p-3 shadow-card backdrop-blur ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-mono-800 bg-mono-850 text-white">
          {GLYPHS[weather.condition] || GLYPHS.unknown}
        </span>
        <div className="min-w-0">
          {weather.error ? (
            <p className="text-[11px] text-mono-400">{weather.error}</p>
          ) : weather.loading && weather.temperature == null ? (
            <div className="skeleton h-4 w-16" />
          ) : (
            <>
              <p className="text-lg font-extrabold leading-none text-white">
                {weather.temperature}°
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-mono-400">
                {weather.label}
                {weather.wind != null ? ` · ${weather.wind} km/h` : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
