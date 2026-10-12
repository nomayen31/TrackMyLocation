import React, { useState } from 'react';
import api from '../api';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mono-400';

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = mode === 'signup' ? { name, email, password } : { email, password };

      // withCredentials: true sends/receives the Better Auth session cookie.
      const res = await api.post(endpoint, payload);

      onAuthed(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Network error. Is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mono-950 px-5 py-10">
      {/* Monochrome ambient glow — no colour, just light. */}
      <div className="pointer-events-none absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[-15%] h-96 w-96 rounded-full bg-white/[0.03] blur-3xl" />

      <div className="relative w-full max-w-[420px] animate-fade-up">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-mono-950">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z" />
            </svg>
          </span>
          <div>
            <p className="text-base font-extrabold tracking-tight text-white">Trip Tracker</p>
            <p className="text-xs text-mono-400">Live location, stories, expenses & chat</p>
          </div>
        </div>

        <div className="rounded-3xl border border-mono-800 bg-mono-900 p-7 shadow-lift">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-mono-400">
            {mode === 'login'
              ? 'Sign in to continue to your trips.'
              : 'Start tracking your trips in seconds.'}
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className={labelClass} htmlFor="auth-name">
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input"
                />
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-mono-700 bg-mono-800 px-3 py-2.5 text-sm text-mono-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4.5M12 16h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full py-3">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-5 border-t border-mono-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="w-full text-center text-sm font-semibold text-mono-300 transition hover:text-white"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
