// "Forgot password", both steps in one file — merged with reset-password.js to stay under Vercel
// Hobby's 12-serverless-function cap, not because the two steps are otherwise related in logic.
//
// POST /api/password-reset  { action: 'request', email }
//   Always responds the same generic success message, whether or not that email has an account —
//   otherwise this becomes a way to check who is or isn't registered.
// POST /api/password-reset  { action: 'reset', token, password }
//   The token is a one-time, 30-minute-lived secret from the emailed link; we only ever store its hash.

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
  const action = clean(body?.action);

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  if (action === 'request') {
    const email = clean(body?.email).toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

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
        console.error('password-reset (request): could not store token:', await created.text().catch(() => ''));
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
      console.error('password-reset (request) failed:', err);
      return res.status(200).json(GENERIC_OK);
    }
  }

  if (action === 'reset') {
    const token = clean(body?.token);
    const password = clean(body?.password);
    if (!token) return res.status(400).json({ error: 'This reset link is invalid. Please request a new one.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const rows = await admin(`/rest/v1/password_reset_tokens?token_hash=eq.${tokenHash}&select=id,user_id,expires_at,used_at`).then(r => r.json());
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return res.status(400).json({ error: 'This reset link is invalid or has already been used. Please request a new one.' });
      if (row.used_at) return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
      if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

      const updated = await admin(`/auth/v1/admin/users/${row.user_id}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      if (!updated.ok) {
        const err = await updated.json().catch(() => ({}));
        return res.status(500).json({ error: err.msg || err.message || 'Could not reset the password. Please try again.' });
      }

      // Single-use: mark it spent even though we're about to be the only ones who could reuse it.
      await admin(`/rest/v1/password_reset_tokens?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      }).catch(() => {});

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('password-reset (reset) failed:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
