import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Clock, X, Smartphone, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { User } from '../../types';
import { differenceInDays, parseISO, addDays, addMonths, format } from 'date-fns';
import { initiateMobileMoneyPayment, verifyPayment } from '../../lib/lenco';

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

  if (user.subscriptionPaidUntil) {
    const until    = parseISO(user.subscriptionPaidUntil);
    const daysLeft = differenceInDays(until, now);
    if (daysLeft > 7)   return { status: 'active',   daysLeft, expiryDate: until };
    if (daysLeft >= 0)  return { status: 'expiring',  daysLeft, expiryDate: until };
    if (daysLeft >= -3) return { status: 'grace',     daysLeft, expiryDate: until };
    return { status: 'expired', daysLeft, expiryDate: until };
  }

  const trialDays = TRIAL_DAYS[user.role] ?? 30;
  const trialEnd  = user.trialEndsAt
    ? parseISO(user.trialEndsAt)
    : addDays(parseISO(user.createdAt), trialDays);

  const daysLeft = differenceInDays(trialEnd, now);
  if (daysLeft >= 0) return { status: 'trial',   daysLeft, expiryDate: trialEnd };
  return             { status: 'expired', daysLeft: 0, expiryDate: trialEnd };
}

export function isSubscriptionBlocking(user: User): boolean {
  return getSubscriptionStatus(user).status === 'expired';
}

// ── Provider config ────────────────────────────────────────
const PROVIDERS = [
  { id: 'airtel',  label: 'Airtel Money',   color: '#E00000', bg: '#FFF0F0', emoji: '🔴' },
  { id: 'mtn',     label: 'MTN Money',      color: '#FFBB00', bg: '#FFFBEB', emoji: '🟡' },
  { id: 'zamtel',  label: 'Zamtel Money',   color: '#0066CC', bg: '#EFF6FF', emoji: '🔵' },
  { id: 'bank',    label: 'Bank Transfer',  color: '#374151', bg: '#F9FAFB', emoji: '🏦' },
] as const;

type ProviderId = typeof PROVIDERS[number]['id'];
type ModalStep = 'provider' | 'phone' | 'awaiting' | 'success' | 'bank';

