// Verify a Lenco mobile money collection by reference
// GET /api/verify-payment?reference=PAW-xxx

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = process.env.LENCO_SECRET_KEY || '';
  const SECRET_KEY = raw.split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'LENCO_SECRET_KEY not configured' });
  }

  const { reference } = req.query;
  if (!reference) {
    return res.status(400).json({ error: 'reference is required' });
  }

  try {
    const lencoRes = await fetch(
      `https://api.lenco.co/access/v2/transaction-by-reference/${encodeURIComponent(reference)}`,
      {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    const data = await lencoRes.json();
    console.log('verify-payment response:', lencoRes.status, JSON.stringify(data));

    if (!lencoRes.ok) {
      return res.status(lencoRes.status).json({ error: data?.message || 'Verification failed' });
    }

    const status = data?.data?.status || data?.status || '';
    const paid = ['successful', 'completed', 'success', 'paid'].includes(
      String(status).toLowerCase()
    );

    return res.status(200).json({ paid, status });
  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}