import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

export default function MembersPanel({ groupId, currentUser, stories = {}, onViewStory }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/groups/${groupId}`);
      setGroup(res.data.group);
      setMembers(res.data.members);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) load();
  }, [load]);

  const me = members.find((m) => m.id === currentUser.id);
  const isAdmin = me?.role === 'admin';

  const addMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/groups/${groupId}/members`, { email: email.trim() });
      setEmail('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add member');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!group?.invite_code) return;
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="skeleton h-32 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-mono-950 p-4 sm:p-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {/* Invite code card */}
        <div className="hero-panel animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-mono-400">
                Invite friends
              </p>
              <p className="mt-1 text-sm text-mono-300">
                Share this code so others can join “{group?.name}”.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-mono-700 bg-mono-850 px-4 py-2 font-mono text-lg font-bold tracking-[0.2em] text-white">
                {group?.invite_code}
              </span>
              <button type="button" onClick={copyInvite} className="btn btn-primary">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Add member (admin only) */}
        {isAdmin && (
          <form onSubmit={addMember} className="card card-pad animate-fade-up">
            <h3 className="section-title">Add a member by email</h3>
            <p className="section-hint mt-0.5">
              They&apos;ll join immediately and appear in the member list.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input flex-1"
                required
              />
              <button type="submit" disabled={busy} className="btn btn-primary sm:w-auto">
                {busy ? 'Adding…' : 'Add member'}
              </button>
            </div>
            {error && (
              <p className="mt-2 rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
                {error}
              </p>
            )}
          </form>
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
              return (
                <li key={m.id} className="list-row">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={m.name}
                      size="md"
                      hasStory={hasStory}
                      onClick={
                        hasStory
                          ? () => onViewStory?.({ userId: m.id, name: m.name })
                          : undefined
                      }
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {m.name}
                        {m.id === currentUser.id && (
                          <span className="ml-1.5 text-xs font-normal text-mono-500">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-mono-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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
