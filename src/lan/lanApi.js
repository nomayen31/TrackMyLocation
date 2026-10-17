/**
 * LAN API client — always SAME-ORIGIN.
 *
 * In hotspot mode the backend serves this app, so every LAN call must go to the
 * origin that delivered the page (the Pi). Using a relative path avoids any
 * dependence on hostname detection and works identically on
 * http://192.168.4.1:3000 and http://localhost:5057.
 */

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const lanApi = {
  info: () => request('/api/lan/info'),
  me: (token) => request('/api/lan/me', { token }),
  join: (name, deviceId) => request('/api/lan/join', { method: 'POST', body: { name, deviceId } }),
  nearby: (token) => request('/api/lan/nearby', { token }),
};

export default lanApi;
