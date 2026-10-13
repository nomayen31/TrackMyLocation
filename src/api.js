import axios from 'axios';

/**
 * Base URL of the backend API.
 *
 * Resolution order:
 *   1. `VITE_API_URL` — set this on the Render static site (recommended).
 *   2. Production default when the app is served from a real domain.
 *   3. Local dev default (http://localhost:5000).
 *
 * The production fallback means a deployed build still reaches the API even if
 * the env var was forgotten — a common cause of "everything 404s" in prod.
 * Vite inlines these at BUILD time, so redeploy after changing anything.
 */
const PROD_API_URL = 'https://trackmylocationbackend.onrender.com';

function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '');

  // `localhost` / `127.0.0.1` (incl. Vite preview) → talk to the local server.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    if (!isLocal) return PROD_API_URL;
  }

  return 'http://localhost:5000';
}

export const API_URL = resolveApiUrl();

// Shared axios instance: every request sends the Better Auth session cookie.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;
