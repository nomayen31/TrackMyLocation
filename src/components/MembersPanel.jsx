import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';
import InviteCard from './InviteCard';

export default function MembersPanel({ groupId, currentUser, stories = {}, onViewStory, socket }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/groups/${groupId}`);
      setGroup(res.data.group);
      setMembers(res.data.members);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) load();
  }, [load]);

  // Refresh whenever membership changes elsewhere in the group.
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (payload) => {
      if (Number(payload?.groupId) === Number(groupId)) load();
    };
    socket.on('group-updated', onUpdate);
    return () => socket.off('group-updated', onUpdate);
  }, [socket, groupId, load]);

  const me = members.find((m) => m.id === currentUser.id);
  const isAdmin = me?.role === 'admin';
  const creatorId = group?.created_by;

  const addMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy('add');
    setError('');
    try {
      await api.post(`/api/groups/${groupId}/members`, { email: email.trim() });
      setEmail('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add member');
    } finally {
      setBusy('');
    }
  };

  const changeRole = async (userId, role) => {
    setBusy(`role-${userId}`);
    setError('');
    try {
      await api.patch(`/api/groups/${groupId}/members/${userId}`, { role });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change role');
    } finally {
      setBusy('');
    }
  };

  const removeMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this trip?`)) return;
    setBusy(`kick-${userId}`);
    setError('');
    try {
      await api.delete(`/api/groups/${groupId}/members/${userId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove member');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-mono-950 p-4 sm:p-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {/* Invite: code + link + QR */}
        <div className="hero-panel animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-mono-400">Invite friends</p>
          <p className="mt-1 mb-4 text-sm text-mono-300">
            Share the code, the link, or let them scan the QR to join “{group?.name}”.
          </p>
          <div className="relative">
            <InviteCard groupId={groupId} />
          </div>
        </div>

        {/* Add member (admin only) */}
        {isAdmin && (
          <form onSubmit={addMember} className="card card-pad animate-fade-up">
            <h3 className="section-title">Add a member by email</h3>
            <p className="section-hint mt-0.5">They&apos;ll join immediately as a member.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input flex-1"
                required
              />
              <button type="submit" disabled={busy === 'add'} className="btn btn-primary sm:w-auto">
                {busy === 'add' ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
            {error}
          </p>
        )}

        {/* Members list */}
        <div className="card card-pad animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Members</h3>
            <span className="chip chip-brand">{members.length}</span>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-mono-800">
            {members.map((m) => {
              const hasStory = Boolean(stories[m.id]);
              const isSelf = m.id === currentUser.id;
              const isCreator = m.id === creatorId;
              const canManage = isAdmin && !isSelf && !isCreator;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar
                    name={m.name}
                    src={m.avatarUrl || m.image}
                    size="md"
                    hasStory={hasStory}
                    onClick={hasStory ? () => onViewStory?.({ userId: m.id, name: m.name }) : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {m.name}
                      {isSelf && <span className="ml-1.5 text-xs font-normal text-mono-500">(you)</span>}
                      {isCreator && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-mono-500">
                          creator
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-mono-500">{m.email}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {hasStory && (
                      <button
                        type="button"
                        onClick={() => onViewStory?.({ userId: m.id, name: m.name })}
                        className="chip chip-success"
                      >
                        Story
                      </button>
                    )}
                    <span className={`chip ${m.role === 'admin' ? 'chip-amber' : 'chip-slate'}`}>
                      {m.role}
                    </span>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          disabled={busy === `role-${m.id}`}
                          onClick={() =>
                            changeRole(m.id, m.role === 'admin' ? 'member' : 'admin')
                          }
                          className="btn btn-secondary btn-sm"
                          title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                        >
                          {m.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          type="button"
                          disabled={busy === `kick-${m.id}`}
                          onClick={() => removeMember(m.id, m.name)}
                          className="btn btn-danger btn-sm"
                          title="Remove from trip"
                        >
                          {busy === `kick-${m.id}` ? '…' : 'Remove'}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
