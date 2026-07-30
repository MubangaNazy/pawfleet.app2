import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { reference } = req.query;
  if (!reference) return res.status(400).json({ error: 'Missing reference' });

  const secretKey = process.env.LENCO_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Payment not configured' });

  try {
    const lencoRes = await fetch(
      `https://api.lenco.co/access/v2/transaction-by-reference/${encodeURIComponent(String(reference))}`,
      {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      }
    );

    const data = await lencoRes.json();
    if (!lencoRes.ok) return res.status(lencoRes.status).json(data);

    const status = data?.data?.status ?? 'unknown';
    return res.status(200).json({ paid: status === 'successful', status });
  } catch (err) {
    console.error('verify-payment error:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
