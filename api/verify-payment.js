// Vercel serverless function — verify a Lenco payment by reference
// Frontend calls GET /api/verify-payment?reference=PAW-xxx

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SECRET_KEY = process.env.LENCO_SECRET_KEY;
  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  const { reference } = req.query;
  if (!reference) {
    return res.status(400).json({ error: 'reference is required' });
  }

  try {
    const lencoRes = await fetch(`https://api.lenco.co/access/v2/transactions/${reference}`, {
      headers: { 'Authorization': `Bearer ${SECRET_KEY}` },
    });

    const data = await lencoRes.json();
    if (!lencoRes.ok) {
      return res.status(lencoRes.status).json({ error: data?.message || 'Verification failed' });
    }

    const status = data?.data?.status || data?.status || '';
    return res.status(200).json({
      paid: status === 'successful' || status === 'completed',
      status,
    });
  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
