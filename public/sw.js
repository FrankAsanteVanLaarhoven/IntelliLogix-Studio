const CACHE_NAME = 'intellilogix-os-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Bypass API requests to allow backend comms
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response instantly if found
      if (response) return response;
      
      return fetch(event.request).then(res => {
         // Don't cache non-200 responses or opaque data unless necessary
         if (!res || res.status !== 200 || res.type !== 'basic') {
           return res;
         }
         const responseToCache = res.clone();
         caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
         });
         return res;
      });
    }).catch(() => caches.match('/'))
  );
});
