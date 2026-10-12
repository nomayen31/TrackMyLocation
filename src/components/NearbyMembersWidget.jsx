import React from 'react';
import Avatar from './Avatar';
import { formatDistance } from '../distance';

const ACTIONS = [
  { key: 'dm', label: 'Message', icon: '✉' },
  { key: 'call', label: 'Call', icon: '☏' },
  { key: 'vibrate', label: 'Vibrate', icon: '≈' },
  { key: 'ring', label: 'Ring', icon: '♫' },
];

/**
 * NearbyMembersWidget — floating panel listing the group by distance, with
 * quick actions. Bottom sheet on phones, anchored card on larger screens.
 */
export default function NearbyMembersWidget({ members = [], onAction, onClose, className = '' }) {
  return (
    <div
      className={`flex max-h-[55%] w-auto flex-col overflow-hidden rounded-2xl border border-mono-800 bg-mono-900/95 shadow-lift backdrop-blur sm:w-72 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-mono-800 px-3 py-2.5">
        <span className="text-xs font-bold text-white">Nearby members</span>
        <span className="chip chip-brand">{members.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close nearby members"
          className="ml-auto rounded-lg p-1.5 text-mono-400 hover:bg-mono-800 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {members.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-mono-400">
          No other members are sharing yet.
        </p>
      ) : (
        <ul className="thin-scroll flex flex-col overflow-y-auto">
          {members.map((m) => (
            <li key={m.userId} className="border-b border-mono-800/60 px-3 py-2.5 last:border-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={m.name} src={m.avatarUrl} size="sm" hasStory={Boolean(m.hasStory)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{m.name}</p>
                  <p className="text-[10px] font-semibold text-accent-300">
                    {m.meters != null ? formatDistance(m.meters) : 'Locating…'}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => onAction?.(a.key, m)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-mono-800 bg-mono-850 py-1.5 text-[10px] font-semibold text-mono-200 transition hover:border-mono-600 hover:text-white"
                  >
                    <span aria-hidden="true">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
