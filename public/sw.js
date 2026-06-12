const CACHE_NAME = 'petplant-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Solo cachear peticiones de nuestro propio origen (mismo host) y método GET
  if (url.origin === self.location.origin && e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-While-Revalidate: servir del caché e intentar actualizar en segundo plano
          fetch(e.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse);
              });
            }
          }).catch(() => {
            // Ignorar errores de red en segundo plano
          });
          return cachedResponse;
        }

        return fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si falla la red y no está en caché, intentar devolver el index.html para SPA routing
          return caches.match('/');
        });
      })
    );
  }
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = e.data;
    self.registration.showNotification(title, options);
  }
});
