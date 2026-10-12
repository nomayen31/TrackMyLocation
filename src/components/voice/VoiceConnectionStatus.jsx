import React from 'react';

const STATES = {
  idle: { label: 'Not connected', dot: 'bg-mono-600', tone: 'border-mono-700/70 text-mono-300' },
  connecting: { label: 'Connecting…', dot: 'bg-warning', tone: 'border-warning/40 text-warning-300' },
  connected: { label: 'Connected', dot: 'bg-accent', tone: 'border-accent/40 text-accent-300' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-electric', tone: 'border-electric/40 text-electric-300' },
  disconnected: { label: 'Disconnected', dot: 'bg-sos', tone: 'border-sos/40 text-sos-300' },
};

/**
 * VoiceConnectionStatus — pill showing the LiveKit connection state.
 */
export default function VoiceConnectionStatus({ state = 'idle' }) {
  const meta = STATES[state] || STATES.idle;
  const animate = state === 'connecting' || state === 'reconnecting' || state === 'connected';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border bg-mono-900/70 px-3 py-1 text-[11px] font-semibold backdrop-blur ${meta.tone}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot} ${animate ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
}
