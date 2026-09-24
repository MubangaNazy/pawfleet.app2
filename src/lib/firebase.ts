import { Capacitor } from '@capacitor/core';
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
const native = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

let messaging: Messaging | null = null;
// Web push needs service workers, the Push API and Notifications. Many in-app browsers and older phones
// lack them, and calling Firebase there throws "messaging/unsupported-browser". Check first and stay quiet
// if unsupported. Not used at all on native — the Android app registers for push a different way, below.
const messagingReady: Promise<boolean> = native()
  ? Promise.resolve(false)
  : isSupported().then(ok => { if (ok) messaging = getMessaging(app); return ok; }).catch(() => false);

/**
 * Real Android push, delivered by the OS even when the app is fully closed — unlike the web path below,
 * which only works while a browser tab or installed PWA keeps running.
 */
async function nativePushToken(): Promise<string | null> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let status = (await PushNotifications.checkPermissions()).receive;
    if (status !== 'granted') status = (await PushNotifications.requestPermissions()).receive;
    if (status !== 'granted') return null;

    return await new Promise<string | null>(resolve => {
      let done = false;
      const finish = (v: string | null) => { if (!done) { done = true; resolve(v); } };
      PushNotifications.addListener('registration', token => finish(token.value));
      PushNotifications.addListener('registrationError', () => finish(null));
      PushNotifications.register().catch(() => finish(null));
      setTimeout(() => finish(null), 12000); // don't hang forever if the OS never answers
    });
  } catch {
    return null; // plugin missing from this build (e.g. a browser build that imported this file)
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (native()) return nativePushToken();
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
  if (native()) {
    // The OS shows the system notification itself when the app is backgrounded or closed. While the app is
    // open, PawFleet's own realtime chime already covers it (see AppContext), so nothing extra is needed here.
    return () => {};
  }
  let unsub: () => void = () => {};
  let cancelled = false;
  messagingReady.then(ok => {
    if (!ok || !messaging || cancelled) return;
    try { unsub = onMessage(messaging, handler); } catch { /* unsupported */ }
  });
  return () => { cancelled = true; unsub(); };
}
