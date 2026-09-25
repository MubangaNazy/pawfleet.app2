// Admin creates a real login for someone else: a walker, a vet clinic, or a shop.
// POST /api/admin-create-account   Authorization: Bearer <the admin's own login token>
// body: { name, phone, email, password, role: 'walker'|'vet'|'shopowner', businessName?, businessAddress?, walkerStatus? }
//
// The service role key can create logins for anyone, so this only ever runs on the server, gated on the
// caller actually being an admin themselves — never trust a role sent in the request body for that check.

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
const ALLOWED_ROLES = ['walker', 'vet', 'shopowner'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !anon || !service) return res.status(503).json({ error: 'Not configured. Contact support.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again, then try adding the account.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const name = clean(body?.name);
  const phone = clean(body?.phone) || null;
  const email = clean(body?.email).toLowerCase();
  const password = clean(body?.password);
  const role = clean(body?.role);
  const businessName = clean(body?.businessName) || null;
  const businessAddress = clean(body?.businessAddress) || null;
  const walkerStatus = role === 'walker' ? (clean(body?.walkerStatus) || 'active') : null;

  if (!name || !email || !ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Name, email and a valid role are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  try {
    // Who is asking? Must be a real, currently-admin account — never trust anything the client claims.
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again.' });
    const callerId = (await who.json()).id;
    const callerRow = await admin(`/rest/v1/users?id=eq.${callerId}&select=role`).then(r => r.json());
    if (callerRow?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Only an admin can add accounts.' });

    // Create the real login.
    const created = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, phone, role } }),
    });
    const createdJson = await created.json();
    if (!created.ok) {
      const msg = /already.*registered|already exists/i.test(createdJson.msg || createdJson.message || '')
        ? 'Someone already has an account with that email.'
        : (createdJson.msg || createdJson.message || 'Could not create the login.');
      return res.status(created.status).json({ error: msg });
    }
    const newId = createdJson.id;

    // Create the profile row that the rest of the app actually reads.
    const profile = await admin('/rest/v1/users', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: newId, name, phone, email, password: '', role,
        business_name: businessName, business_address: businessAddress,
        walker_status: walkerStatus,
      }),
    });
    if (!profile.ok) {
      const err = await profile.json().catch(() => ({}));
      // The login exists but the profile failed — remove the orphaned login rather than leave a ghost account.
      await admin(`/auth/v1/admin/users/${newId}`, { method: 'DELETE' }).catch(() => {});
      return res.status(500).json({ error: err.message || 'Could not finish creating the account. Nothing was saved — please try again.' });
    }

    if (role === 'walker') {
      await admin('/rest/v1/walker_stats', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ walker_id: newId }) })
        .catch(() => {});
    }

    // Best-effort welcome email with their login details. Never blocks the response.
    const roleLabel = role === 'vet' ? 'veterinarian' : role === 'shopowner' ? 'shop owner' : 'walker';
    fetch(`https://${req.headers.host}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, template: 'account_created', data: { name, email, password, roleLabel } }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, id: newId });
  } catch (err) {
    console.error('admin-create-account failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
