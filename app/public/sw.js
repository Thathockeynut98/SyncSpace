self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Kept deliberately thin: the app itself is fetched from the network, so a new
// deploy never waits on a stale copy. This handler is what makes the app
// installable from the browser's Add to Home Screen.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request));
});

// A tap on an alert or a ring brings the space back to the front.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((client) => 'focus' in client);
      if (open) return open.focus();
      return self.clients.openWindow(target);
    })
  );
});
