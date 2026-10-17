import api from './api';

/**
 * push — service-worker registration and Web Push subscription.
 *
 * This is what lets an incoming call ring when the tab is **closed**: the
 * server sends a Web Push message, the service worker shows a notification, and
 * tapping it opens the app.
 *
 * Requirements:
 *   • HTTPS (Push API is a secure-context feature)
 *   • on iOS 16.4+ the app must be added to the Home Screen (PWA) for push
 */

/** Convert a base64url VAPID key into the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Register the service worker (safe to call repeatedly). */
export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('Service worker registration failed:', err.message);
    return null;
  }
}

/**
 * Subscribe this browser to push and store the subscription server-side.
 * Must be called from a user gesture (or after one) for the permission prompt.
 */
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: 'sw-failed' };

  try {
    const { data } = await api.get('/api/push/public-key');
    if (!data?.configured || !data.publicKey) return { ok: false, reason: 'not-configured' };

    if (Notification.permission === 'denied') return { ok: false, reason: 'denied' };
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return { ok: false, reason: 'dismissed' };
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await api.post('/api/push/subscribe', { subscription });
    return { ok: true };
  } catch (err) {
    console.warn('Push subscription failed:', err?.message || err);
    return { ok: false, reason: 'error', error: err?.message };
  }
}

/** Unsubscribe this browser. */
export async function disablePush() {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager?.getSubscription();
    if (!subscription) return false;
    await api.delete('/api/push/subscribe', { data: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/**
 * Show a notification for an incoming call while the tab is hidden.
 * Push covers the closed-tab case; this covers a backgrounded tab immediately,
 * without waiting for the push round-trip.
 */
export async function notifyIncomingCall({ name, callId }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  const options = {
    body: 'Tap to open Trip Tracker and answer',
    tag: `call-${callId || 'incoming'}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 700],
    data: { url: '/', type: 'incoming-call', callId },
    actions: [{ action: 'open', title: 'Open' }],
  };

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    // Prefer the SW (works the same on mobile and gives us the click handler).
    if (reg?.showNotification) {
      await reg.showNotification(`Incoming call from ${name || 'a member'}`, options);
    } else {
      new Notification(`Incoming call from ${name || 'a member'}`, options);
    }
    return true;
  } catch {
    return false;
  }
}
