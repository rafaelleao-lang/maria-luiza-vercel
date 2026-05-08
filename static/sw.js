// Service Worker — Maria Luiza PWA
const CACHE = 'ml-v2';
const OFFLINE_ASSETS = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(OFFLINE_ASSETS).catch(() => {})
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Requests de API: sempre rede, sem cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ status: 'error', msg: 'Sem conexão' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Demais: cache first, fallback rede
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});
