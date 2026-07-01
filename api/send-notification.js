import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel stores multiline env vars with literal \n — convert back
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, title, body, data } = req.body || {};
  if (!token || !title) return res.status(400).json({ error: 'token and title required' });

  try {
    getAdminApp();
    const messaging = getMessaging();
    const messageId = await messaging.send({
      token,
      notification: { title, body: body || '' },
      data: data || {},
      webpush: {
        notification: {
          title,
          body: body || '',
          icon: 'https://pawfleetapp2.vercel.app/icons/icon-192.png',
          badge: 'https://pawfleetapp2.vercel.app/icons/icon-192.png',
          requireInteraction: true,
        },
        fcmOptions: { link: 'https://pawfleetapp2.vercel.app/' },
      },
    });
    return res.status(200).json({ ok: true, messageId });
  } catch (err) {
    console.error('FCM send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
