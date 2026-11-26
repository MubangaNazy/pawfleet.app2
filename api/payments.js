// Mobile money payments through Lenco. Replaces create-payment.js and verify-payment.js (one function
// instead of two, which also keeps the project under Vercel Hobby's 12-function cap).
//
// POST /api/payments  Authorization: Bearer <login token>
//   { action: 'create', kind, refId?, operator, phone, payload? }  -> sends ONE prompt to the phone
//   { action: 'status', intentId }                                  -> asks Lenco, records the outcome once
//
// Rules that stop repeated prompts (the "15 prompts after cancelling" report):
//   - the amount is worked out here, never taken from the phone
//   - the same person paying for the same thing within 3 minutes gets the prompt already sent, not a new one
//   - at most 3 prompts per person per 10 minutes
//   - a cancelled or declined prompt is reported as failed, so the app stops waiting
//   - the outcome is saved with "only if still pending", so checking twice can never apply a payment twice

import { cors, readBody, getCaller, adminFetch, adminJson, clean } from './_lib/server.js';

const LENCO = 'https://api.lenco.co/access/v2';
const SUBSCRIPTION_PRICE = { walker: 100, shopowner: 250, vet: 350 };
const OPERATORS = ['airtel', 'mtn', 'zamtel'];
const REUSE_MS = 3 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const EXPIRE_MS = 15 * 60 * 1000;

const lencoKey = () => clean(process.env.LENCO_SECRET_KEY);

