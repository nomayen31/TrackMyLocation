import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import Avatar from './Avatar';

function formatMoney(cents) {
  const value = typeof cents === 'number' ? cents : Number(cents || 0);
  return `$${value.toFixed(2)}`;
}

export default function ExpensePanel({ groupId, currentUser }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes, balanceRes] = await Promise.all([
        api.get(`/api/expenses/${groupId}`),
        api.get(`/api/expenses/summary/${groupId}`),
        api.get(`/api/expenses/${groupId}/balance`),
      ]);
      setExpenses(listRes.data);
      setSummary(summaryRes.data);
      setSettlements(balanceRes.data.settlements || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) load();
  }, [load]);

  const addExpense = async (e) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/api/expenses', {
        groupId,
        amount: parsed,
        description: description.trim(),
      });
      setAmount('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add expense');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-36 w-full rounded-2xl" />
          <div className="skeleton h-36 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const total = summary?.total ?? 0;
  const members = summary?.members ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-mono-950 p-4 sm:p-5">
      {/* Total + add expense */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="hero-panel animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-mono-400">
            Total trip expenses
          </p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            {formatMoney(total)}
          </p>
          <p className="mt-2 text-xs text-mono-400">
            Split equally among {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        <form onSubmit={addExpense} className="card card-pad animate-fade-up">
          <h3 className="section-title">Add an expense</h3>
          <p className="section-hint mt-0.5">Log what you paid — we&apos;ll do the math.</p>
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-mono-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-7"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Description (e.g. Dinner)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Adding…' : 'Add Expense'}
            </button>
            {error && (
              <p className="rounded-lg border border-mono-700 bg-mono-800 px-3 py-2 text-sm text-mono-100">
                {error}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Settlements */}
      {settlements.length > 0 && (
        <div className="card card-pad animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Who owes whom</h3>
            <span className="chip chip-brand">{settlements.length} to settle</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {settlements.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-mono-800 bg-mono-850 px-4 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-mono-400">
                  <span className="truncate font-semibold text-white">{s.fromName}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0 text-mono-500"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="truncate font-semibold text-white">{s.toName}</span>
                </span>
                <span className="shrink-0 font-bold text-white">{formatMoney(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Per-member summary */}
        <div className="card card-pad animate-fade-up">
          <h3 className="section-title">Member balances</h3>
          <ul className="mt-3 flex flex-col divide-y divide-mono-800">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <span className="truncate text-sm font-medium text-mono-100">
                    {m.name}
                    {m.userId === currentUser.id && (
                      <span className="ml-1.5 text-xs font-normal text-mono-500">(you)</span>
                    )}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-mono-500">spent {formatMoney(m.spent)}</p>
                  {m.owes > 0 ? (
                    <p className="text-sm font-semibold text-white">owes {formatMoney(m.owes)}</p>
                  ) : m.receivable > 0 ? (
                    <p className="text-sm font-semibold text-accent-300">
                      gets back {formatMoney(m.receivable)}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-mono-500">settled</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Expense list */}
        <div className="card card-pad animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Recent expenses</h3>
            {expenses.length > 0 && <span className="chip chip-slate">{expenses.length}</span>}
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state py-10">
              <span className="empty-state-icon">🧾</span>
              <p className="text-sm font-semibold text-white">No expenses yet</p>
              <p className="text-xs text-mono-400">Add the first one to start splitting.</p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-mono-800">
              {expenses.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-mono-100">
                      {ex.description || 'Expense'}
                    </p>
                    <p className="text-xs text-mono-500">paid by {ex.paid_by_name}</p>
                  </div>
                  <span className="shrink-0 font-bold text-white">{formatMoney(ex.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
