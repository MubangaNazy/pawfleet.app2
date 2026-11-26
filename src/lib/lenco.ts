// Lenco mobile money, through PawFleet's own server (api/payments.js). The secret key never leaves the
// server, the server decides the amount, and the server records the outcome exactly once.

import { apiPost } from './api';

export type PaymentKind = 'shop_order' | 'walk' | 'subscription';
export type Operator = 'airtel' | 'mtn' | 'zamtel';
export type IntentStatus = 'pending' | 'successful' | 'failed' | 'expired';

export interface PaymentIntent {
  intentId: string;
  reference: string;
  status: IntentStatus;
  amount: number;
  operator: Operator;
  result: Record<string, unknown>;
  reused?: boolean;
  uncertain?: boolean;
  reason?: string;
}

export type PaymentResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(body: unknown, timeoutMs: number): Promise<PaymentResult<T>> {
  try {
    const res = await apiPost('/api/payments', body, { timeoutMs });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || 'Payment service is not responding. Please try again.' };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection.' };
  }
}

/** Sends one prompt to the phone (or returns the one already sent for the same thing). */
export function startPayment(params: {
  kind: PaymentKind;
  refId?: string;
  operator: Operator;
  phone: string;
  payload?: Record<string, unknown>;
}): Promise<PaymentResult<PaymentIntent>> {
  return call<PaymentIntent>({ action: 'create', ...params }, 35000);
}

/** Asks the server how a prompt went. Never sends a new prompt. */
export function paymentStatus(intentId: string): Promise<PaymentResult<PaymentIntent>> {
  return call<PaymentIntent>({ action: 'status', intentId }, 25000);
}
