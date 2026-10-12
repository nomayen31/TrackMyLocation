import React, { useEffect, useState } from 'react';

const PRESETS = [
  { label: '200 m', value: 200 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
];

const MIN = 50;
const MAX = 100000;

/**
 * SafeZonePanel — the admin's control for the geofenced safe zone.
 * Members (non-admins) see a read-only summary instead.
 */
export default function SafeZonePanel({ safeZone, isAdmin, onClose, onSet, onDisable }) {
  const [radius, setRadius] = useState(safeZone?.radiusM || 500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (safeZone?.radiusM) setRadius(safeZone.radiusM);
  }, [safeZone?.radiusM]);

  const active = Boolean(safeZone?.enabled);

  const submit = () => {
    const value = Number(radius);
    if (!Number.isFinite(value) || value < MIN || value > MAX) {
      setError(`Radius must be between ${MIN} m and 100 km.`);
      return;
    }
    setError('');
    setBusy(true);
    Promise.resolve(onSet?.(Math.round(value))).finally(() => setBusy(false));
  };

  return (
    <div
      className="fixed inset-0 z-[2700] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-mono-800 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white">Safe zone</h2>
            <p className="text-[11px] text-mono-400">
              {active ? `Active · ${safeZone.radiusM} m radius` : 'Not active'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {!isAdmin ? (
            <p className="rounded-xl border border-mono-800 bg-mono-850 px-3 py-3 text-xs leading-relaxed text-mono-300">
              The safe zone is managed by a trip admin. You’ll be alerted if anyone leaves the
              boundary.
            </p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-mono-400">
                A circle centred on <span className="font-semibold text-mono-200">your live location</span>.
                Everyone in the trip is alerted when a member crosses the boundary.
              </p>

              {/* Presets */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setRadius(p.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      Number(radius) === p.value
                        ? 'bg-neon-tri text-white shadow-glowViolet'
                        : 'border-mono-700 text-mono-300 hover:border-mono-500 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom radius */}
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
                  Radius (metres)
                </span>
                <input
                  type="number"
                  min={MIN}
                  max={MAX}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="input"
                />
              </label>

              {error && (
                <p className="mt-3 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
                  {error}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {active && (
                  <button
                    type="button"
                    onClick={() => onDisable?.()}
                    className="btn btn-secondary flex-1"
                  >
                    Turn off
                  </button>
                )}
                <button type="button" onClick={submit} disabled={busy} className="btn btn-primary flex-1">
                  {busy ? 'Saving…' : active ? 'Update zone' : 'Set safe zone'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
