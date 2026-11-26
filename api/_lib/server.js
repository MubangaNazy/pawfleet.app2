// Shared helpers for the serverless functions. In api/_lib so Vercel never turns it into its own route.

export const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();

export function env() {
  return {
    url: clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, ''),
    anon: clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    service: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

// The Android app runs from https://localhost (Capacitor), the website from pawfleetapp.com.
const ALLOWED_ORIGINS = [
  'https://www.pawfleetapp.com', 'https://pawfleetapp.com',
  'https://localhost', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173',
];

/** Sets CORS headers. Returns true when the request was a preflight that has now been answered. */
export function cors(req, res, methods = 'GET, POST, OPTIONS') {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

export function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  return body || {};
}

/** PostgREST / auth admin call with the service role key. */
export function adminFetch(path, opts = {}) {
  const { url, service } = env();
  return fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function adminJson(path) {
  const r = await adminFetch(path);
  if (!r.ok) return [];
  return r.json();
}

/** Who is calling, from their own login token. Never from the request body. Returns null if not logged in. */
export async function getCaller(req) {
  const { url, anon } = env();
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !url || !anon) return null;
  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return null;
    const u = await who.json();
    if (!u?.id) return null;
    const rows = await adminJson(`/rest/v1/users?id=eq.${u.id}&select=id,name,email,role,phone`);
    const row = rows[0] || {};
    return { id: u.id, email: String(u.email || row.email || '').toLowerCase(), name: row.name || '', role: row.role || '', phone: row.phone || '' };
  } catch {
    return null;
  }
}
