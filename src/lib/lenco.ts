// Lenco payment API integration
// Base URL: https://api.lenco.co/access/v2
// Public key: pub-d48e90d7c112c6427d871b92c771ef93ac73aaf22e3ca34a

const LENCO_BASE = 'https://api.lenco.co/access/v2';
const LENCO_KEY  = import.meta.env.VITE_LENCO_KEY || 'pub-d48e90d7c112c6427d871b92c771ef93ac73aaf22e3ca34a';

export interface LencoPaymentLink {
  url: string;
  reference: string;
}

export async function createPaymentLink(params: {
  amount: number;          // in ZMW (Zambian Kwacha)
  currency?: string;       // default 'ZMW'
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  reference?: string;      // unique order ID
  redirectUrl?: string;
  metadata?: Record<string, string>;
}): Promise<LencoPaymentLink | null> {
  try {
    const reference = params.reference || `PAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const res = await fetch(`${LENCO_BASE}/payment-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LENCO_KEY}`,
      },
      body: JSON.stringify({
        amount: params.amount * 100, // convert to lowest denomination (ngwe/kobo)
        currency: params.currency || 'ZMW',
        description: params.description,
        customer: {
          name: params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
        },
        reference,
        redirect_url: params.redirectUrl || window.location.origin,
        metadata: params.metadata || {},
      }),
    });
    if (!res.ok) {
      console.warn('Lenco payment link failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      url: data?.data?.link || data?.link || data?.url || '',
      reference: data?.data?.reference || reference,
    };
  } catch (err) {
    console.warn('Lenco createPaymentLink error:', err);
    return null;
  }
}

export async function verifyPayment(reference: string): Promise<{ paid: boolean; status: string } | null> {
  try {
    const res = await fetch(`${LENCO_BASE}/transactions/${reference}`, {
      headers: { 'Authorization': `Bearer ${LENCO_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const status = data?.data?.status || data?.status || '';
    return { paid: status === 'successful' || status === 'completed', status };
  } catch {
    return null;
  }
}
