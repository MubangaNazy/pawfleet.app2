import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, operator, reference } = req.body ?? {};
  if (!amount || !phone || !operator || !reference) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const secretKey = process.env.LENCO_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Payment not configured' });

  // Normalize phone: strip leading 0 and prepend Zambia country code 260
  const normalizedPhone = String(phone).replace(/^0/, '260');

  try {
    const lencoRes = await fetch('https://api.lenco.co/access/v2/collections/mobile-money', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: normalizedPhone,
        operator,
        reference,
        country: 'zm',
      }),
    });

    const data = await lencoRes.json();
    if (!lencoRes.ok) {
      console.error('Lenco error:', data);
      return res.status(lencoRes.status).json(data);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'Payment request failed' });
  }
}
