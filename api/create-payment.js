// Vercel serverless function — secret key stays server-side only
// Frontend calls POST /api/create-payment

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SECRET_KEY = process.env.LENCO_SECRET_KEY;
  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    const { amount, description, customerName, customerPhone, customerEmail, reference, redirectUrl, metadata } = req.body;

    const lencoRes = await fetch('https://api.lenco.co/access/v2/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // convert to lowest denomination
        currency: 'ZMW',
        description,
        customer: {
          name: customerName,
          phone: customerPhone || undefined,
          email: customerEmail || undefined,
        },
        reference: reference || `PAW-${Date.now()}`,
        redirect_url: redirectUrl || 'https://pawfleetapp2.vercel.app',
        metadata: metadata || {},
      }),
    });

    const data = await lencoRes.json();

    if (!lencoRes.ok) {
      console.error('Lenco error:', data);
      return res.status(lencoRes.status).json({ error: data?.message || 'Payment failed' });
    }

    // Return only what the frontend needs
    return res.status(200).json({
      url: data?.data?.link || data?.link || data?.url || '',
      reference: data?.data?.reference || reference,
    });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
