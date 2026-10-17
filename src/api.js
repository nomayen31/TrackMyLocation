import axios from 'axios';

/**
 * Base URL of the backend API.
 *
 * Resolution order:
 *   1. `VITE_API_URL` — explicit override.
 *   2. A private LAN address (hotspot mode) → '' (same origin, served by the Pi).
 *   3. Production domain → the Render API.
 *   4. localhost → the local API during development.
 *
 * On the Raspberry Pi hotspot the app is served BY the backend, so requests must
 * stay on the same origin — both for CORS and because the Pi has no internet.
 */
const PROD_API_URL = 'https://trackmylocationbackend.onrender.com';

/** 10.x · 172.16-31.x · 192.168.x — i.e. a phone attached to the Pi's AP. */
function isPrivateHost(host) {
  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

    // Served from the hotspot AP → talk to the Pi that served this page.
    if (!isLocal && isPrivateHost(host)) return '';

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

/**
 * Session lifecycle.
 *
 * The app probes protected routes before sign-in (to restore a session), and
 * those probes legitimately return 401. If we treated every 401 as "session
 * lost", signing in would flash a "Session expired" toast — and a slow
 * pre-login probe could even log the user out a moment AFTER they signed in.
 *
 * So a 401 only counts when a session was believed to be active at the moment
 * the request was SENT. `sticky` then distinguishes a session that died within
 * seconds of starting (sign-in never actually took — almost always a blocked
 * cross-site cookie) from an ordinary mid-session expiry.
 */
let sessionActive = false;
let sessionSince = 0;

export function setSessionActive(active) {
  sessionActive = Boolean(active);
  sessionSince = sessionActive ? Date.now() : 0;
}

api.interceptors.request.use((config) => {
  config.__hadSession = sessionActive;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const hadSession = error.config?.__hadSession === true;
    const isAuthRoute = url.startsWith('/api/auth/') || url.startsWith('/api/lan/');

    if (status === 401 && hadSession && !isAuthRoute) {
      const sticky = sessionSince > 0 && Date.now() - sessionSince < 5000;
      setSessionActive(false); // report it once, not on every pending request
      try {
        window.dispatchEvent(
          new CustomEvent('trip-tracker:unauthorized', { detail: { sticky } })
        );
      } catch {
        /* non-browser */
      }
    }
    return Promise.reject(error);
  }
);

export default api;
