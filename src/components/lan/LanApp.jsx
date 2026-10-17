import React from 'react';
import useLan from '../../lan/useLan';
import LanLobby from './LanLobby';
import LanVoiceRoom from './LanVoiceRoom';

/**
 * LanApp — the whole UI when the backend runs on the Raspberry Pi hotspot.
 *
 * Deliberately separate from the cloud app: no trips, no accounts, no database.
 * It only needs the Pi it was served from.
 */
export default function LanApp() {
  const lan = useLan();

  if (lan.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-mono-950">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mono-700 border-t-accent" />
        <p className="text-sm text-mono-400">Looking for the hotspot…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mono-950 px-4 py-6 text-mono-200">
      <div className="mx-auto mb-5 flex max-w-2xl items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-tri text-white shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold tracking-tight text-white">Trip Tracker</p>
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-accent-300">
            Hotspot mode · no internet
          </p>
        </div>
        {lan.user && (
          <span className="chip chip-success">You're in</span>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
        {lan.user ? (
          <LanVoiceRoom lan={lan} />
        ) : (
          <LanLobby
            info={lan.info}
            nearby={lan.nearby}
            busy={lan.busy}
            error={lan.error}
            onJoin={lan.join}
            onClearError={lan.clearError}
          />
        )}
      </div>
    </div>
  );
}
