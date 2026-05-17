const CACHE_NAME = 'cockpit-pro-v3';
const STATIC_ASSETS = ['/', '/index.html'];

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // activate immediately
});

// Activate — delete ALL old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k))) // delete everything
    )
  );
  self.clients.claim();
});

// Fetch — network first, API bypass cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('onrender.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('cloudinary.com')) {
    return; // no cache for API/external
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
