import React, { useMemo, useState } from 'react';
import Avatar from '../Avatar';

/**
 * VoiceInvitationModal — incoming invitations with Accept / Decline, plus an
 * "invite someone" picker (owner only) fed by the trip's member list.
 */
export default function VoiceInvitationModal({
  invitations = [],
  onAccept,
  onDecline,
  onClose,
  // invite picker (optional — shown when `canInvite` and `candidates` given)
  canInvite = false,
  candidates = [],
  onInvite,
  roomName,
}) {
  const [tab, setTab] = useState(invitations.length > 0 ? 'incoming' : 'invite');
  const [sending, setSending] = useState('');
  const [sent, setSent] = useState([]);

  const invitable = useMemo(() => candidates, [candidates]);

  const invite = async (userId) => {
    setSending(userId);
    const res = await onInvite?.(userId);
    setSending('');
    if (res?.ok) setSent((prev) => [...prev, userId]);
  };

  return (
    <div
      className="fixed inset-0 z-[2700] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-mono-800/80 bg-mono-950/95 shadow-lift backdrop-blur-xl animate-slide-up sm:rounded-3xl sm:animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-mono-800/80 px-4 py-3">
          <h2 className="text-base font-bold text-white">
            {tab === 'incoming' ? 'Voice invitations' : `Invite to ${roomName || 'room'}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {(canInvite || invitations.length > 0) && (
          <div className="flex gap-1 border-b border-mono-800/80 p-1.5">
            {invitations.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('incoming')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'incoming' ? 'bg-neon-tri text-white shadow-glowViolet' : 'text-mono-300 hover:text-white'
                }`}
              >
                Incoming {invitations.length > 0 && `(${invitations.length})`}
              </button>
            )}
            {canInvite && (
              <button
                type="button"
                onClick={() => setTab('invite')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'invite' ? 'bg-neon-tri text-white shadow-glowViolet' : 'text-mono-300 hover:text-white'
                }`}
              >
                Invite someone
              </button>
            )}
          </div>
        )}

        <div className="max-h-[65dvh] overflow-y-auto p-4">
          {tab === 'incoming' ? (
            invitations.length === 0 ? (
              <div className="empty-state py-8">
                <span className="empty-state-icon">📭</span>
                <p className="text-sm font-semibold text-white">No pending invitations</p>
                <p className="text-xs text-mono-400">Invitations you receive will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 rounded-2xl border border-mono-800/80 bg-mono-900/60 p-3"
                  >
                    <Avatar name={inv.senderName} src={inv.senderAvatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{inv.roomName}</p>
                      <p className="truncate text-[11px] text-mono-400">
                        from {inv.senderName}
                        {inv.expiresAt ? ` · expires ${new Date(inv.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDecline?.(inv.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onAccept?.(inv.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Accept
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="flex flex-col gap-2">
              {invitable.length === 0 ? (
                <p className="py-6 text-center text-sm text-mono-400">No one left to invite.</p>
              ) : (
                invitable.map((person) => {
                  const isSent = sent.includes(person.id);
                  return (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 rounded-xl border border-mono-800/80 bg-mono-900/50 px-3 py-2.5"
                    >
                      <Avatar name={person.name} src={person.avatarUrl || person.image} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                        {person.name}
                      </span>
                      <button
                        type="button"
                        disabled={isSent || sending === person.id}
                        onClick={() => invite(person.id)}
                        className={`btn btn-sm ${isSent ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        {sending === person.id ? 'Sending…' : isSent ? 'Invited ✓' : 'Invite'}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