async function lencoFetch(path, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${LENCO}${path}`, {
      ...opts,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${lencoKey()}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

function mapStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['successful', 'success', 'completed', 'paid'].includes(s)) return 'successful';
  if (['failed', 'cancelled', 'canceled', 'declined', 'rejected', 'expired', 'reversed', 'abandoned'].includes(s)) return 'failed';
  return 'pending';
}

const normPhone = p => {
  const d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('260')) return d;
  if (d.startsWith('0')) return `260${d.slice(1)}`;
  if (d.length === 9) return `260${d}`;
  return d;
};

const newReference = kind => `PF-${kind === 'shop_order' ? 'SHOP' : kind === 'subscription' ? 'SUB' : kind === 'walk' ? 'WALK' : 'PLAN'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const publicIntent = i => ({
  intentId: i.id, reference: i.reference, status: i.status, amount: Number(i.amount),
  operator: i.operator, result: i.result || {}, createdAt: i.created_at,
});

// ── Amount, worked out on the server ─────────────────────────────────────────
async function priceFor(kind, caller, refId, payload) {
  if (kind === 'subscription') {
    const price = SUBSCRIPTION_PRICE[caller.role];
    if (!price) return { error: 'Subscriptions are for walkers, vets and shops.' };
    return { amount: price, refId: caller.id, payload: {} };
  }
  if (kind === 'walk') {
    if (!refId) return { error: 'Missing booking.' };
    const rows = await adminJson(`/rest/v1/walks?id=eq.${encodeURIComponent(refId)}&owner_id=eq.${caller.id}&select=id,price,status`);
    const walk = rows[0];
    if (!walk) return { error: 'Booking not found.' };
    if (walk.status === 'cancelled') return { error: 'This booking was cancelled.' };
    const amount = Number(walk.price);
    if (!(amount > 0)) return { error: 'This booking has no price to pay.' };
    return { amount, refId: walk.id, payload: {} };
  }
  if (kind === 'shop_order') {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const clean_items = items
      .map(it => ({ id: clean(it?.id), qty: Math.floor(Number(it?.qty)) }))
      .filter(it => it.id && it.qty > 0 && it.qty <= 50);
    if (!clean_items.length) return { error: 'Your cart is empty.' };
    const ids = [...new Set(clean_items.map(i => i.id))];
    const products = await adminJson(`/rest/v1/shop_products?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,name,price,img,shop_owner_id`);
    const byId = Object.fromEntries(products.map(p => [p.id, p]));
    const lines = [];
    for (const it of clean_items) {
      const p = byId[it.id];
      if (!p) return { error: 'An item in your cart is no longer for sale. Please refresh the shop.' };
      lines.push({ id: p.id, name: p.name, img: p.img, shopOwnerId: p.shop_owner_id, unitPrice: Number(p.price), qty: it.qty });
    }
    const amount = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    if (!(amount > 0)) return { error: 'Nothing to pay.' };
    // Same cart = same signature, which is what lets a second tap reuse the first prompt.
    const signature = lines.map(l => `${l.id}x${l.qty}`).sort().join(',');
    return {
      amount,
      refId: signature.slice(0, 500),
      payload: { lines, address: clean(payload?.address).slice(0, 300), contactPhone: clean(payload?.contactPhone).slice(0, 30), buyerName: caller.name || '' },
    };
  }
  return { error: 'Unknown payment type.' };
}

// ── What happens once a payment is confirmed (runs exactly once per intent) ──
async function applySuccess(intent, caller) {
  if (intent.kind === 'subscription') {
    const rows = await adminJson(`/rest/v1/users?id=eq.${intent.user_id}&select=subscription_paid_until`);
    const current = rows[0]?.subscription_paid_until ? new Date(rows[0].subscription_paid_until) : null;
    const base = current && current > new Date() ? current : new Date();
    const until = new Date(base);
    until.setMonth(until.getMonth() + 1);
    await adminFetch(`/rest/v1/users?id=eq.${intent.user_id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ subscription_paid_until: until.toISOString() }),
    });
    return { subscriptionPaidUntil: until.toISOString() };
  }
  if (intent.kind === 'shop_order') {
    const p = intent.payload || {};
    const now = new Date().toISOString();
    // Ids come from the intent, so even a repeated insert cannot create a second order.
    const rows = (p.lines || []).map((l, i) => ({
      id: `pur_${intent.id.replace(/-/g, '').slice(0, 16)}_${i}`,
      product_id: l.id, product_name: l.name, product_img: l.img, quantity: l.qty,
      unit_price: l.unitPrice, total: l.unitPrice * l.qty,
      buyer_id: intent.user_id, buyer_name: p.buyerName || caller?.name || '',
      shop_owner_id: l.shopOwnerId || null,
      purchased_at: now, status: 'pending',
      delivery_address: p.address || null,
      payment_method: 'mobile_money',
      payment_reference: intent.reference,
    }));
    if (rows.length) {
      const r = await adminFetch('/rest/v1/shop_orders', {
        method: 'POST', headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify(rows),
      });
      if (!r.ok) console.error('payments: shop order insert failed', r.status, await r.text().catch(() => ''));
    }
    return { orderIds: rows.map(r => r.id) };
  }
  return {};
}

async function lencoStatus(reference) {
  // A brand-new collection can take a moment to appear, so "not found" means "still pending".
  for (const path of [`/collections/status/${encodeURIComponent(reference)}`, `/transaction-by-reference/${encodeURIComponent(reference)}`]) {
    try {
      const r = await lencoFetch(path, {}, 12000);
      if (r.status === 404) continue;
      const d = await r.json().catch(() => ({}));
      if (!r.ok) continue;
      const raw = d?.data?.status ?? d?.status ?? '';
      return { raw: String(raw), mapped: mapStatus(raw), reason: d?.data?.reasonForFailure || d?.data?.failureReason || '' };
    } catch { /* try the next one */ }
  }
  return { raw: '', mapped: 'pending', reason: '' };
}

export default async function handler(req, res) {
  if (cors(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!lencoKey()) return res.status(503).json({ error: 'Payments are not switched on yet.' });

  const caller = await getCaller(req);
  if (!caller) return res.status(401).json({ error: 'Please log in again, then pay.' });

  const body = readBody(req);
  const action = clean(body.action);

  // ── Send a prompt ──────────────────────────────────────────────────────────
  if (action === 'create') {
    const kind = clean(body.kind);
    const operator = clean(body.operator).toLowerCase();
    const phone = normPhone(body.phone);
    if (!OPERATORS.includes(operator)) return res.status(400).json({ error: 'Choose Airtel, MTN or Zamtel.' });
    if (!/^260\d{9}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Zambian mobile number, e.g. 0971 234 567.' });

    const priced = await priceFor(kind, caller, clean(body.refId), body.payload);
    if (priced.error) return res.status(400).json({ error: priced.error });

    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const recent = await adminJson(`/rest/v1/payment_intents?user_id=eq.${caller.id}&created_at=gte.${since}&select=*&order=created_at.desc`);

    // Same thing, same number, same amount, still waiting: hand back the prompt already on the phone.
    const reuse = recent.find(i =>
      i.status === 'pending' && i.kind === kind && i.ref_id === priced.refId && i.phone === phone &&
      Number(i.amount) === Number(priced.amount) && Date.now() - new Date(i.created_at).getTime() < REUSE_MS);
    if (reuse) return res.status(200).json({ ...publicIntent(reuse), reused: true });

    if (recent.length >= RATE_MAX) {
      return res.status(429).json({ error: 'Too many payment requests. Please wait a few minutes, then try again.' });
    }

    const reference = newReference(kind);
    const insert = await adminFetch('/rest/v1/payment_intents', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: caller.id, kind, ref_id: priced.refId, amount: priced.amount, reference,
        operator, phone, payload: priced.payload,
      }),
    });
    if (!insert.ok) {
      console.error('payments: could not record intent', insert.status, await insert.text().catch(() => ''));
      return res.status(500).json({ error: 'Could not start the payment. Please try again.' });
    }
    const intent = (await insert.json())[0];

    let lencoRes, data;
    try {
      lencoRes = await lencoFetch('/collections/mobile-money', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(priced.amount), reference, phone, operator, country: 'zm', bearer: 'customer' }),
      });
      data = await lencoRes.json().catch(() => ({}));
    } catch (err) {
      // Timed out: the prompt may or may not have gone out. Keep the intent pending so the app checks
      // its status instead of sending another one.
      console.error('payments: Lenco create timed out or failed', reference, String(err?.message || err));
      return res.status(200).json({ ...publicIntent(intent), uncertain: true });
    }

    if (!lencoRes.ok) {
      await adminFetch(`/rest/v1/payment_intents?id=eq.${intent.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed', lenco_status: String(data?.message || lencoRes.status).slice(0, 200), updated_at: new Date().toISOString() }),
      });
      console.error('payments: Lenco refused', reference, lencoRes.status, data?.message);
      return res.status(400).json({ error: data?.message || 'The mobile money provider refused the request. Check the number and network.' });
    }

    const rawStatus = data?.data?.status || 'pending';
    const mapped = mapStatus(rawStatus);
    const patched = await adminFetch(`/rest/v1/payment_intents?id=eq.${intent.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ lenco_id: data?.data?.id || null, lenco_status: String(rawStatus), status: mapped === 'successful' ? 'pending' : mapped, updated_at: new Date().toISOString() }),
    });
    const saved = patched.ok ? (await patched.json())[0] : intent;
    return res.status(200).json(publicIntent(saved));
  }

  // ── Check a prompt ─────────────────────────────────────────────────────────
  if (action === 'status') {
    const intentId = clean(body.intentId);
    if (!/^[0-9a-f-]{36}$/i.test(intentId)) return res.status(400).json({ error: 'Missing payment.' });
    const rows = await adminJson(`/rest/v1/payment_intents?id=eq.${intentId}&select=*`);
    const intent = rows[0];
    if (!intent || (intent.user_id !== caller.id && caller.role !== 'admin')) return res.status(404).json({ error: 'Payment not found.' });
    if (intent.status !== 'pending') return res.status(200).json(publicIntent(intent));

    const st = await lencoStatus(intent.reference);
    let next = st.mapped;
    if (next === 'pending' && Date.now() - new Date(intent.created_at).getTime() > EXPIRE_MS) next = 'expired';
    if (next === 'pending') return res.status(200).json({ ...publicIntent(intent), lencoStatus: st.raw });

    // Only the request that moves it out of "pending" applies the result.
    const moved = await adminFetch(`/rest/v1/payment_intents?id=eq.${intent.id}&status=eq.pending`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: next, lenco_status: st.raw || next, updated_at: new Date().toISOString() }),
    });
    const movedRows = moved.ok ? await moved.json() : [];
    if (!movedRows.length) {
      const again = (await adminJson(`/rest/v1/payment_intents?id=eq.${intent.id}&select=*`))[0] || intent;
      return res.status(200).json(publicIntent(again));
    }
    let updated = movedRows[0];
    if (next === 'successful') {
      const result = await applySuccess(updated, caller);
      const r = await adminFetch(`/rest/v1/payment_intents?id=eq.${intent.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ result, updated_at: new Date().toISOString() }),
      });
      if (r.ok) updated = (await r.json())[0] || updated;
      else updated = { ...updated, result };
    }
    return res.status(200).json({ ...publicIntent(updated), reason: st.reason || undefined });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
