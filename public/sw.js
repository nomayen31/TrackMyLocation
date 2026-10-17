/* eslint-env serviceworker */
/**
 * Trip Tracker service worker.
 *
 * Shows incoming-call / message notifications, including when no tab is open
 * (delivered via Web Push). Clicking focuses the app or opens it.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Trip Tracker', body: event.data ? event.data.text() : '' };
  }

  const isCall = data.type === 'incoming-call';
  const title = data.title || 'Trip Tracker';

  const options = {
    body: data.body || '',
    tag: data.tag || 'trip-tracker',
    renotify: true,
    // A call should stay on screen until the user acts.
    requireInteraction: isCall,
    vibrate: isCall ? [400, 150, 400, 150, 700] : [120],
    data: {
      url: data.url || '/',
      type: data.type || 'info',
      callId: data.callId || null,
    },
    actions: isCall ? [{ action: 'open', title: 'Open' }] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          try {
            await client.focus();
            return;
          } catch {
            /* fall through */
          }
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
