import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

/* -------------------------------------------------------------------------
 * Category metadata — the "real world" taxonomy for trip spending.
 * ---------------------------------------------------------------------- */
const CATEGORIES = {
  food: { label: 'Food & drink', emoji: '🍽', tint: 'border-warning/40 bg-warning/15 text-warning-300' },
  transport: { label: 'Transport', emoji: '🚕', tint: 'border-electric/40 bg-electric/15 text-electric-300' },
  stay: { label: 'Stay', emoji: '🏨', tint: 'border-neon/40 bg-neon/15 text-neon-300' },
  activity: { label: 'Activity', emoji: '🎯', tint: 'border-accent/40 bg-accent/15 text-accent-300' },
  shopping: { label: 'Shopping', emoji: '🛍', tint: 'border-sos/40 bg-sos/15 text-sos-300' },
  tickets: { label: 'Tickets', emoji: '🎟', tint: 'border-mono-600 bg-mono-800/60 text-mono-100' },
  other: { label: 'Other', emoji: '🧾', tint: 'border-mono-700 bg-mono-800/60 text-mono-300' },
};
const CATEGORY_KEYS = Object.keys(CATEGORIES);

const SPLIT_LABELS = { equal: 'Split equally', custom: 'Custom split', payer: 'Just me' };

const fmt = (value) => `$${Number(value || 0).toFixed(2)}`;
const cents = (value) => Math.round(Number(value || 0) * 100);

