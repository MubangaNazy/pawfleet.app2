import { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, ExternalLink, CheckCircle2 } from 'lucide-react';
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

export default function PaymentModal({ amount, description, customerName, customerPhone, onConfirm, onClose }: Props) {
  const [method, setMethod] = useState<'online' | 'mobile_money' | 'cash' | 'bank' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!method) return;
    setLoading(true);
    setError('');

    if (method === 'online') {
      const link = await createPaymentLink({
        amount,
        description,
        customerName,
        customerPhone,
        redirectUrl: window.location.href,
      });
      setLoading(false);
      if (link?.url) {
        window.open(link.url, '_blank');
        // After opening, let user confirm they paid
        onConfirm('online', link.reference);
      } else {
        setError('Could not create payment link. Try another method.');
      }
      return;
    }

    setLoading(false);
    onConfirm(method);
  };

  const methods = [
    { id: 'online',       icon: CreditCard,   label: 'Pay Online',     sub: 'Card / Bank transfer via Lenco', color: '#1B4332' },
    { id: 'mobile_money', icon: Smartphone,   label: 'Mobile Money',   sub: 'Airtel Money / MTN MoMo',       color: '#2B8A50' },
    { id: 'cash',         icon: Banknote,      label: 'Cash',           sub: 'Pay walker directly',           color: '#52B788' },
    { id: 'bank',         icon: ExternalLink, label: 'Bank Transfer',  sub: 'EFT to PawFleet account',       color: '#0D9488' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl space-y-4">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />
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

        {/* Method selector */}
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

        {error && <p className="text-xs text-danger text-center">{error}</p>}

        <button onClick={handlePay} disabled={!method || loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {loading ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Processing…</>
          ) : method === 'online' ? (
            <><ExternalLink className="w-4 h-4" /> Pay K{amount} via Lenco</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Confirm Payment</>
          )}
        </button>
      </div>
    </div>
  );
}
