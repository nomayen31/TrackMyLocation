import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import MediaBubble from './MediaBubble';
import useVoiceRecorder from './useVoiceRecorder';

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function GroupChat({ socket, groupId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const fileRef = useRef(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    e.preventDefault();
    const text = newMessage.trim();
    if (!text && !attachment) return;

    socket.emit('send-message', { groupId, message: text, attachment });
    setNewMessage('');
    setAttachment(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="skeleton h-12 w-2/3 max-w-xs" />
              <div className="skeleton ml-auto h-12 w-1/2 max-w-[16rem]" />
              <div className="skeleton h-12 w-3/5 max-w-xs" />
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state py-16">
              <span className="empty-state-icon">💬</span>
              <p className="text-sm font-semibold text-white">No messages yet</p>
              <p className="text-xs text-mono-400">Say hello 👋 or share a photo.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.user_id === currentUser.id;
              const sender = msg.user_name || 'Member';
              const hasAttachment = Boolean(msg.attachment_data);
              return (
                <div
                  key={msg.id || index}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <Avatar name={sender} src={msg.user_avatar} size="sm" />
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? 'rounded-br-md bg-neon-tri font-medium text-white shadow-glowViolet'
                        : 'rounded-bl-md border border-mono-800 bg-mono-900 text-mono-100'
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mono-300">
                        {sender}
                      </p>
                    )}
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
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={sendMessage}
        className="border-t border-mono-800 bg-mono-900/85 px-4 py-3 backdrop-blur sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {/* Attachment / recording preview */}
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
            <p className="mb-2 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-xs text-mono-100">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
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

            <div className="flex flex-1 items-center rounded-2xl border border-mono-700 bg-mono-900 px-3.5 transition focus-within:border-white/70 focus-within:ring-2 focus-within:ring-white/10">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className="input-flush py-2.5"
              />
            </div>
            <button type="submit" aria-label="Send message" className="btn btn-primary h-11 w-11 rounded-2xl p-0">
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
