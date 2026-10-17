import { useEffect, useRef } from 'react';

/**
 * useWakeLock — keeps the screen awake during a call.
 *
 * Mobile browsers suspend background tabs, which can drop the call audio and
 * stop the UI updating. A screen wake lock (where supported) keeps the device
 * from sleeping while a call is active, and is re-acquired when the page becomes
 * visible again.
 *
 * Gracefully does nothing on browsers without the Wake Lock API.
 */
export default function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }

    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!cancelled) lockRef.current = lock;
        else lock.release?.();
      } catch {
        /* denied or unsupported — harmless */
      }
    };

    const onVisibility = () => {
      // The OS releases the lock when the tab is hidden; re-acquire on return.
      if (document.visibilityState === 'visible' && !lockRef.current) request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        lockRef.current?.release?.();
      } catch {
        /* already released */
      }
      lockRef.current = null;
    };
  }, [active]);
}
