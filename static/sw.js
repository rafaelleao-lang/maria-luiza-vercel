// ===================================================================
// Maria Luiza — Service Worker unificado v5
// Integra: cache offline + OneSignal push + timer background
// ===================================================================

try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {}

const CACHE = 'ml-v5';
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

// ===== ACTIVATE: apaga TODOS os caches antigos =====
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
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API: sempre rede
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

  // Assets externos: stale-while-revalidate
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

// ===================================================================
// TIMER ARROTO — agendamento de notificação em background
// O SW recebe a mensagem ML_TIMER_SCHEDULE do app e agenda a notificação.
// Isso permite a notificação disparar mesmo com o app minimizado.
// LIMITAÇÃO: se o dispositivo matar o SW por economia de bateria (>10-15min
// em background), a notificação pode não disparar. O timestamp salvo no
// localStorage garante o display correto ao retornar ao app.
// ===================================================================

let _timerTimeout = null;

self.addEventListener('message', e => {
  if (!e.data?.type) return;

  if (e.data.type === 'ML_TIMER_SCHEDULE') {
    if (_timerTimeout) { clearTimeout(_timerTimeout); _timerTimeout = null; }
    const delay = e.data.endTs - Date.now();
    if (delay <= 0) return;
    _timerTimeout = setTimeout(async () => {
      _timerTimeout = null;
      // Fecha notificação "timer ativo" se ainda estiver aberta
      try {
        const ativas = await self.registration.getNotifications({ tag: 'ml-timer-ativo' });
        ativas.forEach(n => n.close());
      } catch {}
      // Dispara notificação de conclusão
      try {
        await self.registration.showNotification('Maria Luiza 💖 — Hora de arrotar! 🎉', {
          body: 'Os 15 minutos terminaram. Hora de fazer a Maria Luiza arrotar!',
          icon: '/static/icons/ml.svg',
          badge: '/static/icons/ml.svg',
          vibrate: [300, 100, 300, 100, 300],
          tag: 'ml-timer-concluido',
          requireInteraction: true,
          actions: [{ action: 'open', title: '📱 Abrir App' }],
        });
      } catch {}
    }, delay);
  }

  if (e.data.type === 'ML_TIMER_CANCEL') {
    if (_timerTimeout) { clearTimeout(_timerTimeout); _timerTimeout = null; }
    try {
      self.registration.getNotifications({ tag: 'ml-timer-ativo' })
        .then(ns => ns.forEach(n => n.close()));
      self.registration.getNotifications({ tag: 'ml-timer-concluido' })
        .then(ns => ns.forEach(n => n.close()));
    } catch {}
  }
});

// ===== NOTIFICATIONCLICK — abre o app ao clicar na notificação =====
self.addEventListener('notificationclick', e => {
  if (!e.notification.tag?.startsWith('ml-')) return;
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