export default function ExpensePanel({ groupId, currentUser, members = [], socket }) {
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // --- form state ---
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [noteText, setNoteText] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [participants, setParticipants] = useState([]);
  const [custom, setCustom] = useState({});

  const people = useMemo(
    () => (members.length ? members : [{ id: currentUser.id, name: currentUser.name }]),
    [members, currentUser]
  );

  // Default the participant set to everyone on first load.
  useEffect(() => {
    if (participants.length === 0 && members.length > 0) {
      setParticipants(members.map((m) => m.id));
    }
  }, [members, participants.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, balanceRes] = await Promise.all([
        api.get(`/api/expenses/${groupId}`),
        api.get(`/api/expenses/${groupId}/balance`),
      ]);
      setExpenses(listRes.data || []);
      setBalance(balanceRes.data || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) load();
  }, [load]);

  // Live refresh when anyone adds or removes an expense.
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (payload) => {
      if (Number(payload?.groupId) === Number(groupId)) load();
    };
    socket.on('expense-updated', onUpdate);
    return () => socket.off('expense-updated', onUpdate);
  }, [socket, groupId, load]);

  const toggleParticipant = (id) =>
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const setCustomAmount = (id, value) => setCustom((prev) => ({ ...prev, [id]: value }));

  const totalCents = cents(amount);
  const allocatedCents = participants.reduce((sum, id) => sum + cents(custom[id]), 0);
  const remainingCents = totalCents - allocatedCents;

  // Auto-fill an even custom split when switching to "custom".
  useEffect(() => {
    if (splitType !== 'custom' || totalCents <= 0 || participants.length === 0) return;
    const base = Math.floor(totalCents / participants.length);
    let remainder = totalCents - base * participants.length;
    const next = {};
    for (const id of participants) {
      next[id] = (base + (remainder > 0 ? 1 : 0)) / 100;
      if (remainder > 0) remainder -= 1;
    }
    setCustom(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, participants.length, totalCents]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setNoteText('');
    setCustom({});
    setSplitType('equal');
    if (members.length) setParticipants(members.map((m) => m.id));
  };

  const addExpense = async (e) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (splitType !== 'payer' && participants.length === 0) {
      setError('Pick at least one person to split with.');
      return;
    }
    if (splitType === 'custom' && remainingCents !== 0) {
      setError(`Custom amounts must add up to ${fmt(parsed)} (currently ${fmt(allocatedCents / 100)}).`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.post('/api/expenses', {
        groupId,
        amount: parsed,
        description,
        category,
        note: noteText,
        splitType,
        participants,
        customShares: splitType === 'custom' ? custom : undefined,
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the expense.');
    } finally {
      setBusy(false);
    }
  };

  const removeExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the expense.');
    }
  };

  const memberName = useCallback(
    (id) => people.find((p) => p.id === id)?.name || 'Member',
    [people]
  );

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const total = balance?.total ?? 0;
  const perPerson = balance?.perPerson ?? [];
  const settlements = balance?.settlements ?? [];
  const categories = balance?.categories ?? [];
  const myShare = perPerson.find((p) => p.userId === currentUser.id);
  const shareCents = perPerson.length ? cents(total) / perPerson.length : 0;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-mono-950 p-4 sm:p-5">
      {/* ------------------------------------------------------------ hero */}
      <div className="hero-panel animate-fade-up">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neon-300">
              Total trip spend
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-white">{fmt(total)}</p>
            <p className="mt-1.5 text-xs text-mono-300">
              {perPerson.length} {perPerson.length === 1 ? 'traveller' : 'travellers'} ·{' '}
              <span className="font-semibold text-white">{fmt(shareCents / 100)}</span> each if even
            </p>
          </div>
          {myShare && (
            <div className="rounded-2xl border border-mono-800/80 bg-mono-950/50 px-4 py-3 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wide text-mono-400">
                Your position
              </p>
              {myShare.balance > 0 ? (
                <p className="text-lg font-extrabold text-accent-300">
                  +{fmt(myShare.balance)} <span className="text-xs font-semibold">owed to you</span>
                </p>
              ) : myShare.balance < 0 ? (
                <p className="text-lg font-extrabold text-sos-300">
                  {fmt(myShare.balance)} <span className="text-xs font-semibold">you owe</span>
                </p>
              ) : (
                <p className="text-lg font-extrabold text-white">All square</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------- categories */}
      {categories.length > 0 && (
        <div className="card card-pad animate-fade-up">
          <h3 className="section-title">Where the money went</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {categories.map((c) => {
              const meta = CATEGORIES[c.category] || CATEGORIES.other;
              const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
              return (
                <li key={c.category} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm ${meta.tint}`}>
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between text-xs font-semibold text-mono-200">
                      <span className="truncate">{meta.label}</span>
                      <span className="text-white">{fmt(c.total)}</span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-mono-800">
                      <span
                        className="block h-full rounded-full bg-neon-tri"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------- add expense */}
        <form onSubmit={addExpense} className="card card-pad animate-fade-up">
          <h3 className="section-title">Log an expense</h3>
          <p className="section-hint mt-0.5">Real-world splitting — pay for who actually joined in.</p>

          <div className="mt-3 flex flex-col gap-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-mono-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-7 text-lg font-bold"
                required
              />
            </div>

            <input
              type="text"
              placeholder="What was it for? (e.g. Cable car tickets)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />

            {/* Category picker */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_KEYS.map((key) => {
                const meta = CATEGORIES[key];
                const active = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active ? meta.tint : 'border-mono-700/70 text-mono-400 hover:text-white'
                    }`}
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Split type */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-mono-400">
                Split
              </p>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-mono-800/80 bg-mono-850/60 p-1">
                {['equal', 'custom', 'payer'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSplitType(mode)}
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                      splitType === mode ? 'bg-neon-tri text-white shadow-glowViolet' : 'text-mono-300 hover:text-white'
                    }`}
                  >
                    {SPLIT_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants + custom amounts */}
            {splitType !== 'payer' && (
              <div className="rounded-xl border border-mono-800/80 bg-mono-900/50 p-2">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-mono-400">
                    Who's splitting
                  </span>
                  <button
                    type="button"
                    onClick={() => setParticipants(people.map((p) => p.id))}
                    className="text-[10px] font-semibold text-neon-300 hover:text-white"
                  >
                    Select all
                  </button>
                </div>
                <ul className="flex max-h-44 flex-col overflow-y-auto">
                  {people.map((p) => {
                    const checked = participants.includes(p.id);
                    return (
                      <li key={p.id}>
                        <div className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-mono-800/60">
                          <button
                            type="button"
                            onClick={() => toggleParticipant(p.id)}
                            className="flex flex-1 items-center gap-2 text-left"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                checked ? 'border-neon bg-neon-tri text-white' : 'border-mono-600'
                              }`}
                            >
                              {checked && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" className="h-3 w-3">
                                  <path d="m5 13 4.5 4.5L19 7" />
                                </svg>
                              )}
                            </span>
                            <Avatar name={p.name} src={p.avatarUrl || p.image} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
                              {p.name}
                              {p.id === currentUser.id && (
                                <span className="ml-1 text-mono-500">(you)</span>
                              )}
                            </span>
                          </button>
                          {splitType === 'custom' && checked && (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={custom[p.id] ?? ''}
                              onChange={(e) => setCustomAmount(p.id, e.target.value)}
                              className="w-20 rounded-lg border border-mono-700 bg-mono-950/70 px-2 py-1 text-right text-xs text-white outline-none focus:border-neon/70"
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {splitType === 'custom' && (
                  <p className={`px-1 pt-1 text-[11px] font-semibold ${remainingCents === 0 ? 'text-accent-300' : 'text-warning-300'}`}>
                    {remainingCents === 0
                      ? 'Allocated exactly ✓'
                      : remainingCents > 0
                        ? `${fmt(remainingCents / 100)} left to allocate`
                        : `${fmt(Math.abs(remainingCents) / 100)} over the total`}
                  </p>
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Note (optional — e.g. split 4 ways, Sam paid cash)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="input"
            />

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Adding…' : 'Add expense'}
            </button>
            {error && (
              <p className="rounded-lg border border-sos/40 bg-sos/10 px-3 py-2 text-sm text-sos-300">
                {error}
              </p>
            )}
          </div>
        </form>

        {/* ------------------------------------------------- balances */}
        <div className="flex flex-col gap-4">
          <div className="card card-pad animate-fade-up">
            <h3 className="section-title">Balances</h3>
            <ul className="mt-3 flex flex-col divide-y divide-mono-800/70">
              {perPerson.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-mono-100">
                      {m.name}
                      {m.userId === currentUser.id && (
                        <span className="ml-1.5 text-xs text-mono-500">(you)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-mono-500">
                      paid {fmt(m.paid)} · share {fmt(m.owed)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      m.balance > 0 ? 'text-accent-300' : m.balance < 0 ? 'text-sos-300' : 'text-mono-400'
                    }`}
                  >
                    {m.balance > 0 ? `+${fmt(m.balance)}` : m.balance < 0 ? fmt(m.balance) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Settle up */}
          <div className="card card-pad animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Settle up</h3>
              {settlements.length > 0 && (
                <span className="chip chip-success">{settlements.length} transfers</span>
              )}
            </div>
            {settlements.length === 0 ? (
              <div className="empty-state py-8">
                <span className="empty-state-icon">✅</span>
                <p className="text-sm font-semibold text-white">Everyone's square</p>
                <p className="text-xs text-mono-400">No outstanding balances in this trip.</p>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {settlements.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-mono-800/80 bg-mono-850/50 px-3 py-2.5"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-xs text-mono-300">
                      <span className="truncate font-semibold text-white">{s.fromName}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 shrink-0 text-neon-300">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      <span className="truncate font-semibold text-white">{s.toName}</span>
                    </span>
                    <span className="shrink-0 font-bold text-accent-300">{fmt(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- expense log */}
      <div className="card card-pad animate-fade-up">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Expense log</h3>
          {expenses.length > 0 && <span className="chip chip-slate">{expenses.length}</span>}
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state py-10">
            <span className="empty-state-icon">🧾</span>
            <p className="text-sm font-semibold text-white">No expenses yet</p>
            <p className="text-xs text-mono-400">Log the first one and the maths sorts itself out.</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-mono-800/70">
            {expenses.map((ex) => {
              const meta = CATEGORIES[ex.category] || CATEGORIES.other;
              const open = expanded === ex.id;
              const mine = ex.paid_by === currentUser.id;
              const shareIds = Object.keys(ex.shares || {});
              return (
                <li key={ex.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base ${meta.tint}`}>
                      {meta.emoji}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : ex.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-white">
                        {ex.description || meta.label}
                      </p>
                      <p className="truncate text-[11px] text-mono-400">
                        {mine ? 'You' : ex.paid_by_name} paid · {SPLIT_LABELS[ex.split_type] || 'Split'}
                        {shareIds.length > 0 ? ` · ${shareIds.length} ways` : ''}
                        {ex.created_at ? ` · ${new Date(ex.created_at).toLocaleDateString()}` : ''}
                      </p>
                    </button>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-white">{fmt(ex.amount)}</span>
                      {(mine || ex.shares?.[currentUser.id] != null) && (
                        <span className="block text-[10px] font-semibold text-mono-400">
                          your share {fmt(ex.shares?.[currentUser.id] ?? 0)}
                        </span>
                      )}
                    </span>
                    {(mine || members.some((m) => m.id === currentUser.id && m.role === 'admin')) && (
                      <button
                        type="button"
                        onClick={() => removeExpense(ex.id)}
                        aria-label="Delete expense"
                        className="shrink-0 rounded-lg p-1.5 text-mono-500 hover:bg-sos/15 hover:text-sos-300"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {open && (
                    <div className="mt-2.5 rounded-xl border border-mono-800/80 bg-mono-900/50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-mono-400">
                        Split between
                      </p>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {shareIds.length > 0 ? (
                          shareIds.map((id) => (
                            <li key={id} className="flex items-center justify-between text-xs">
                              <span className="text-mono-200">{memberName(id)}</span>
                              <span className="font-semibold text-white">{fmt(ex.shares[id])}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-mono-400">Equal split across the group</li>
                        )}
                      </ul>
                      {ex.note && (
                        <p className="mt-2 border-t border-mono-800/70 pt-2 text-[11px] italic text-mono-400">
                          “{ex.note}”
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
