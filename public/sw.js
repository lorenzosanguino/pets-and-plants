const CACHE_NAME = 'petplant-cache-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Solo cachear peticiones GET, omitir Firebase/Firestore y llamadas a Open-Meteo
  if (
    e.request.method !== 'GET' ||
    e.request.url.includes('firestore') ||
    e.request.url.includes('firebase') ||
    e.request.url.includes('open-meteo.com')
  ) {
    return;
  }

  const url = new URL(e.request.url);
  const isImage = e.request.destination === 'image' ||
                  /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname) ||
                  e.request.url.includes('firebasestorage') ||
                  e.request.url.includes('unsplash.com');

  const isFont = e.request.destination === 'font' ||
                 /\.(woff|woff2|ttf|otf)$/i.test(url.pathname);

  if (isImage || isFont) {
    // Estrategia: Cache-First
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          if (
            networkResponse.status === 200 &&
            !e.request.url.includes('chrome-extension')
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
  } else {
    // Estrategia: Stale-While-Revalidate
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (
            networkResponse.status === 200 &&
            !e.request.url.includes('chrome-extension')
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clone);
            });
          }
          return networkResponse;
        });

        if (cachedResponse) {
          // Si tenemos respuesta en caché, silenciamos el error del fetch de fondo
          fetchPromise.catch(() => {});
          return cachedResponse;
        }

        // Si no está en caché, dejamos que el error de red se propague
        return fetchPromise;
      })
    );
  }
});

// Web Push Events
self.addEventListener('push', (e) => {
  let data = { title: 'Ecosistema de Bienestar', body: 'Mensaje de alerta push' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: 'Ecosistema de Bienestar', body: e.data.text() };
    }
  }
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Message interface for simulated push notifications
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SIMULATE_PUSH') {
    const options = {
      body: e.data.body || 'Alerta de recordatorio',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: {
        url: '/'
      }
    };
    self.registration.showNotification(e.data.title || 'Push Simulada', options);
  }
});

