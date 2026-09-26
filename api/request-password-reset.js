// "Forgot password" step 1: POST /api/request-password-reset  { email }
// Always responds the same generic success message, whether or not that email has an account —
// otherwise this becomes a way to check who is or isn't registered.

import crypto from 'crypto';

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
const APP_URL = 'https://www.pawfleetapp.com';
const GENERIC_OK = { ok: true, message: "If an account exists for that email, we've sent a link to reset the password." };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !service) return res.status(503).json({ error: 'Not configured. Contact support.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = clean(body?.email).toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  try {
    const rows = await admin(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,name`).then(r => r.json());
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return res.status(200).json(GENERIC_OK); // don't reveal whether the account exists

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Only one live reset link per person at a time.
    await admin(`/rest/v1/password_reset_tokens?user_id=eq.${user.id}`, { method: 'DELETE' }).catch(() => {});
    const created = await admin('/rest/v1/password_reset_tokens', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt }),
    });
    if (!created.ok) {
      console.error('request-password-reset: could not store token:', await created.text().catch(() => ''));
      return res.status(200).json(GENERIC_OK);
    }

    const resetLink = `${APP_URL}/reset-password?token=${rawToken}`;
    fetch(`https://${req.headers.host}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, template: 'password_reset', data: { name: user.name, resetLink } }),
    }).catch(() => {});

    return res.status(200).json(GENERIC_OK);
  } catch (err) {
    console.error('request-password-reset failed:', err);
    return res.status(200).json(GENERIC_OK);
  }
}
