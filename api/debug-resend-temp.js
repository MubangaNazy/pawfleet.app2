// Temporary, read-only: confirm the Resend key works and which domain is verified.
// Deleted right after use — never left in a shipped build.
export default async function handler(req, res) {
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'RESEND_API_KEY missing' });
  try {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${KEY}` } });
    const d = await r.json();
    const domains = (d.data || []).map(x => ({ name: x.name, status: x.status, region: x.region }));
    return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, domains, raw: r.ok ? undefined : d });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
