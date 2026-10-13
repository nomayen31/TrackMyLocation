import { API_URL } from './api';

/**
 * checkBackend — pings the API once on startup and reports the result in the
 * console. This turns a silent "nothing works" into an explicit message, which
 * is especially useful when the frontend and API are on different origins.
 *
 * It is deliberately non-blocking: the app renders regardless.
 */
export async function checkBackend() {
  const url = `${API_URL}/health`;

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      console.warn(`[Trip Tracker] Backend at ${API_URL} responded with HTTP ${res.status}.`);
      return false;
    }
    const data = await res.json().catch(() => ({}));
    console.info(`[Trip Tracker] Backend online → ${API_URL}`, data);
    return true;
  } catch (err) {
    // A thrown fetch (not a non-2xx) almost always means CORS blocked it, or
    // the host is unreachable.
    console.error(
      `[Trip Tracker] Cannot reach the backend at ${API_URL}.\n` +
        `• If this site runs on a different origin, add its exact origin to the backend's ` +
        `CLIENT_URL (Render → your API service → Environment) and redeploy the API.\n` +
        `• Free Render instances sleep; the first request can take ~30-50s to wake.\n` +
        `Original error: ${err.message}`
    );
    return false;
  }
}
