import React, { useState } from 'react';
import { SEVERITIES } from './MapAlertOverlay';

const LEVELS = ['notice', 'warning', 'danger'];

/**
 * BroadcastPanel — the admin's composer for map announcements.
 * Sends `admin-broadcast`; the resulting card is previewed live before sending.
 */
export default function BroadcastPanel({ onClose, onSend }) {
  const [type, setType] = useState('notice');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const severity = SEVERITIES[type];

  const send = () => {
    if (!title.trim() && !message.trim()) {
      setError('Add a title or a message.');
      return;
    }
    setError('');
    setBusy(true);
    Promise.resolve(onSend?.({ type, title: title.trim(), message: message.trim() }))
      .then(() => onClose?.())
      .catch(() => setError('Could not send the broadcast.'))
      .finally(() => setBusy(false));
  };

  return (
    <div
      className="fixed inset-0 z-[2700] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-mono-800 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-mono-700 bg-mono-850 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M4 10v4a1 1 0 0 0 1 1h2l4 3V6L7 9H5a1 1 0 0 0-1 1z" />
              <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7 7 0 0 1 0 11" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white">Broadcast to the map</h2>
            <p className="text-[11px] text-mono-400">Everyone in the trip sees this instantly.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Severity selector */}
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-mono-400">Severity</p>
          <div className="grid grid-cols-3 gap-1.5">
            {LEVELS.map((level) => {
              const s = SEVERITIES[level];
              const active = type === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setType(level)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-bold transition ${
                    active ? 'text-white' : 'border-mono-800 text-mono-400 hover:border-mono-600'
                  }`}
                  style={active ? { borderColor: s.accent, backgroundColor: `${s.accent}1f` } : undefined}
                >
                  <span style={active ? { color: s.accent } : undefined}>{s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Title
            </span>
            <input
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rendezvous point changed"
              className="input"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400">
              Message
            </span>
            <textarea
              value={message}
              maxLength={500}
              rows={3}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Details everyone needs to see…"
              className="input resize-none"
            />
          </label>

          {/* Live preview */}
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-mono-400">Preview</p>
          <div className={`overflow-hidden rounded-2xl border-2 ${severity.cardClass}`}>
            <span className="block h-1.5 w-full" style={{ backgroundColor: severity.accent }} />
            <div className="flex items-start gap-3 p-3.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${severity.tintClass} ${severity.textClass}`}>
                {severity.icon}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`chip ${severity.badgeClass}`}>{severity.label}</span>
                <p className="mt-1.5 text-sm font-bold text-white">{title || 'Your title'}</p>
                <p className="mt-0.5 text-xs text-mono-300">{message || 'Your message…'}</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-mono-800 px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="btn flex-1"
            style={{ backgroundColor: severity.accent, color: type === 'warning' ? '#0a0a0a' : '#ffffff' }}
          >
            {busy ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
