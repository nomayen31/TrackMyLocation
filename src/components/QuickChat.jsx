import React, { useEffect, useRef, useState } from 'react';
import api from '../api';

/**
 * QuickChat — a compact expedition channel overlay so you can message the group
 * without leaving the map. Bottom sheet on phones, side drawer on larger screens.
 */
export default function QuickChat({ socket, groupId, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/api/chats/${groupId}`)
      .then((res) => {
        if (active) setMessages((res.data || []).slice(-40));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));

    const onMessage = (message) => setMessages((prev) => [...prev, message].slice(-60));
    socket.on('receive-message', onMessage);

    return () => {
      active = false;
      socket.off('receive-message', onMessage);
    };
  }, [groupId, socket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-message', { groupId, message: text });
    setDraft('');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1400] flex h-[58vh] flex-col overflow-hidden rounded-t-3xl border border-mono-800 bg-mono-900/98 shadow-lift backdrop-blur sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:h-auto sm:w-80 sm:rounded-3xl">
      <div className="flex shrink-0 items-center gap-2 border-b border-mono-800 px-3 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-bold text-white">Expedition channel</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick chat"
          className="ml-auto rounded-lg p-1.5 text-mono-400 hover:bg-mono-800 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="thin-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {loading ? (
          <>
            <div className="skeleton h-8 w-2/3 rounded-2xl" />
            <div className="skeleton ml-auto h-8 w-1/2 rounded-2xl" />
          </>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-mono-400">No messages yet — say hi 👋</p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.user_id === currentUser.id;
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                    isMe
                      ? 'rounded-br-md bg-white text-mono-950'
                      : 'rounded-bl-md border border-mono-800 bg-mono-850 text-mono-100'
                  }`}
                >
                  {!isMe && (
                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-mono-400">
                      {msg.user_name || 'Member'}
                    </p>
                  )}
                  {msg.attachment_data && !msg.message ? (
                    <span className="italic opacity-80">
                      {msg.attachment_type === 'audio' ? '🎤 Voice note' : '📷 Photo'}
                    </span>
                  ) : (
                    msg.message
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-mono-800 p-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the trip…"
            className="input py-2 text-xs"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="btn btn-primary h-9 w-9 shrink-0 rounded-xl p-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M4.5 12 20 4.5 15.5 20l-3.4-5.1z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
