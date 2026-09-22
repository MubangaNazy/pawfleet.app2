// Transactional emails via Resend.
// POST /api/send-email  { to, template, data }
// Never blocks anything else: the app fires this and moves on regardless of the result.

const FROM = 'PawFleet <notifications@pawfleetapp2.vercel.app>';
const SUPPORT_EMAIL = 'pawfleetapp@gmail.com';

function shell(bodyHtml, { badge = '🐾', title, subtitle = 'PawFleet · Lusaka, Zambia' } = {}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#1B4332,#2B8A50);padding:32px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">${badge}</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">${title}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">${subtitle}</p>
    </div>
    <div style="padding:24px">${bodyHtml}</div>
    <div style="padding:16px 24px;border-top:1px solid #F3F4F6;text-align:center">
      <p style="margin:0;font-size:12px;color:#9CA3AF">© ${new Date().getFullYear()} PawFleet · Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#2B8A50">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

const P = (t) => `<p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.5">${t}</p>`;
const BOX = (bg, border, text) => `<div style="margin-top:8px;padding:16px;background:${bg};border-radius:12px;border-left:4px solid ${border};font-size:13px;color:#374151;line-height:1.5">${text}</div>`;
const CTA = (href, label) => `<a href="${href}" style="display:inline-block;margin-top:20px;padding:13px 28px;background:linear-gradient(135deg,#1B4332,#2B8A50);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">${label}</a>`;
const esc = (s) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const APP_URL = 'https://www.pawfleetapp.com';

const TEMPLATES = {
  walker_approved: (d) => ({
    subject: "You're approved! Start walking on PawFleet 🎉",
    html: shell(
      P(`Hi <strong>${esc(d.name)}</strong>, great news — your walker application has been approved.`) +
      BOX('#EBF5EF', '#2B8A50', 'You can now go online, appear on the map, and accept walks, grooming and training jobs near you.') +
      `<div style="text-align:center">${CTA(APP_URL, 'Open PawFleet')}</div>`,
      { badge: '🎉', title: 'Application Approved' },
    ),
  }),
  walker_rejected: (d) => ({
    subject: 'Your PawFleet walker application',
    html: shell(
      P(`Hi <strong>${esc(d.name)}</strong>, thank you for applying to be a walker on PawFleet.`) +
      BOX('#FEF2F2', '#DC2626', "We're unable to approve your application at this time. If you think this is a mistake, or you'd like more information, reply to this email and we'll help.") ,
      { badge: '📋', title: 'Application Update' },
    ),
  }),
  welcome_owner: (d) => ({
    subject: 'Welcome to PawFleet 🐾',
    html: shell(
      P(`Hi <strong>${esc(d.name)}</strong>, welcome to PawFleet — your account is ready to go.`) +
      BOX('#EBF5EF', '#2B8A50', 'Add your dog, then book a walk, grooming or vet visit from trusted people near you. You can track everything live on the map.') +
      `<div style="text-align:center">${CTA(APP_URL, 'Open PawFleet')}</div>`,
      { badge: '🐾', title: 'Welcome to PawFleet' },
    ),
  }),
  welcome_walker_pending: (d) => ({
    subject: 'We got your walker application 🦮',
    html: shell(
      P(`Hi <strong>${esc(d.name)}</strong>, thanks for applying to be a walker on PawFleet.`) +
      BOX('#FFFBEB', '#F59E0B', "An admin is reviewing your photo and NRC now — this usually takes 24 to 48 hours. You'll get another email the moment you're approved. You can log in any time to check your status.") ,
      { badge: '🦮', title: 'Application Received' },
    ),
  }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Resend not configured' });

  const { to, template, data } = req.body || {};
  const build = TEMPLATES[template];
  if (!to || !build) return res.status(400).json({ error: 'to and a valid template are required' });

  const { subject, html } = build(data || {});

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    const d = await r.json();
    if (!r.ok) { console.error('send-email (Resend):', d); return res.status(r.status).json({ error: d.message || 'Resend error' }); }
    return res.status(200).json({ ok: true, id: d.id });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
