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
