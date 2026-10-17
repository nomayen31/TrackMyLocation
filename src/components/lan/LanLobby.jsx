import React, { useState } from 'react';

/**
 * LanLobby — the first screen on the hotspot: pick a display name.
 * No password, no cloud account; the Pi issues a signed LAN token.
 */
export default function LanLobby({ info, nearby = [], busy, error, onJoin, onClearError }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('trip-tracker.lan.name') || '';
    } catch {
      return '';
    }
  });

  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    try {
      localStorage.setItem('trip-tracker.lan.name', clean);
    } catch {
      /* storage unavailable */
    }
    onJoin?.(clean);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="hero-panel text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/15 text-2xl">
          📶
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
          {info?.networkName || 'Hotspot'}
        </h1>
        <p className="mt-1 text-sm text-mono-300">
          You're on the group Wi-Fi. No internet needed.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent-300">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {(nearby?.length || 0)} {nearby?.length === 1 ? 'person' : 'people'} in the signal
        </p>
      </div>

      {nearby.length > 0 && (
        <div className="card card-pad animate-fade-up">
          <h2 className="section-title">Already here</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((p) => (
              <li
                key={p.deviceId}
                className="flex items-center gap-2 rounded-full border border-mono-800/80 bg-mono-900/60 py-1 pl-1 pr-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-tri text-xs font-bold text-white">
                  {p.name?.[0]?.toUpperCase() || '?'}
                </span>
                <span className="text-xs font-medium text-white">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="card card-pad animate-fade-up">
        <h2 className="section-title">Join this hotspot</h2>
        <p className="section-hint mt-0.5">Pick the name your group will see.</p>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
            Display name
          </span>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              onClearError?.();
            }}
            placeholder="e.g. Maya"
            className="input text-base"
            autoFocus
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg border border-sos/40 bg-sos/10 px-3 py-2 text-sm text-sos-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary mt-4 w-full py-3">
          {busy ? 'Joining…' : 'Join the hotspot'}
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-mono-500">
          Anyone connected to this Wi-Fi can see your name and join the group call.
          Up to {info?.maxPeers || 6} people can talk at once.
        </p>
      </form>
    </div>
  );
}