// ── Payment Modal ──────────────────────────────────────────
function PayModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { activateSubscription } = useApp();
  const price = SUBSCRIPTION_PRICE[user.role] ?? 100;

  const [step, setStep]         = useState<ModalStep>('provider');
  const [provider, setProvider] = useState<ProviderId | ''>('');
  const [phone, setPhone]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [reference, setReference] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [activeUntil, setActiveUntil] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const startPolling = (ref: string) => {
    const poll = async (count: number) => {
      if (count > 36) { // 3 minutes
        setError('Payment not confirmed yet. If you approved on your phone, it may take a moment — tap below to check again.');
        setStep('phone');
        return;
      }
      const result = await verifyPayment(ref);
      if (result?.paid) {
        activateSubscription(user.id, 1);
        const until = addMonths(new Date(), 1);
        setActiveUntil(until);
        setStep('success');
      } else {
        setPollCount(count);
        pollRef.current = setTimeout(() => poll(count + 1), 5000);
      }
    };
    poll(0);
  };

  const handlePay = async () => {
    if (!phone.trim() || !provider || provider === 'bank') return;
    setError('');
    setLoading(true);
    const ref = `SUB-${user.id.slice(0, 8)}-${Date.now()}`;
    const result = await initiateMobileMoneyPayment({
      amount: price,
      phone: phone.trim(),
      operator: provider as 'airtel' | 'mtn' | 'zamtel',
      reference: ref,
    });
    setLoading(false);
    if (!result) {
      setError('Could not send payment prompt. Check your number and try again.');
      return;
    }
    setReference(ref);
    setStep('awaiting');
    startPolling(ref);
  };

  const handleManualCheck = async () => {
    if (!reference) return;
    setLoading(true);
    const result = await verifyPayment(reference);
    setLoading(false);
    if (result?.paid) {
      activateSubscription(user.id, 1);
      setActiveUntil(addMonths(new Date(), 1));
      setStep('success');
    } else {
      setError(`Payment not confirmed yet (status: ${result?.status ?? 'unknown'}). Try again in a moment.`);
    }
  };

  // ── Provider selection ─────────────────────────────────
  if (step === 'provider') return (
    <ModalShell onClose={onClose}>
      <div className="px-5 pb-6 pt-2 space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            💳
          </div>
          <p className="font-extrabold text-ink text-lg">Subscribe to PawFleet</p>
          <p className="text-sm text-ink-muted mt-1">
            <span className="font-bold text-2xl" style={{ color: '#1B4332' }}>K{price}</span>
            <span className="text-ink-muted">/month</span>
          </p>
        </div>

        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Choose how to pay</p>

        <div className="space-y-2">
          {PROVIDERS.map(p => (
            <button key={p.id} type="button"
              onClick={() => {
                setProvider(p.id);
                setStep(p.id === 'bank' ? 'bank' : 'phone');
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-border hover:shadow-md transition-all active:scale-[0.98]"
              style={{ background: p.bg }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                {p.emoji}
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-ink text-sm">{p.label}</p>
                <p className="text-xs text-ink-muted">
                  {p.id === 'bank' ? 'FNB Zambia bank transfer' : `USSD push to your ${p.label} number`}
                </p>
              </div>
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );

  // ── Phone number entry ─────────────────────────────────
  if (step === 'phone') return (
    <ModalShell onClose={onClose} onBack={() => setStep('provider')}>
      <div className="px-5 pb-6 pt-2 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: selectedProvider?.bg }}>
            {selectedProvider?.emoji}
          </div>
          <div>
            <p className="font-extrabold text-ink">Pay via {selectedProvider?.label}</p>
            <p className="text-xs text-ink-muted">K{price}/month · 30 days access</p>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <p className="text-xs text-ink-muted leading-relaxed">
            Enter your {selectedProvider?.label} number below. We will send a payment prompt to your phone — just enter your PIN to confirm. <strong className="text-ink">No calls needed.</strong>
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-ink-muted block mb-2">
            {selectedProvider?.label} number
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input type="tel" value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              placeholder="0977 123 456"
              className="w-full h-12 pl-11 pr-4 rounded-2xl border border-surface-border text-sm font-medium text-ink focus:outline-none focus:border-primary" />
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <button type="button" onClick={handlePay}
          disabled={!phone.trim() || loading}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending prompt…</>
            : <>Pay K{price} · {selectedProvider?.label}</>}
        </button>

        <p className="text-center text-[11px] text-ink-muted">
          A USSD prompt will appear on your phone. Enter your {selectedProvider?.label} PIN to approve.
        </p>
      </div>
    </ModalShell>
  );

  // ── Awaiting approval ──────────────────────────────────
  if (step === 'awaiting') return (
    <ModalShell onClose={onClose}>
      <div className="px-5 pb-8 pt-2 text-center space-y-5">
        <div className="py-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 relative"
            style={{ background: '#EBF5EF' }}>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#1B4332' }} />
          </div>
          <p className="font-extrabold text-ink text-lg">Check your phone!</p>
          <p className="text-sm text-ink-muted mt-2 max-w-xs mx-auto">
            A prompt has been sent to <strong className="text-ink">{phone}</strong>
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: selectedProvider?.bg, color: selectedProvider?.color }}>
            {selectedProvider?.emoji} Enter your {selectedProvider?.label} PIN to approve K{price}
          </div>
        </div>

        <div className="bg-surface-secondary rounded-2xl p-4 space-y-2 text-left">
          {[
            'Open your phone — a USSD menu will appear',
            `Select "Confirm" or "Pay" on the prompt`,
            'Enter your mobile money PIN',
            'Payment will activate your account instantly',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: '#1B4332' }}>{i + 1}</div>
              <p className="text-xs text-ink leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="space-y-3">
          <button type="button" onClick={handleManualCheck} disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
              : <>✓ I've approved — confirm payment</>}
          </button>
          <p className="text-[11px] text-ink-muted">
            Auto-checking every 5s ({Math.max(0, 36 - pollCount)} checks remaining)
          </p>
          <button type="button" onClick={() => setStep('phone')}
            className="text-xs text-ink-muted underline underline-offset-2">
            Wrong number? Go back
          </button>
        </div>
      </div>
    </ModalShell>
  );

  // ── Success ────────────────────────────────────────────
  if (step === 'success') return (
    <ModalShell onClose={onClose}>
      <div className="px-5 pb-8 pt-2 text-center space-y-5">
        <div className="py-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <p className="font-extrabold text-ink text-xl">You're subscribed!</p>
          <p className="text-sm text-ink-muted mt-2">Your PawFleet account is now active.</p>
          {activeUntil && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: '#EBF5EF', color: '#1B4332' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active until {format(activeUntil, 'dd MMM yyyy')}
            </div>
          )}
        </div>
        <button type="button" onClick={onClose}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
          Continue
        </button>
      </div>
    </ModalShell>
  );

  // ── Bank Transfer ──────────────────────────────────────
  if (step === 'bank') return (
    <ModalShell onClose={onClose} onBack={() => setStep('provider')}>
      <div className="px-5 pb-6 pt-2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#F9FAFB' }}>
            <Building2 className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="font-extrabold text-ink">Bank Transfer</p>
            <p className="text-xs text-ink-muted">FNB Zambia · K{price}/month</p>
          </div>
        </div>

        <div className="bg-surface-secondary rounded-2xl p-4 space-y-3">
          {[
            { label: 'Bank',            value: 'FNB Zambia' },
            { label: 'Account Name',    value: 'PawFleet Ltd' },
            { label: 'Account Number',  value: '62012345678' },
            { label: 'Branch Code',     value: '260001' },
            { label: 'Reference',       value: `PAWFLEET-${user.id.slice(0, 8).toUpperCase()}` },
            { label: 'Amount',          value: `ZMW ${price}.00` },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">{row.label}</p>
              <p className="text-xs font-bold text-ink">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-xs text-amber-800 leading-relaxed">
            After paying, send proof of payment to <strong>support@pawfleet.zm</strong> or WhatsApp <strong>+260 97 700 0001</strong> with your reference number. Your account will be activated within 2 hours.
          </p>
        </div>

        <button type="button" onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
          Got it — I'll pay now
        </button>
      </div>
    </ModalShell>
  );

  return null;
}

// ── Shared modal shell ────────────────────────────────────
function ModalShell({ children, onClose, onBack }: {
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm px-2 pb-2"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.22s ease-out' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-border">
          <div className="w-8">
            {onBack && (
              <button type="button" onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover">
                <ArrowLeft className="w-4 h-4 text-ink-muted" />
              </button>
            )}
          </div>
          <div className="w-10 h-1 rounded-full bg-gray-200" />
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main Banner ───────────────────────────────────────────
interface SubscriptionBannerProps {
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

  if (onlyWhenUrgent && status === 'active') return null;
  if (dismissed && (status === 'trial' || status === 'active')) return null;

  const config: Record<SubStatus, {
    bg: string; border: string; icon: React.ReactNode;
    title: string; subtitle: string; btn: string; btnStyle: string;
  }> = {
    trial: {
      bg: '#F0FDFA', border: '#A5F3FC',
      icon: <Clock className="w-4 h-4 text-teal-600" />,
      title: `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
      subtitle: `After your trial, subscribe for K${price}/month to keep your account active.`,
      btn: 'Subscribe Now', btnStyle: 'linear-gradient(135deg,#0F766E,#0891B2)',
    },
    active: {
      bg: '#F0FDF4', border: '#86EFAC',
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
      title: `Subscription active — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
      subtitle: 'Your account is active. Renew before it expires to stay live.',
      btn: 'Renew Early', btnStyle: '#2B8A50',
    },
    expiring: {
      bg: '#FFFBEB', border: '#FDE68A',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      title: `Subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      subtitle: `Pay K${price} now to avoid losing access.`,
      btn: `Renew — K${price}`, btnStyle: 'linear-gradient(135deg,#D97706,#B45309)',
    },
    grace: {
      bg: '#FEF2F2', border: '#FECACA',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      title: 'Subscription expired — grace period',
      subtitle: `Pay K${price} now. Account suspended in ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}.`,
      btn: `Pay Now — K${price}`, btnStyle: 'linear-gradient(135deg,#DC2626,#991B1B)',
    },
    expired: {
      bg: '#FEF2F2', border: '#FECACA',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      title: 'Subscription expired — account restricted',
      subtitle: `Pay K${price}/month to restore full access.`,
      btn: `Pay Now — K${price}`, btnStyle: 'linear-gradient(135deg,#DC2626,#991B1B)',
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
            style={{ background: c.btnStyle }}>
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
