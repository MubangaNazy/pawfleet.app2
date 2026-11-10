// "Share with vet": a read-only, reusable link to one dog's health journal.
// POST /api/pet-health-share  { action: 'create', dogId }   Authorization: Bearer <the owner's own token>
//   Creates (or returns the existing, unrevoked) link for that dog. Only the dog's own owner can do this.
// POST /api/pet-health-share  { action: 'revoke', dogId }   Authorization: Bearer <the owner's own token>
//   Disables the current link; a new one can be created afterwards.
// POST /api/pet-health-share  { action: 'view', token }
//   No login needed — this is the public, read-only side a vet opens from the link. Returns the dog's
//   basic info and journal entries, nothing else about the owner's account.

import crypto from 'crypto';

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
const APP_URL = 'https://www.pawfleetapp.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !anon || !service) return res.status(503).json({ error: 'Not configured. Contact support.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const action = clean(body?.action);

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  // ── Public: view a shared journal by token ──────────────────────────────
  if (action === 'view') {
    const token = clean(body?.token);
    if (!token) return res.status(400).json({ error: 'Missing link.' });
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const shares = await admin(`/rest/v1/health_journal_shares?token_hash=eq.${tokenHash}&revoked_at=is.null&select=dog_id`).then(r => r.json());
      const share = Array.isArray(shares) ? shares[0] : null;
      if (!share) return res.status(404).json({ error: 'This link is invalid or has been turned off.' });

      const [dogRows, entryRows] = await Promise.all([
        admin(`/rest/v1/dogs?id=eq.${share.dog_id}&select=id,name,breed,age`).then(r => r.json()),
        admin(`/rest/v1/health_journal?dog_id=eq.${share.dog_id}&select=type,content,weight_kg,ai_response,due_date,created_at&order=created_at.desc&limit=200`).then(r => r.json()),
      ]);
      const dog = Array.isArray(dogRows) ? dogRows[0] : null;
      if (!dog) return res.status(404).json({ error: 'This pet could not be found.' });

      return res.status(200).json({ dog, entries: entryRows || [] });
    } catch (err) {
      console.error('pet-health-share (view) failed:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  // ── Owner-only: create or revoke ────────────────────────────────────────
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again, then try again.' });
  const dogId = clean(body?.dogId);
  if (!dogId) return res.status(400).json({ error: 'Which pet?' });

  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again.' });
    const ownerId = (await who.json()).id;

    const dogRows = await admin(`/rest/v1/dogs?id=eq.${dogId}&select=id,owner_id`).then(r => r.json());
    const dog = Array.isArray(dogRows) ? dogRows[0] : null;
    if (!dog || dog.owner_id !== ownerId) return res.status(403).json({ error: 'That is not your pet.' });

    if (action === 'revoke') {
      await admin(`/rest/v1/health_journal_shares?dog_id=eq.${dogId}&revoked_at=is.null`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'create') {
      const existing = await admin(`/rest/v1/health_journal_shares?dog_id=eq.${dogId}&revoked_at=is.null&select=id`).then(r => r.json());
      if (Array.isArray(existing) && existing[0]) {
        // We only ever store a hash, so a pre-existing link's raw token can't be recovered — reuse the
        // row by minting a fresh token for it instead of creating a second, orphaned active link.
        const rawToken = crypto.randomBytes(24).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await admin(`/rest/v1/health_journal_shares?id=eq.${existing[0].id}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ token_hash: tokenHash }),
        });
        return res.status(200).json({ ok: true, url: `${APP_URL}/shared/pet-health/${rawToken}` });
      }

      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const created = await admin('/rest/v1/health_journal_shares', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ dog_id: dogId, owner_id: ownerId, token_hash: tokenHash }),
      });
      if (!created.ok) {
        const err = await created.json().catch(() => ({}));
        return res.status(500).json({ error: err.message || 'Could not create the link. Please try again.' });
      }
      return res.status(200).json({ ok: true, url: `${APP_URL}/shared/pet-health/${rawToken}` });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('pet-health-share failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
