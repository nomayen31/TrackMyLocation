import React, { useState } from 'react';
import Avatar from '../Avatar';

/**
 * VoiceRoomList — available rooms with live participant counts, plus a
 * create-room form.
 */
export default function VoiceRoomList({ rooms = [], activeRoomId, onJoin, onCreate, busy }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [limit, setLimit] = useState(8);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const room = await onCreate?.({ name: name.trim(), isPrivate, maxParticipants: Number(limit) });
    if (room) {
      setName('');
      setIsPrivate(false);
      setLimit(8);
      setShowCreate(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Voice rooms</h3>
        <button type="button" onClick={() => setShowCreate((v) => !v)} className="btn btn-primary btn-sm">
          {showCreate ? 'Cancel' : '+ New room'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={submit} className="card card-pad flex flex-col gap-3 animate-fade-up">
          <input
            type="text"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room name (e.g. Summit planning)"
            className="input"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-mono-300">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Private (invite only)
            </label>
            <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-mono-300">
              Limit
              <input
                type="number"
                min={2}
                max={50}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-16 rounded-lg border border-mono-700 bg-mono-950/70 px-2 py-1 text-center text-xs text-white outline-none focus:border-neon/70"
              />
            </label>
          </div>
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary w-full">
            {busy ? 'Creating…' : 'Create room'}
          </button>
        </form>
      )}

      {rooms.length === 0 ? (
        <div className="empty-state rounded-2xl border border-dashed border-mono-800/80 bg-mono-900/40 py-8">
          <span className="empty-state-icon">🔊</span>
          <p className="text-sm font-semibold text-white">No voice rooms yet</p>
          <p className="text-xs text-mono-400">Create the first one and invite your group.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => {
            const isActive = Number(activeRoomId) === Number(room.id);
            const live = room.liveCount ?? 0;
            return (
              <li key={room.id}>
                <div
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                    isActive
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-mono-800/80 bg-mono-900/60 hover:border-neon/40'
                  }`}
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mono-700/70 bg-mono-850 text-white">
                    {room.isPrivate ? '🔒' : '🔊'}
                    {live > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-mono-950 shadow-glowEmerald">
                        {live}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{room.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-mono-400">
                      <Avatar name={room.ownerName} src={room.ownerAvatar} size="sm" className="scale-75" />
                      {room.ownerName}
                      <span className="text-mono-600">·</span>
                      {live}/{room.maxParticipants} in room
                      {room.isPrivate && (
                        <span className="chip chip-amber ml-1">private</span>
                      )}
                    </span>
                  </span>

                  {isActive ? (
                    <span className="chip chip-success shrink-0">Joined</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoin?.(room)}
                      className="btn btn-secondary btn-sm shrink-0"
                    >
                      Join
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
