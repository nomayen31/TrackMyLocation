import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import lanApi from './lanApi';

/**
 * useLan — hotspot identity + "who is in the signal" presence.
 *
 * On the Raspberry Pi the app is served by the backend itself, so all calls are
 * same-origin and need no internet. Identity is a name plus a signed LAN token
 * (see backend/src/lan/token.js) — there is no cloud login in this mode.
 */
const TOKEN_KEY = 'trip-tracker.lan.token';
const USER_KEY = 'trip-tracker.lan.user';
const DEVICE_KEY = 'trip-tracker.lan.device';

/** Stable per-browser device id (survives reloads, not shared between devices). */
function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        globalThis.crypto?.randomUUID?.() ||
        `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function useLan() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [socket, setSocket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const tokenRef = useRef(null);
  const socketRef = useRef(null);

  /* --------------------------------------------- detect + restore session */
  useEffect(() => {
    let active = true;

    lanApi
      .info()
      .then(async (data) => {
        if (!active) return;
        setInfo(data);
        if (!data?.lanMode) return;

        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
          const me = await lanApi.me(token);
          if (active) {
            tokenRef.current = token;
            setUser(me.user);
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  /* ------------------------------------------------------ socket + presence */
  useEffect(() => {
    if (!user || !tokenRef.current) return undefined;

    // Same-origin by design: the Pi serves both the app and the API.
    const s = io(undefined, {
      auth: { lanToken: tokenRef.current },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    setSocket(s);

    const refresh = () => {
      s.emit('lan:nearby', {}, (res) => {
        if (res?.ok) setNearby(res.nearby || []);
      });
    };

    s.on('connect', refresh);
    s.on('lan:presence', (payload) => setNearby(payload?.nearby || []));
    s.on('connect_error', (err) => setError(err?.message || 'Connection failed'));

    // Heartbeat keeps this device "nearby" while the tab is open.
    const heartbeat = setInterval(() => s.emit('lan:ping', {}), 20000);

    return () => {
      clearInterval(heartbeat);
      s.off();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  /* ------------------------------------------------------------------ actions */
  const join = useCallback(async (name) => {
    setBusy(true);
    setError('');
    try {
      const deviceId = getDeviceId();
      const res = await lanApi.join(name, deviceId);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      tokenRef.current = res.token;
      setUser(res.user);
      return true;
    } catch (err) {
      setError(err.message || 'Could not join this hotspot');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const leave = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    tokenRef.current = null;
    setUser(null);
    setNearby([]);
  }, []);

  return {
    info,
    loading,
    user,
    nearby,
    socket,
    busy,
    error,
    join,
    leave,
    clearError: () => setError(''),
  };
}
