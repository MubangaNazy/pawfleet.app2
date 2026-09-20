import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyBm9p1VveDaDf0Lsyr0qVtyxgsznDCC0fk',
  authDomain: 'pawfleet-7bcf2.firebaseapp.com',
  projectId: 'pawfleet-7bcf2',
  storageBucket: 'pawfleet-7bcf2.firebasestorage.app',
  messagingSenderId: '557657510161',
  appId: '1:557657510161:web:e00898f1aebe33ad87fcb0',
};

const VAPID_KEY = 'BE3l3cJwUaDkln9WVjnd1WkuFIT5jSw6jPZlpJB_Tcp9YnCqX6ng1SFGS4ewIUw2MIbrXmmrL8tRrVPQu_J7fhw';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let messaging: Messaging | null = null;
// Push needs service workers, Push API and Notifications. Many in-app browsers and older phones lack them,
// and calling Firebase there throws "messaging/unsupported-browser". Check first and stay quiet if unsupported.
const messagingReady: Promise<boolean> = isSupported()
  .then(ok => {
    if (ok) messaging = getMessaging(app);
    return ok;
  })
  .catch(() => false);

export async function requestNotificationPermission(): Promise<string | null> {
  if (!(await messagingReady) || !messaging || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });
    return token || null;
  } catch {
    return null;
  }
}

export function onForegroundMessage(handler: (payload: { notification?: { title?: string; body?: string } }) => void) {
  let unsub: () => void = () => {};
  let cancelled = false;
  messagingReady.then(ok => {
    if (!ok || !messaging || cancelled) return;
    try { unsub = onMessage(messaging, handler); } catch { /* unsupported */ }
  });
  return () => { cancelled = true; unsub(); };
}
