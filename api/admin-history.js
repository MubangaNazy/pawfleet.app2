// Admin-only read of what's been sent: in-app/push notifications, or emails.
// GET /api/admin-history?kind=notifications|emails&limit=50   Authorization: Bearer <admin's own token>

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !anon || !service) return res.status(503).json({ error: 'Not configured. Contact support.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again.' });

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then(r => r.json());

  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again.' });
    const callerId = (await who.json()).id;
    const callerRow = await admin(`/rest/v1/users?id=eq.${callerId}&select=role`);
    if (callerRow?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Only an admin can view this.' });

    const kind = clean(req.query?.kind) === 'emails' ? 'emails' : 'notifications';
    const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 200);

    if (kind === 'emails') {
      const rows = await admin(`/rest/v1/email_log?select=*&order=created_at.desc&limit=${limit}`);
      return res.status(200).json({ rows: Array.isArray(rows) ? rows : [] });
    }

    const [rows, users] = await Promise.all([
      admin(`/rest/v1/notifications?select=id,user_id,type,title,body,read,created_at&order=created_at.desc&limit=${limit}`),
      admin('/rest/v1/users?select=id,name,email,role'),
    ]);
    const usersById = new Map((Array.isArray(users) ? users : []).map(u => [u.id, u]));
    const enriched = (Array.isArray(rows) ? rows : []).map(r => ({ ...r, recipient: usersById.get(r.user_id) || null }));
    return res.status(200).json({ rows: enriched });
  } catch (err) {
    console.error('admin-history failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
