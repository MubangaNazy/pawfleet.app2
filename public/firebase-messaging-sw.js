importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBm9p1VveDaDf0Lsyr0qVtyxgsznDCC0fk',
  authDomain: 'pawfleet-7bcf2.firebaseapp.com',
  projectId: 'pawfleet-7bcf2',
  storageBucket: 'pawfleet-7bcf2.firebasestorage.app',
  messagingSenderId: '557657510161',
  appId: '1:557657510161:web:e00898f1aebe33ad87fcb0',
});

const messaging = firebase.messaging();

// Handle background messages (app not in foreground)
messaging.onBackgroundMessage(payload => {
  const { title = 'PawFleet', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data,
  });
});

// Clicking the notification opens the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// ── Picture cache ───────────────────────────────────────────────────────────
// Pictures already seen (pet photos, product photos, avatars, the app's own images) are kept on the
// phone, so they still show on a slow or dropped connection. Shown from the cache straight away and
// refreshed in the background. Only images: pages, code and data always come from the network.
const IMG_CACHE = 'pf-images-v1';
const IMG_MAX = 250;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('pf-images-') && k !== IMG_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function cacheableImage(req) {
  if (req.method !== 'GET' || req.destination !== 'image') return false;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) return /^\/(images|icons|landing)\//.test(u.pathname) || /\.(png|jpe?g|webp|svg)$/i.test(u.pathname);
  return /\.supabase\.co$/.test(u.hostname) && u.pathname.includes('/storage/v1/object/public/')
    || u.hostname === 'images.unsplash.com';
}

async function trimImages() {
  const cache = await caches.open(IMG_CACHE);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - IMG_MAX; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (!cacheableImage(req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(IMG_CACHE);
    const hit = await cache.match(req);
    // Other sites' pictures are fetched with CORS (Supabase allows it) so the cache stores a normal
    // response; browsers count "opaque" ones as several MB each and the cache would fill up fast.
    const sameSite = new URL(req.url).origin === self.location.origin;
    const net = sameSite ? fetch(req) : fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req));
    const fresh = net.then(res => {
      // Only keep real pictures, never error pages.
      if (res.ok) {
        cache.put(req, res.clone()).then(trimImages).catch(() => {});
      }
      return res;
    }).catch(() => hit || Response.error());
    if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  })());
});
