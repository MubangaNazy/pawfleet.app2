// Admin-only, one-click utility: creates (or reuses) a demo shop account and (re)stocks it with a
// fixed set of sample accessories, each with a real verified photo. Exists so the admin can review the
// items, then delete the whole demo account (or individual products) once real inventory replaces them.
// POST /api/admin-seed-demo-shop   Authorization: Bearer <the admin's own login token>

import crypto from 'crypto';

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();

const DEMO_EMAIL = 'demo-shop@pawfleetapp.com';
const DEMO_NAME = 'PawFleet Demo Shop';

const img = (id) => `https://images.unsplash.com/photo-${id}?w=600&q=80`;

// Photo for each is verified to actually show the item (or, for "Retractable Leash", the closest real
// match found — a standard leash photo, flagged below so it can be swapped once a real product photo
// exists). Items that had no genuine free matching photo (e.g. a poop bag dispenser) were left out
// rather than ship a misleading picture — add those by hand with a real photo when ready.
const DEMO_PRODUCTS = [
  { name: 'Nylon Dog Leash (1.5m)', price: 120, category: 'accessories', img: img('1644416225353-adc117940526'), description: 'Sturdy 1.5m nylon leash with a comfortable hand loop.' },
  { name: 'Retractable Leash', price: 180, category: 'accessories', img: img('1644416225353-adc117940526'), description: 'Extends and retracts for more freedom on walks. (Placeholder photo — swap for a real product photo when available.)' },
  { name: 'Pet Carrier Backpack', price: 420, category: 'accessories', img: img('1527150602-a98f7a6f2746'), description: 'Ventilated backpack carrier for travel or vet visits, for small dogs, cats and other small pets.' },
  { name: 'Adjustable Collar', price: 90, category: 'accessories', img: img('1673069783560-6d4094285be4'), description: 'Adjustable, comfortable collar that fits most small-to-medium dogs.' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !anon || !service) return res.status(503).json({ error: 'Not configured. Contact support.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again, then try again.' });

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again.' });
    const callerId = (await who.json()).id;
    const callerRow = await admin(`/rest/v1/users?id=eq.${callerId}&select=role`).then(r => r.json());
    if (callerRow?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Only an admin can do this.' });

    const password = crypto.randomBytes(9).toString('base64url');
    let demoId;
    let created = false;

    const existing = await admin(`/rest/v1/users?email=eq.${encodeURIComponent(DEMO_EMAIL)}&select=id`).then(r => r.json());
    if (existing?.[0]?.id) {
      demoId = existing[0].id;
      // Always reset the password so we can hand back working credentials even on a repeat run.
      const reset = await admin(`/auth/v1/admin/users/${demoId}`, { method: 'PUT', body: JSON.stringify({ password }) });
      if (!reset.ok) return res.status(500).json({ error: 'Could not reset the demo account password.' });
    } else {
      const createdAuth = await admin('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: DEMO_EMAIL, password, email_confirm: true, user_metadata: { name: DEMO_NAME, role: 'shopowner' } }),
      });
      const createdJson = await createdAuth.json();
      if (!createdAuth.ok) return res.status(500).json({ error: createdJson.msg || createdJson.message || 'Could not create the demo account.' });
      demoId = createdJson.id;
      created = true;

      const profile = await admin('/rest/v1/users', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: demoId, name: DEMO_NAME, email: DEMO_EMAIL, phone: null, password: '', role: 'shopowner',
          business_name: DEMO_NAME, business_type: 'Pet Supplies',
        }),
      });
      if (!profile.ok) {
        await admin(`/auth/v1/admin/users/${demoId}`, { method: 'DELETE' }).catch(() => {});
        const err = await profile.json().catch(() => ({}));
        return res.status(500).json({ error: err.message || 'Could not finish creating the demo account.' });
      }
    }

    // Idempotent restock: clear whatever this demo account listed before, then add the current set.
    await admin(`/rest/v1/shop_products?shop_owner_id=eq.${demoId}`, { method: 'DELETE' }).catch(() => {});
    const rows = DEMO_PRODUCTS.map(p => ({
      id: `demo_${crypto.randomUUID()}`, name: p.name, price: p.price, badge: 'New',
      img: p.img, category: p.category, description: p.description, shop_owner_id: demoId,
    }));
    const inserted = await admin('/rest/v1/shop_products', {
      method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows),
    });
    if (!inserted.ok) {
      const err = await inserted.json().catch(() => ({}));
      return res.status(500).json({ error: err.message || 'Account ready, but adding the products failed.' });
    }

    return res.status(200).json({ ok: true, email: DEMO_EMAIL, password, created, productsAdded: rows.length });
  } catch (err) {
    console.error('admin-seed-demo-shop failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
