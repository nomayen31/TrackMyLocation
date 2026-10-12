import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

function formatTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * DirectMessages — private 1:1 conversation with another member.
 * History comes from REST (`GET /api/dm/:userId`); new messages travel over
 * Socket.IO (`send-dm` -> `receive-dm`).
 */
export default function DirectMessages({ socket, groupId, otherUser, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const otherId = otherUser?.userId;

  useEffect(() => {
    if (!otherId) return undefined;
    let active = true;
    setLoading(true);
    api
      .get(`/api/dm/${otherId}`)
      .then((res) => {
        if (active) setMessages(res.data || []);
      })
      .catch(() => active && setError('Could not load this conversation.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [otherId]);

  // Append incoming messages that belong to this conversation.
  useEffect(() => {
    if (!socket || !otherId) return undefined;
    const onDm = (dm) => {
      const belongs =
        (dm.from_user === currentUser.id && dm.to_user === otherId) ||
        (dm.from_user === otherId && dm.to_user === currentUser.id);
      if (!belongs) return;
      setMessages((prev) => (prev.some((m) => m.id === dm.id) ? prev : [...prev, dm]));
    };
    socket.on('receive-dm', onDm);
    return () => socket.off('receive-dm', onDm);
  }, [socket, otherId, currentUser.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !socket) return;

    socket.emit('send-dm', { toUserId: otherId, groupId, message: text }, (response) => {
      if (response?.error) setError(response.error);
    });
    setDraft('');
  };

  if (!otherUser) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:h-[70vh] sm:max-w-md sm:rounded-3xl sm:animate-pop-in"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-mono-800 px-4 py-3">
          <Avatar name={otherUser.name} src={otherUser.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{otherUser.name}</p>
            <p className="text-[11px] text-mono-400">Private messages</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="btn btn-ghost p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          {loading ? (
            <>
              <div className="skeleton h-10 w-2/3 rounded-2xl" />
              <div className="skeleton ml-auto h-10 w-1/2 rounded-2xl" />
            </>
          ) : messages.length === 0 ? (
            <div className="empty-state py-12">
              <span className="empty-state-icon">✉</span>
              <p className="text-sm font-semibold text-white">No messages yet</p>
              <p className="text-xs text-mono-400">Say hi to {otherUser.name} privately.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.from_user === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] break-words rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? 'rounded-br-md bg-white text-mono-950'
                        : 'rounded-bl-md border border-mono-800 bg-mono-850 text-mono-100'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-mono-500">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p className="mx-4 mb-2 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-xs text-mono-100">
            {error}
          </p>
        )}

        {/* Composer */}
        <form onSubmit={send} className="border-t border-mono-800 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message ${otherUser.name}…`}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              className="btn btn-primary h-11 w-11 shrink-0 rounded-xl p-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4.5 12 20 4.5 15.5 20l-3.4-5.1z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
