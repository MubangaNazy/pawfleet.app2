// Send payment receipt email via Resend
// POST /api/send-receipt  { to, name, amount, description, reference, operator }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, name, amount, description, reference, operator } = req.body || {};
  if (!to || !amount) return res.status(400).json({ error: 'to and amount required' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Resend not configured' });

  const operatorLabel = { airtel: 'Airtel Money', mtn: 'MTN MoMo', zamtel: 'Zamtel Kwacha' }[operator] || 'Mobile Money';
  const date = new Date().toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

    <div style="background:linear-gradient(135deg,#1B4332,#2B8A50);padding:32px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🐾</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Payment Confirmed</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">PawFleet · Lusaka, Zambia</p>
    </div>

    <div style="padding:24px">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">Hi <strong>${name || 'there'}</strong>, your payment was received successfully.</p>

      <div style="background:#EBF5EF;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <p style="color:#6B7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Amount Paid</p>
        <p style="color:#1B4332;font-size:36px;font-weight:800;margin:0">K${Number(amount).toLocaleString()}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;color:#6B7280">Description</td>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600">${description || 'PawFleet Order'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;color:#6B7280">Payment Method</td>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600">${operatorLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;color:#6B7280">Reference</td>
          <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;text-align:right;font-family:monospace;font-size:12px">${reference || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280">Date</td>
          <td style="padding:8px 0;text-align:right;font-weight:600">${date}</td>
        </tr>
      </table>

      <div style="margin-top:24px;padding:16px;background:#FEF9C3;border-radius:12px;border-left:4px solid #FBBF24">
        <p style="margin:0;font-size:13px;color:#92400E">Keep this email as your receipt. If you have any questions, contact us at <a href="mailto:mubangachanda004@gmail.com" style="color:#2B8A50">mubangachanda004@gmail.com</a>.</p>
      </div>
    </div>

    <div style="padding:16px 24px;border-top:1px solid #F3F4F6;text-align:center">
      <p style="margin:0;font-size:12px;color:#9CA3AF">© 2026 PawFleet · Lusaka, Zambia</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PawFleet <receipts@pawfleetapp2.vercel.app>',
        to: [to],
        subject: `Payment Confirmed — K${Number(amount).toLocaleString()} received`,
        html,
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: d.message || 'Resend error' });
    return res.status(200).json({ ok: true, id: d.id });
  } catch (err) {
    console.error('send-receipt error:', err);
    return res.status(500).json({ error: err.message });
  }
}
