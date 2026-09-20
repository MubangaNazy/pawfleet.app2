// Delete the signed-in person's PawFleet account.
// POST /api/delete-account   Authorization: Bearer <their login token>   body: { "confirm": "DELETE" }
//
// Needs SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings. That key can delete logins, so it
// only ever lives on the server, never in the app.
//
// What happens:
//   removed   login, profile details, photos, dogs without booking history, messages they sent,
//             notifications, community posts, shop products
//   kept      completed walk and payment rows, with names, addresses, notes and routes wiped, because
//             the other person's earnings and PawFleet's accounting depend on them
//   cancelled open bookings they made; walks they were due to do go back to the pool

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();

const ADMIN_MESSAGE = 'Admin accounts must be removed by another admin.';
const NOT_ON_MESSAGE = 'Account deletion is not switched on yet. Please email pawfleetapp@gmail.com and we will delete your account.';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !anon || !service) return res.status(503).json({ error: NOT_ON_MESSAGE });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again, then delete your account.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm.' });

  // Who is asking? Only ever their own account, taken from their login token, never from the request body.
  let uid;
  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again, then delete your account.' });
    uid = (await who.json()).id;
    if (!uid) throw new Error('no id');
  } catch {
    return res.status(401).json({ error: 'Could not confirm who you are. Please log in again.' });
  }

  const sb = (path, opts = {}) => fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(opts.headers || {}) },
  });
  const patch = (path, data) => sb(path, { method: 'PATCH', body: JSON.stringify(data) });
  const del = path => sb(path, { method: 'DELETE' });
  const getJson = async path => { const r = await sb(path, { headers: { Prefer: '' } }); return r.ok ? r.json() : []; };
  const inList = ids => `in.(${ids.join(',')})`;

  const report = [];
  // Steps that are nice to have: a failure is noted but never blocks the deletion.
  const soft = async (label, fn) => {
    try { const r = await fn(); report.push({ step: label, ok: r?.ok !== false }); }
    catch { report.push({ step: label, ok: false }); }
  };

  try {
    const profile = (await getJson(`users?id=eq.${uid}&select=id,role`))[0];
    if (profile?.role === 'admin') return res.status(403).json({ error: ADMIN_MESSAGE });
    const role = profile?.role;

    // 1. Bookings
    await soft('cancel open bookings', () => patch(`walks?owner_id=eq.${uid}&status=in.(pending,assigned,active)`, { status: 'cancelled' }));
    await soft('return their jobs to the pool', () => patch(`walks?walker_id=eq.${uid}&status=in.(pending,assigned)`, { walker_id: null, status: 'pending' }));
    await soft('cancel their active jobs', () => patch(`walks?walker_id=eq.${uid}&status=eq.active`, { status: 'cancelled' }));
    // Keep the rows for accounting, wipe everything that identifies a place or a person.
    await soft('wipe locations and notes from their walks', () =>
      patch(`walks?or=(owner_id.eq.${uid},walker_id.eq.${uid})`, {
        notes: null, start_lat: null, start_lng: null, start_address: null, end_lat: null, end_lng: null, end_address: null, route_points: null,
      }));

    // 2. Messages, notifications, posts, shop
    await soft('messages', () => del(`direct_messages?sender_id=eq.${uid}`));
    await soft('walk chat messages', () => del(`messages?sender_id=eq.${uid}`));
    await soft('notifications', () => del(`notifications?user_id=eq.${uid}`));
    await soft('community posts', () => del(`community_posts?author_id=eq.${uid}`));
    await soft('shop products', () => del(`shop_products?shop_owner_id=eq.${uid}`));
    await soft('shop orders (buyer name)', () => patch(`shop_orders?buyer_id=eq.${uid}`, { buyer_name: 'Deleted user' }));
    await soft('walker stats', () => del(`walker_stats?walker_id=eq.${uid}`));

    // 3. Pets: remove the ones with no booking history, anonymise the rest.
    const dogs = await getJson(`dogs?owner_id=eq.${uid}&select=id`);
    const dogIds = dogs.map(d => d.id);
    if (dogIds.length) {
      const used = new Set((await getJson(`walks?dog_id=${inList(dogIds)}&select=dog_id`)).map(w => w.dog_id));
      const unused = dogIds.filter(id => !used.has(id));
      const kept = dogIds.filter(id => used.has(id));
      if (unused.length) await soft('remove pets', () => del(`dogs?id=${inList(unused)}`));
      if (kept.length) {
        await soft('anonymise pets with history', () => patch(`dogs?id=${inList(kept)}`, { name: 'Pet', breed: null, notes: null, image_url: null }));
        await soft('pet health logs', () => del(`health_logs?dog_id=${inList(kept)}`));
      }
    }

    // 4. Photos in storage
    const rm = (bucket, paths) => fetch(`${url}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths }),
    });
    await soft('profile photos', () => rm('avatars', ['jpg', 'jpeg', 'png', 'webp'].flatMap(e => [`${uid}.${e}`, `nrc/${uid}.${e}`])));
    if (dogIds.length) await soft('pet photos', () => rm('pet-images', dogIds.map(id => `${id}.jpg`)));

    // 5. The profile row itself stays (bookings point at it) but holds nothing about the person.
    const wipe = {
      name: 'Deleted user', email: null, phone: `deleted-${uid}`, password: '', image_url: null,
      nrc: null, nrc_image_url: null, business_name: null, business_address: null, business_type: null,
      service_lat: null, service_lng: null, online_lat: null, online_lng: null, is_online: false,
      fcm_token: null, pricing: null,
      ...(role === 'walker' ? { walker_status: 'suspended' } : {}),
    };
    const profileWipe = await patch(`users?id=eq.${uid}`, wipe);
    if (!profileWipe.ok) {
      return res.status(500).json({ error: 'We could not finish deleting your account. Nothing more was changed. Please try again, or email pawfleetapp@gmail.com.' });
    }
    report.push({ step: 'profile', ok: true });

    // 6. Last: the login. Once this is gone they cannot sign in.
    const authDel = await fetch(`${url}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE', headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    if (!authDel.ok && authDel.status !== 404) {
      return res.status(500).json({ error: 'Your details were removed, but we could not remove your login. Please email pawfleetapp@gmail.com and we will finish it.' });
    }
    report.push({ step: 'login', ok: true });

    return res.status(200).json({ ok: true, steps: report });
  } catch (err) {
    console.error('delete-account failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again, or email pawfleetapp@gmail.com.' });
  }
}
