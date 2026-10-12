import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import MediaBubble from './MediaBubble';
import useVoiceRecorder from './useVoiceRecorder';

function formatTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * DirectMessages — private 1:1 conversation with text, images and voice notes.
 */
export default function DirectMessages({ socket, groupId, otherUser, currentUser, onClose, onCall }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const recorder = useVoiceRecorder();

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
        socket.emit('send-dm', {
          toUserId: otherId,
          groupId,
          message: '',
          attachment: { type: 'audio', ...clip },
        });
      }
      return;
    }
    await recorder.start();
  };

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && !attachment) || !socket) return;

    socket.emit(
      'send-dm',
      { toUserId: otherId, groupId, message: text, attachment },
      (response) => {
        if (response?.error) setError(response.error);
      }
    );
    setDraft('');
    setAttachment(null);
  };

  if (!otherUser) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-mono-800 bg-mono-900 shadow-lift animate-slide-up sm:h-[72vh] sm:max-w-md sm:rounded-3xl sm:animate-pop-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-mono-800 px-4 py-3">
          <Avatar name={otherUser.name} src={otherUser.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{otherUser.name}</p>
            <p className="text-[11px] text-mono-400">Private messages</p>
          </div>
          {onCall && (
            <button
              type="button"
              onClick={() => onCall(otherUser)}
              aria-label={`Call ${otherUser.name}`}
              className="btn btn-ghost p-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <path d="M5 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              </svg>
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close messages" className="btn btn-ghost p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

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
              const hasAttachment = Boolean(msg.attachment_data);
              return (
                <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[82%] break-words rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? 'rounded-br-md bg-neon-tri font-medium text-white shadow-glowViolet'
                        : 'rounded-bl-md border border-mono-800 bg-mono-850 text-mono-100'
                    }`}
                  >
                    {hasAttachment && (
                      <MediaBubble
                        type={msg.attachment_type}
                        data={msg.attachment_data}
                        mime={msg.attachment_mime}
                        duration={msg.duration_seconds}
                        mine={mine}
                        caption={msg.message}
                      />
                    )}
                    {msg.message && (
                      <p className={`leading-relaxed ${hasAttachment ? 'mt-1.5' : ''}`}>{msg.message}</p>
                    )}
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

        {attachment && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-mono-800 bg-mono-850 p-2">
            {attachment.type === 'image' ? (
              <img src={attachment.data} alt="Preview" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mono-800">🎤</span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-mono-300">
              {attachment.type === 'image' ? 'Photo ready' : 'Voice note ready'}
            </span>
            <button type="button" onClick={() => setAttachment(null)} className="btn btn-ghost btn-sm">
              Remove
            </button>
          </div>
        )}

        {recorder.recording && (
          <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
            <span className="text-xs font-semibold text-accent-300">Recording… {clock(recorder.seconds)}</span>
            <button type="button" onClick={recorder.cancel} className="btn btn-ghost btn-sm ml-auto">
              Cancel
            </button>
          </div>
        )}

        {error && (
          <p className="mx-4 mb-2 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-xs text-mono-100">
            {error}
          </p>
        )}

        <form onSubmit={send} className="border-t border-mono-800 p-3">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach image"
              className="btn btn-ghost h-11 w-11 shrink-0 rounded-xl p-0"
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
              className={`btn h-11 w-11 shrink-0 rounded-xl p-0 ${
                recorder.recording ? 'bg-accent text-mono-950' : 'btn-ghost'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message ${otherUser.name}…`}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!draft.trim() && !attachment}
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
