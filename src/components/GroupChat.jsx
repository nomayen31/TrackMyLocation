import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import MediaBubble from './MediaBubble';
import useVoiceRecorder from './useVoiceRecorder';

const QUICK_EMOJI = ['👍', '🔥', '😂', '❤️', '😮', '✅'];
/** Messages from the same person within this window form one visual group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function timeOf(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "Today" / "Yesterday" / "12 Oct 2026" */
function dayLabel(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const sameDay = (a, b) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.toDateString() === y.toDateString();
};

export default function GroupChat({ socket, groupId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    let active = true;

    api
      .get(`/api/chats/${groupId}`)
      .then((res) => {
        if (active) setMessages(res.data);
      })
      .catch((err) => console.error('Error fetching chat history:', err))
      .finally(() => active && setLoading(false));

    const onMessage = (message) => setMessages((prev) => [...prev, message]);
    socket.on('receive-message', onMessage);

    return () => {
      active = false;
      socket.off('receive-message', onMessage);
    };
  }, [groupId, socket]);

  // Only follow new messages when the reader is already at the bottom.
  useLayoutEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, atBottom]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 120);
  }, []);

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only images can be shared here.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is larger than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      setAttachment({ type: 'image', data: String(reader.result), mime: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (recorder.recording) {
      const clip = await recorder.stop();
      if (clip) {
        socket.emit('send-message', {
          groupId,
          message: '',
          attachment: { type: 'audio', ...clip },
        });
      }
      return;
    }
    await recorder.start();
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    const text = newMessage.trim();
    if (!text && !attachment) return;

    socket.emit('send-message', { groupId, message: text, attachment });
    setNewMessage('');
    setAttachment(null);
    setAtBottom(true);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji) => {
    setNewMessage((prev) => `${prev}${emoji}`);
    inputRef.current?.focus();
  };

  /** Precompute visual grouping + day separators. */
  const rows = useMemo(() => {
    const out = [];
    let prev = null;
    for (const msg of messages) {
      const ts = msg.created_at || msg.createdAt;
      const showDay = !prev || !sameDay(prev.created_at || prev.createdAt, ts);
      const isMe = msg.user_id === currentUser.id;
      const prevIsMe = prev ? prev.user_id === currentUser.id : null;
      const withinWindow =
        prev && prev.user_id === msg.user_id && ts && prev.created_at
          ? new Date(ts) - new Date(prev.created_at) < GROUP_WINDOW_MS
          : false;
      const groupStart = !prev || !withinWindow || prevIsMe !== isMe;

      out.push({ msg, showDay, groupStart, isMe, dayLabel: showDay ? dayLabel(ts) : null });
      prev = msg;
    }
    return out;
  }, [messages, currentUser.id]);

  return (
    <div className="flex h-full flex-col bg-mono-950">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-mono-800/80 px-4 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-bold text-white">Trip channel</span>
        <span className="chip chip-slate ml-auto">{messages.length}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="thin-scroll flex-1 overflow-y-auto px-3 py-4 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="skeleton h-12 w-2/3 max-w-xs rounded-2xl" />
              <div className="skeleton ml-auto h-12 w-1/2 max-w-[16rem] rounded-2xl" />
              <div className="skeleton h-12 w-3/5 max-w-xs rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state py-16">
              <span className="empty-state-icon">💬</span>
              <p className="text-sm font-semibold text-white">No messages yet</p>
              <p className="text-xs text-mono-400">Say hello 👋 or share a photo.</p>
            </div>
          ) : (
            rows.map(({ msg, showDay, groupStart, isMe, dayLabel: label }, index) => {
              const sender = msg.user_name || 'Member';
              const hasAttachment = Boolean(msg.attachment_data);
              const isLast = index === rows.length - 1;

              return (
                <React.Fragment key={msg.id || index}>
                  {showDay && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-mono-800/70" />
                      <span className="rounded-full border border-mono-800/80 bg-mono-900/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mono-400">
                        {label}
                      </span>
                      <span className="h-px flex-1 bg-mono-800/70" />
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${
                      groupStart ? 'mt-3' : 'mt-0.5'
                    }`}
                  >
                    {/* Avatar column (keeps bubbles aligned across a group) */}
                    {!isMe && (
                      <span className="w-8 shrink-0">
                        {groupStart && <Avatar name={sender} src={msg.user_avatar} size="sm" />}
                      </span>
                    )}

                    <div className={`flex max-w-[78%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {groupStart && !isMe && (
                        <span className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-mono-300">
                          {sender}
                        </span>
                      )}

                      <div
                        className={`text-sm shadow-sm ${
                          isMe
                            ? 'rounded-2xl rounded-br-md bg-neon-tri font-medium text-white shadow-glowViolet'
                            : 'rounded-2xl rounded-bl-md border border-mono-800 bg-mono-900 text-mono-100'
                        } ${groupStart ? '' : isMe ? 'rounded-tr-md' : 'rounded-tl-md'} px-3 py-2`}
                      >
                        {hasAttachment && (
                          <MediaBubble
                            type={msg.attachment_type}
                            data={msg.attachment_data}
                            mime={msg.attachment_mime}
                            duration={msg.duration_seconds}
                            mine={isMe}
                            caption={msg.message}
                          />
                        )}
                        {msg.message && (
                          <p className={`leading-relaxed break-words ${hasAttachment ? 'mt-1.5' : ''}`}>
                            {msg.message}
                          </p>
                        )}
                      </div>

                      {(isLast || groupStart) && (
                        <span className="mt-1 px-1 text-[10px] text-mono-500">
                          {timeOf(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Jump to latest */}
      {!atBottom && (
        <button
          type="button"
          onClick={() => {
            setAtBottom(true);
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="mx-auto -mb-2 flex items-center gap-1.5 rounded-full border border-mono-700 bg-mono-900/95 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lift backdrop-blur"
        >
          ↓ New messages
        </button>
      )}

      {/* Composer */}
      <form
        onSubmit={sendMessage}
        className="shrink-0 border-t border-mono-800/80 bg-mono-900/85 px-3 py-2.5 backdrop-blur sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {attachment && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-mono-800 bg-mono-850 p-2">
              {attachment.type === 'image' ? (
                <img src={attachment.data} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-mono-800 text-white">🎤</span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-mono-300">
                {attachment.type === 'image' ? attachment.name || 'Photo ready' : 'Voice note ready'}
              </span>
              <button type="button" onClick={() => setAttachment(null)} className="btn btn-ghost btn-sm">
                Remove
              </button>
            </div>
          )}

          {recorder.recording && (
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
              <span className="text-xs font-semibold text-accent-300">
                Recording… {clock(recorder.seconds)}
              </span>
              <button type="button" onClick={recorder.cancel} className="btn btn-ghost btn-sm ml-auto">
                Cancel
              </button>
            </div>
          )}

          {error && (
            <p className="mb-2 rounded-lg border border-sos/40 bg-sos/10 px-3 py-2 text-xs text-sos-300">
              {error}
            </p>
          )}

          {/* Quick reactions */}
          <div className="mb-2 flex gap-1">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded-lg px-1.5 py-0.5 text-base leading-none opacity-70 transition hover:bg-mono-800 hover:opacity-100"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach image"
              className="btn btn-ghost h-11 w-11 shrink-0 rounded-2xl p-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <path d="M20 12.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6.5" />
                <path d="M18 5v6M15 8h6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              aria-label={recorder.recording ? 'Stop and send voice note' : 'Record voice note'}
              className={`btn h-11 w-11 shrink-0 rounded-2xl p-0 ${
                recorder.recording ? 'bg-accent text-mono-950' : 'btn-ghost'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>

            <div className="flex flex-1 items-center rounded-2xl border border-mono-700 bg-mono-950/60 px-3.5 transition focus-within:border-neon/70 focus-within:ring-2 focus-within:ring-neon/20">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) sendMessage(e);
                }}
                placeholder="Message the trip…"
                className="input-flush py-2.5"
              />
            </div>

            <button
              type="submit"
              aria-label="Send message"
              disabled={!newMessage.trim() && !attachment}
              className="btn btn-primary h-11 w-11 rounded-2xl p-0 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4.5 12 20 4.5 15.5 20l-3.4-5.1z" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
