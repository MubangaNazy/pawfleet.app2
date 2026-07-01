// Lenco mobile money collection — pushes payment prompt to customer's phone
// POST /api/create-payment   { amount, phone, operator, reference }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = process.env.LENCO_SECRET_KEY || '';
  const SECRET_KEY = raw.split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
  if (!SECRET_KEY) {
    return res.status(500).json({ error: 'LENCO_SECRET_KEY not configured' });
  }

  const { amount, phone, operator, reference, country } = req.body;

  if (!amount || !phone || !operator || !reference) {
    return res.status(400).json({ error: 'amount, phone, operator and reference are required' });
  }

  // Normalise phone: ensure it has Zambia country code 260 (no +)
  const normPhone = phone.replace(/\D/g, '').replace(/^0/, '260').replace(/^\+/, '');

  const body = {
    amount: Number(amount),           // Lenco expects ZMW (major unit)
    reference,
    phone: normPhone,
    operator,                         // airtel | mtn | zamtel
    country: country || 'zm',
    bearer: 'customer',               // customer pays any fees
  };

  console.log('Lenco collections request:', JSON.stringify(body));

  try {
    const lencoRes = await fetch('https://api.lenco.co/access/v2/collections/mobile-money', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await lencoRes.json();
    console.log('Lenco response:', lencoRes.status, JSON.stringify(data));

    if (!lencoRes.ok) {
      return res.status(lencoRes.status).json({
        error: data?.message || 'Lenco request failed',
        details: data,
      });
    }

    return res.status(200).json({
      id: data?.data?.id || '',
      reference: data?.data?.reference || reference,
      status: data?.data?.status || 'pending',
      message: data?.message || 'Payment prompt sent to your phone',
    });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}