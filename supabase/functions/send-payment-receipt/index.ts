import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import nodemailer from 'npm:nodemailer@6.9.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { to, ownerName, walkerName, dogName, amount, duration, date } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Deno.env.get('GMAIL_USER'),
        pass: Deno.env.get('GMAIL_APP_PASSWORD'),
      },
    });

    const formattedDate = new Date(date).toLocaleDateString('en-ZM', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(27,67,50,0.10)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1B4332,#2B8A50);padding:32px 32px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🐾</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">PawFleet</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Walk Receipt</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#1B4332;font-size:15px;font-weight:600">Hi ${ownerName},</p>
      <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6">
        Your walker has confirmed receipt of payment for ${dogName}'s walk. Here's your receipt.
      </p>

      <!-- Receipt box -->
      <div style="background:#F4F9F6;border-radius:14px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:7px 0;color:#666;font-size:13px">Dog</td>
            <td style="padding:7px 0;color:#1B4332;font-size:13px;font-weight:700;text-align:right">${dogName}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#666;font-size:13px">Walker</td>
            <td style="padding:7px 0;color:#1B4332;font-size:13px;font-weight:700;text-align:right">${walkerName}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#666;font-size:13px">Date</td>
            <td style="padding:7px 0;color:#1B4332;font-size:13px;font-weight:700;text-align:right">${formattedDate}</td>
          </tr>
          ${duration ? `<tr>
            <td style="padding:7px 0;color:#666;font-size:13px">Duration</td>
            <td style="padding:7px 0;color:#1B4332;font-size:13px;font-weight:700;text-align:right">${duration} min</td>
          </tr>` : ''}
          <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #D1FAE5;margin:0"></td></tr>
          <tr>
            <td style="padding:7px 0;color:#1B4332;font-size:15px;font-weight:800">Total Paid</td>
            <td style="padding:7px 0;color:#2B8A50;font-size:18px;font-weight:900;text-align:right">K${amount}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 8px;color:#888;font-size:12px;text-align:center">
        Thank you for using PawFleet 🐾
      </p>
      <p style="margin:0;color:#bbb;font-size:11px;text-align:center">
        Questions? Email us at <a href="mailto:pawfleetapp@gmail.com" style="color:#2B8A50">pawfleetapp@gmail.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F4F9F6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#aaa;font-size:11px">© 2026 PawFleet · Lusaka, Zambia</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `PawFleet <${Deno.env.get('GMAIL_USER')}>`,
      to,
      subject: `Receipt: ${dogName}'s Walk — K${amount}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-payment-receipt error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
