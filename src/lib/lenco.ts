// Lenco payment integration — frontend calls our own Vercel API routes
// Secret key lives server-side only in LENCO_SECRET_KEY env variable
// Public key (not needed on frontend — kept for reference only)

export interface LencoPaymentLink {
  url: string;
  reference: string;
}

export async function createPaymentLink(params: {
  amount: number;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  reference?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}): Promise<LencoPaymentLink | null> {
  try {
    const reference = params.reference || `PAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, reference }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('create-payment failed:', err);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('createPaymentLink error:', err);
    return null;
  }
}

export async function verifyPayment(reference: string): Promise<{ paid: boolean; status: string } | null> {
  try {
    const res = await fetch(`/api/verify-payment?reference=${encodeURIComponent(reference)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
