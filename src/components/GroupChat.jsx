import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

export default function GroupChat({ socket, groupId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;

    // Fetch previous message history from the backend.
    api
      .get(`/api/chats/${groupId}`)
      .then((res) => {
        if (active) setMessages(res.data);
      })
      .catch((err) => console.error('Error fetching chat history:', err))
      .finally(() => active && setLoading(false));

    // Listen for incoming real-time messages via Socket.io.
    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };
    socket.on('receive-message', onMessage);

    return () => {
      active = false;
      socket.off('receive-message', onMessage);
    };
  }, [groupId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // The sender's identity is derived from the authenticated session on the server.
    socket.emit('send-message', { groupId, message: newMessage.trim() });
    setNewMessage('');
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
              <p className="text-xs text-mono-400">Say hello 👋 to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.user_id === currentUser.id;
              const sender = msg.user_name || 'Member';
              return (
                <div
                  key={msg.id || index}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && <Avatar name={sender} size="sm" />}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? 'rounded-br-md bg-white text-mono-950'
                        : 'rounded-bl-md border border-mono-800 bg-mono-900 text-mono-100'
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-mono-300">
                        {sender}
                      </p>
                    )}
                    <p className="leading-relaxed break-words">{msg.message}</p>
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
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-mono-700 bg-mono-900 px-3.5 transition focus-within:border-white/70 focus-within:ring-2 focus-within:ring-white/10">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              className="input-flush py-2.5"
            />
          </div>
          <button
            type="submit"
            aria-label="Send message"
            className="btn btn-primary h-11 w-11 rounded-2xl p-0"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M4.5 12 20 4.5 15.5 20l-3.4-5.1z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
