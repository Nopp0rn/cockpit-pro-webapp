const CACHE_NAME = 'cockpit-pro-v5';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network only — ไม่ cache เพื่อความเสถียร
self.addEventListener('fetch', () => { return; });
