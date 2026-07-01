import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, X, CreditCard, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { User } from '../../types';
import { differenceInDays, parseISO, addDays } from 'date-fns';

// ── Pricing ────────────────────────────────────────────────
export const SUBSCRIPTION_PRICE: Record<string, number> = {
  walker:    100,
  shopowner: 250,
  vet:       350,
};

const TRIAL_DAYS: Record<string, number> = {
  walker:    30,
  shopowner: 30,
  vet:       60,
};

// ── Helpers ───────────────────────────────────────────────
export type SubStatus = 'trial' | 'active' | 'expiring' | 'expired' | 'grace';

export function getSubscriptionStatus(user: User): {
  status: SubStatus;
  daysLeft: number;
  expiryDate: Date | null;
} {
  const now = new Date();

  // Check paid subscription first
  if (user.subscriptionPaidUntil) {
    const until  = parseISO(user.subscriptionPaidUntil);
    const daysLeft = differenceInDays(until, now);
    if (daysLeft > 7)  return { status: 'active',   daysLeft, expiryDate: until };
    if (daysLeft >= 0) return { status: 'expiring',  daysLeft, expiryDate: until };
    if (daysLeft >= -3) return { status: 'grace',   daysLeft, expiryDate: until };
    return { status: 'expired', daysLeft, expiryDate: until };
  }

  // Fall back to trial
  const trialDays  = TRIAL_DAYS[user.role] ?? 30;
  const trialEnd   = user.trialEndsAt
    ? parseISO(user.trialEndsAt)
    : addDays(parseISO(user.createdAt), trialDays);

  const daysLeft = differenceInDays(trialEnd, now);
  if (daysLeft >= 0) return { status: 'trial',   daysLeft, expiryDate: trialEnd };
  return             { status: 'expired', daysLeft: 0, expiryDate: trialEnd };
}

export function isSubscriptionBlocking(user: User): boolean {
  const { status } = getSubscriptionStatus(user);
  return status === 'expired';
}

// ── Payment Modal ─────────────────────────────────────────
function PayModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { activateSubscription } = useApp();
  const price   = SUBSCRIPTION_PRICE[user.role] ?? 100;
  const [phone, setPhone]   = useState('');
  const [paying, setPaying] = useState(false);
  const [done,   setDone]   = useState(false);

  const handlePay = async () => {
    if (!phone.trim()) return;
    setPaying(true);
    // In production: call Lenco collection API here
    // For now: simulate success + admin confirms manually
    await new Promise(r => setTimeout(r, 1500));
    // Optimistically extend by 30 days so UX feels instant
    // Admin will confirm the real payment in their dashboard
    activateSubscription(user.id, 1);
    setPaying(false);
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-extrabold text-ink mb-2">Payment Sent!</h3>
        <p className="text-sm text-ink-muted mb-1">Send <span className="font-bold text-ink">K{price}</span> to:</p>
        <p className="text-lg font-bold text-primary mb-1">0977 000 000</p>
        <p className="text-xs text-ink-muted mb-5">Admin will confirm within 24 hours and activate your account.</p>
        <button type="button" onClick={onClose}
          className="w-full py-3 rounded-2xl text-white font-bold"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
          Got it
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-border">
          <h2 className="font-bold text-ink">Pay Subscription</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Monthly Subscription</p>
            <p className="text-4xl font-extrabold text-white">K{price}</p>
            <p className="text-white/70 text-xs mt-1 capitalize">{user.role} plan · 30 days access</p>
          </div>

          {/* Instructions */}
          <div className="bg-surface-secondary rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">How to pay</p>
            {[
              { icon: '📱', step: '1', text: 'Open your Airtel Money or MTN app' },
              { icon: '💸', step: '2', text: `Send K${price} to 0977 000 000 (PawFleet)` },
              { icon: '✏️', step: '3', text: 'Enter your phone number below and tap Confirm' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{s.icon}</span>
                <p className="text-sm text-ink">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Phone input */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1.5">
              Your mobile money number
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0977 123 456"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              This confirms you have sent the payment. Admin will verify and activate your account.
            </p>
          </div>

          <button type="button" onClick={handlePay} disabled={!phone.trim() || paying}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            {paying
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Processing…</>
              : <><CreditCard className="w-4 h-4" /> I've Sent the Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Banner ───────────────────────────────────────────
interface SubscriptionBannerProps {
  /** If true, show nothing when subscription is active/trial */
  onlyWhenUrgent?: boolean;
}

export default function SubscriptionBanner({ onlyWhenUrgent = false }: SubscriptionBannerProps) {
  const { currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!currentUser) return null;
  if (!['walker', 'shopowner', 'vet'].includes(currentUser.role)) return null;

  const { status, daysLeft } = getSubscriptionStatus(currentUser);
  const price = SUBSCRIPTION_PRICE[currentUser.role] ?? 100;

  // Don't show if active and caller only wants urgent notices
  if (onlyWhenUrgent && status === 'active') return null;
  if (dismissed && (status === 'trial' || status === 'active')) return null;

  const config: Record<SubStatus, {
    bg: string; border: string; icon: React.ReactNode;
    title: string; subtitle: string; btn: string; btnColor: string;
  }> = {
    trial: {
      bg: '#F0FDFA', border: '#A5F3FC',
      icon: <Clock className="w-4 h-4 text-teal-600" />,
      title: `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
      subtitle: `After your trial ends, subscribe for K${price}/month to keep your account active.`,
      btn: 'Subscribe Now', btnColor: 'linear-gradient(135deg,#0F766E,#0891B2)',
    },
    active: {
      bg: '#F0FDF4', border: '#86EFAC',
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
      title: `Subscription active — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
      subtitle: `Your account is active. Renew before it expires to stay live.`,
      btn: 'Renew Early', btnColor: '#2B8A50',
    },
    expiring: {
      bg: '#FFFBEB', border: '#FDE68A',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      title: `Subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      subtitle: `Pay K${price} now to avoid losing access to PawFleet.`,
      btn: 'Renew — K' + price, btnColor: 'linear-gradient(135deg,#D97706,#B45309)',
    },
    grace: {
      bg: '#FEF2F2', border: '#FECACA',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      title: 'Subscription expired — grace period',
      subtitle: `Pay K${price} now. Your account will be suspended in ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}.`,
      btn: 'Pay Now — K' + price, btnColor: 'linear-gradient(135deg,#DC2626,#991B1B)',
    },
    expired: {
      bg: '#FEF2F2', border: '#FECACA',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      title: 'Subscription expired — account restricted',
      subtitle: `Pay K${price}/month to restore full access.`,
      btn: 'Pay Now — K' + price, btnColor: 'linear-gradient(135deg,#DC2626,#991B1B)',
    },
  };

  const c = config[status];

  return (
    <>
      <div className="mx-4 mb-4 rounded-2xl border p-4 flex gap-3"
        style={{ background: c.bg, borderColor: c.border }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,0,0,0.06)' }}>
          {c.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink">{c.title}</p>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{c.subtitle}</p>
          <button type="button" onClick={() => setShowModal(true)}
            className="mt-2.5 px-4 py-2 rounded-xl text-white text-xs font-bold"
            style={{ background: c.btn }}>
            {c.btn}
          </button>
        </div>
        {(status === 'trial' || status === 'active') && (
          <button type="button" onClick={() => setDismissed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5 text-ink-muted" />
          </button>
        )}
      </div>

      {showModal && <PayModal user={currentUser} onClose={() => setShowModal(false)} />}
    </>
  );
}
