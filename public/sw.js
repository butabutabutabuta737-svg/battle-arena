// Deliberately network-only — this project already hit real confusion once from a
// stale-cached file after an edit (see server.js's Cache-Control:no-store on every response).
// A passthrough fetch handler still satisfies PWA installability (browsers require a
// service worker with a fetch handler registered) without reintroducing that risk for a
// client.js/style.css that changes during active development.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
