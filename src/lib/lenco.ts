// Lenco mobile money collection — calls our Vercel serverless proxy
// Secret key stays server-side; browser only calls /api/create-payment

export interface LencoCollectionResult {
  id: string;
  reference: string;
  status: string;
  message: string;
}

export async function initiateMobileMoneyPayment(params: {
  amount: number;
  phone: string;
  operator: 'airtel' | 'mtn' | 'zamtel';
  reference?: string;
}): Promise<LencoCollectionResult | null> {
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
    console.warn('initiateMobileMoneyPayment error:', err);
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
