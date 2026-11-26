// Transactional emails sent at the app's request.
// POST /api/send-email  Authorization: Bearer <login token>   { to, template, data }
//
// This used to send any template to any address with no login, which let anyone send convincing
// PawFleet-branded emails (fake reset links, fake receipts). Now:
//   - admins may send walker_approved / walker_rejected to anyone
//   - a logged-in person may send welcome / payment_receipt to their own email only
//   - a brand-new account (row created in the last 15 minutes, no welcome sent yet) may get its welcome
//     email without a login, because with email confirmation on there is no session right after sign-up
// Password reset and admin-created accounts send from the server directly (api/_lib/email.js).

import { sendTemplate } from './_lib/email.js';
import { cors, readBody, getCaller, adminJson, clean } from './_lib/server.js';

const ADMIN_TEMPLATES = ['walker_approved', 'walker_rejected'];
const SELF_TEMPLATES = ['welcome_owner', 'welcome_walker_pending', 'payment_receipt'];
const WELCOME = ['welcome_owner', 'welcome_walker_pending'];

export default async function handler(req, res) {
  if (cors(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to: rawTo, template, data } = readBody(req);
  const to = clean(rawTo).toLowerCase();
  if (!to || !template) return res.status(400).json({ error: 'to and template are required' });

  const caller = await getCaller(req);
  let allowed = false;

  if (caller?.role === 'admin' && ADMIN_TEMPLATES.includes(template)) allowed = true;
  else if (caller && SELF_TEMPLATES.includes(template) && caller.email === to) allowed = true;
  else if (!caller && WELCOME.includes(template)) {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const fresh = await adminJson(`/rest/v1/users?email=ilike.${encodeURIComponent(to.replace(/[%_]/g, '\\$&'))}&created_at=gte.${since}&select=id`);
    const already = await adminJson(`/rest/v1/email_log?to_email=eq.${encodeURIComponent(to)}&template=in.(welcome_owner,welcome_walker_pending)&select=id&limit=1`);
    allowed = fresh.length > 0 && already.length === 0;
  }

  if (!allowed) return res.status(caller ? 403 : 401).json({ error: 'Not allowed to send this email.' });

  const result = await sendTemplate(to, template, data || {});
  if (!result.ok) return res.status(result.status || 500).json({ error: result.error });
  return res.status(200).json({ ok: true, id: result.id });
}
