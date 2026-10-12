import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

/* -------------------------------------------------------------------------
 * Modal — lightweight, reusable dialog wrapper (closes on backdrop click).
 * ---------------------------------------------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-3xl border border-mono-800 bg-mono-900 p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold tracking-tight text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost -mr-1 -mt-1 p-2"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = 'input';

/* -------------------------------------------------------------------------
 * GroupManager — lists the user's groups and offers Create / Join modals.
 * ---------------------------------------------------------------------- */
export default function GroupManager({ userId, onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/groups/user/${userId}`);
      setGroups(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load groups');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchGroups();
  }, [fetchGroups]);

  // Auto-select the first group once so the dashboard isn't empty on load.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || loading || groups.length === 0) return;
    if (!onSelectGroup) return;
    autoSelected.current = true;
    setSelectedId(groups[0].id);
    onSelectGroup(groups[0]);
  }, [loading, groups, onSelectGroup]);

  const openCreate = () => {
    setFormError('');
    setGroupName('');
    setShowCreate(true);
  };

  const openJoin = () => {
    setFormError('');
    setInviteCode('');
    setShowJoin(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await api.post('/api/groups/create', { name: groupName.trim() });
      setGroupName('');
      setShowCreate(false);
      const list = await fetchGroups();
      const created = res.data.group;
      const next = list.find((g) => g.id === created.id) || created;
      setSelectedId(next.id);
      if (onSelectGroup) onSelectGroup(next);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create group');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await api.post('/api/groups/join', { inviteCode: inviteCode.trim() });
      setInviteCode('');
      setShowJoin(false);
      const list = await fetchGroups();
      const joined = res.data.group;
      const next = list.find((g) => g.id === joined.id) || joined;
      setSelectedId(next.id);
      if (onSelectGroup) onSelectGroup(next);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not join group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-mono-500">
            My Trips
          </h2>
          {!loading && !error && groups.length > 0 && (
            <span className="chip chip-brand">{groups.length}</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={openJoin} className="btn btn-secondary btn-sm">
            Join
          </button>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            + New
          </button>
        </div>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-mono-700 bg-mono-800 px-3 py-2.5 text-center text-sm text-mono-100">
          {error}
        </p>
      ) : groups.length === 0 ? (
        <div className="empty-state rounded-2xl border border-dashed border-mono-800 bg-mono-900 px-5 py-8">
          <span className="empty-state-icon">🧭</span>
          <p className="text-sm font-semibold text-white">No trips yet</p>
          <p className="max-w-[15rem] text-xs leading-relaxed text-mono-400">
            Create a trip for your group, or join one with an invite code.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              Create trip
            </button>
            <button type="button" onClick={openJoin} className="btn btn-secondary btn-sm">
              Join trip
            </button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => {
            const selected = selectedId === group.id;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(group.id);
                    if (onSelectGroup) onSelectGroup(group);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition duration-150 ${
                    selected
                      ? 'border-white bg-mono-850 shadow-sm'
                      : 'border-mono-800 bg-mono-900 hover:-translate-y-px hover:border-mono-600'
                  }`}
                >
                  <Avatar
                    name={group.name}
                    size="md"
                    className={selected ? '' : 'opacity-90'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {group.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-mono-500">
                      Invite <span className="font-mono text-mono-400">{group.invite_code}</span>
                    </span>
                  </span>
                  <span
                    className={`chip ${
                      group.role === 'admin' ? 'chip-amber' : 'chip-slate'
                    } shrink-0`}
                  >
                    {group.role}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Create a New Trip" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-mono-400">
                Trip name
              </span>
              <input
                type="text"
                placeholder="Trip name (e.g. Weekend in Cox's Bazar)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className={inputClass}
                autoFocus
              />
            </label>
            {formError && (
              <p className="rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
                {formError}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Creating…' : 'Create Trip'}
            </button>
          </form>
        </Modal>
      )}

      {/* Join modal */}
      {showJoin && (
        <Modal title="Join a Trip" onClose={() => setShowJoin(false)}>
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-mono-400">
                Invite code
              </span>
              <input
                type="text"
                placeholder="Invite code (e.g. AB12CD34)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={`${inputClass} text-center font-mono uppercase tracking-[0.25em]`}
                autoFocus
              />
            </label>
            {formError && (
              <p className="rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
                {formError}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Joining…' : 'Join Trip'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
