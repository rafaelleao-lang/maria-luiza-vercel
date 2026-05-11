// ===================================================================
// Maria Luiza — Service Worker unificado
// Integra: cache offline + OneSignal push notifications
// ===================================================================

// Importa OneSignal (push notifications)
try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {
  // Sem notificações não é erro fatal
}

const CACHE = 'ml-v4';
const STATIC_ASSETS = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  '/static/icons/ml.svg',
];

// ===== INSTALL =====
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)))
    )
  );
});

// ===== ACTIVATE: apaga caches antigos =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', e => {
  const { request } = e;

  // Só intercepta GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: sempre rede (dados em tempo real)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ status: 'error', msg: 'Sem conexão' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Assets externos (Fonts, Chart.js): stale-while-revalidate
  if (url.origin !== self.location.origin) {
    e.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE).then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Assets locais: cache first, depois rede
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE).then(c => c.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
