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

export default api;
