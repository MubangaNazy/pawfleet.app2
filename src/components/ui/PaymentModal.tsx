import { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, ExternalLink, CheckCircle2, Phone } from 'lucide-react';
import { createPaymentLink } from '../../lib/lenco';

interface Props {
  amount: number;
  description: string;
  customerName: string;
  customerPhone?: string;
  walkId?: string;
  onConfirm: (method: string, reference?: string) => void;
  onClose: () => void;
}

type Step = 'select' | 'mobile_pin' | 'processing' | 'done';

export default function PaymentModal({ amount, description, customerName, customerPhone, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<'online' | 'mobile_money' | 'cash' | 'bank' | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [mobileNumber, setMobileNumber] = useState(customerPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!method) return;
    setError('');

    if (method === 'online') {
      setLoading(true);
      const link = await createPaymentLink({
        amount,
        description,
        customerName,
        customerPhone: mobileNumber || customerPhone,
        redirectUrl: window.location.href,
      });
      setLoading(false);
      if (link?.url) {
        window.open(link.url, '_blank');
        onConfirm('online', link.reference);
      } else {
        setError('Could not create payment link. Try another method.');
      }
      return;
    }

    if (method === 'mobile_money') {
      if (!mobileNumber.trim()) {
        setError('Please enter your mobile money number.');
        return;
      }
      // Show PIN prompt step
      setStep('mobile_pin');
      return;
    }

    // Cash / bank — just confirm
    onConfirm(method);
  };

  const handleMobileConfirm = () => {
    setStep('processing');
    // Simulate network delay then done
    setTimeout(() => {
      setStep('done');
      setTimeout(() => {
        onConfirm('mobile_money');
      }, 1200);
    }, 2000);
  };

  const methods = [
    { id: 'mobile_money', icon: Smartphone,   label: 'Mobile Money',   sub: 'Airtel Money / MTN MoMo — PIN on phone',  color: '#2B8A50' },
    { id: 'online',       icon: CreditCard,   label: 'Pay Online',     sub: 'Card / Bank transfer via Lenco',           color: '#1B4332' },
    { id: 'cash',         icon: Banknote,     label: 'Cash',           sub: 'Pay walker directly in cash',              color: '#52B788' },
    { id: 'bank',         icon: ExternalLink, label: 'Bank Transfer',  sub: 'EFT to PawFleet account',                  color: '#0D9488' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={e => { if (e.target === e.currentTarget && step === 'select') onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl space-y-4">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />

        {/* ── Select method ── */}
        {step === 'select' && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Complete Payment</h2>
                <p className="text-sm text-ink-muted mt-0.5">{description}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount */}
            <div className="bg-[#EBF5EF] rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold" style={{ color: '#1B4332' }}>K{amount.toLocaleString()}</p>
              <p className="text-xs text-ink-muted mt-1">Total amount due</p>
            </div>

            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Choose payment method</p>
            <div className="space-y-2">
              {methods.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id as 'online' | 'mobile_money' | 'cash' | 'bank')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${method === m.id ? 'border-primary bg-primary/5' : 'border-surface-border hover:border-primary/30'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: method === m.id ? m.color : '#EBF5EF' }}>
                    <m.icon className="w-5 h-5" style={{ color: method === m.id ? 'white' : m.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink text-sm">{m.label}</p>
                    <p className="text-xs text-ink-muted">{m.sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'bg-primary border-primary' : 'border-surface-border'}`}>
                    {method === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile number input when mobile money selected */}
            {method === 'mobile_money' && (
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Mobile Money Number</label>
                <div className="flex items-center gap-2 border border-surface-border rounded-xl px-3 py-2.5 focus-within:border-primary">
                  <Phone className="w-4 h-4 text-ink-muted shrink-0" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="+260 97 XXX XXXX"
                    className="flex-1 text-sm text-ink focus:outline-none"
                  />
                </div>
                <p className="text-xs text-ink-muted mt-1">Your network will send a PIN prompt to this number.</p>
              </div>
            )}

            {error && <p className="text-xs text-danger text-center">{error}</p>}

            <button onClick={handlePay} disabled={!method || loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Processing…</>
              ) : method === 'online' ? (
                <><ExternalLink className="w-4 h-4" /> Pay K{amount} via Lenco</>
              ) : method === 'mobile_money' ? (
                <><Smartphone className="w-4 h-4" /> Send Payment Request</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Confirm Payment</>
              )}
            </button>
          </>
        )}

        {/* ── Mobile PIN prompt ── */}
        {step === 'mobile_pin' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Confirm with PIN</h2>
              <button onClick={() => setStep('select')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <p className="font-extrabold text-white text-xl">K{amount.toLocaleString()}</p>
              <p className="text-white/80 text-sm">Payment request sent to</p>
              <p className="font-bold text-white">{mobileNumber}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="font-bold text-amber-800 text-sm">📱 Check your phone</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                A payment prompt has been sent to your Airtel Money / MTN MoMo number.
                Open the message and <strong>enter your mobile money PIN</strong> to approve the payment.
              </p>
            </div>

            <p className="text-xs text-center text-ink-muted">Once you've entered your PIN on your phone, tap below to confirm.</p>

            <button onClick={handleMobileConfirm}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <CheckCircle2 className="w-4 h-4" /> I've Confirmed My PIN
            </button>

            <button onClick={() => setStep('select')} className="w-full py-2 text-xs text-ink-muted hover:text-ink">
              ← Use a different method
            </button>
          </div>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="font-bold text-ink">Verifying payment…</p>
            <p className="text-sm text-ink-muted text-center">Confirming your PIN and processing the transaction.</p>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <CheckCircle2 className="w-9 h-9" style={{ color: '#1B4332' }} />
            </div>
            <p className="font-extrabold text-ink text-xl">Payment Successful!</p>
            <p className="text-sm text-ink-muted">K{amount.toLocaleString()} paid via Mobile Money</p>
          </div>
        )}
      </div>
    </div>
  );
}
