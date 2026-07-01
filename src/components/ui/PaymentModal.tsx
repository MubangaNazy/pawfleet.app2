import { useState, useEffect, useRef } from 'react';
import { X, Phone, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  amount: number;
  description: string;
  customerName: string;
  customerPhone?: string;
  onConfirm: (method: string, reference?: string) => void;
  onClose: () => void;
}

type Step = 'select' | 'pending' | 'done' | 'failed';

const OPERATORS = [
  { id: 'airtel', label: 'Airtel Money',  shortLabel: 'Airtel', color: '#E2231A', textColor: '#fff', bg: '#FEE2E2' },
  { id: 'mtn',    label: 'MTN MoMo',     shortLabel: 'MTN',    color: '#FFCB00', textColor: '#1a1a1a', bg: '#FEF9C3' },
  { id: 'zamtel', label: 'Zamtel Kwacha', shortLabel: 'Zamtel', color: '#00A651', textColor: '#fff', bg: '#DCFCE7' },
];

function OperatorLogo({ id, size = 40 }: { id: string; size?: number }) {
  if (id === 'airtel') return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#E2231A"/>
      <text x="20" y="26" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white" fontFamily="Arial">AIRTEL</text>
    </svg>
  );
  if (id === 'mtn') return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#FFCB00"/>
      <text x="20" y="26" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1a1a1a" fontFamily="Arial">MTN</text>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#00A651"/>
      <text x="20" y="24" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white" fontFamily="Arial">ZAMTEL</text>
    </svg>
  );
}

export default function PaymentModal({ amount, description, customerName, customerPhone, onConfirm, onClose }: Props) {
  const [operator, setOperator] = useState<string>('airtel');
  const [phone, setPhone]       = useState(customerPhone || '');
  const [step, setStep]         = useState<Step>('select');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [reference, setReference] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const pollStatus = (ref: string) => {
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      try {
        const r = await fetch(`/api/verify-payment?reference=${encodeURIComponent(ref)}`);
        const d = await r.json();
        if (d.paid) {
          stopPolling();
          setStep('done');
          setTimeout(() => onConfirm('mobile_money', ref), 1500);
        } else if (count >= 20) { // stop after ~2 minutes
          stopPolling();
        }
      } catch { /* keep polling */ }
    }, 6000);
  };

  const handlePay = async () => {
    if (!phone.trim()) { setError('Please enter your mobile money number.'); return; }
    setError('');
    setLoading(true);

    const ref = `PAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setReference(ref);

    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, phone, operator, reference: ref }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Payment initiation failed. Please try again.');
        setLoading(false);
        return;
      }

      setStep('pending');
      setLoading(false);
      pollStatus(ref);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleManualConfirm = () => {
    stopPolling();
    setStep('done');
    setTimeout(() => onConfirm('mobile_money', reference), 1000);
  };

  const selectedOp = OPERATORS.find(o => o.id === operator);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget && step === 'select') onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl space-y-5">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />

        {/* ── Select operator & number ── */}
        {step === 'select' && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Mobile Money Payment</h2>
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

            {/* Operator */}
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Select Network</p>
              <div className="grid grid-cols-3 gap-2">
                {OPERATORS.map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperator(op.id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all"
                    style={{
                      borderColor: operator === op.id ? op.color : '#E5E7EB',
                      background: operator === op.id ? op.bg : 'white',
                    }}
                  >
                    <OperatorLogo id={op.id} size={38} />
                    <span className="text-[10px] font-bold text-ink leading-tight text-center">{op.label}</span>
                    {operator === op.id && (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: op.color }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-ink-muted mb-1 block">Mobile Money Number</label>
              <div className="flex items-center gap-2 border-2 border-surface-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                <Phone className="w-4 h-4 text-ink-muted shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0971 234 567"
                  className="flex-1 text-sm text-ink focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                You will receive a payment prompt on this number. Approve it with your PIN.
              </p>
            </div>

            {error && <p className="text-sm text-danger text-center font-medium">{error}</p>}

            <button
              type="button"
              onClick={handlePay}
              disabled={loading || !phone.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending request…</>
                : <>Pay K{amount} via {selectedOp?.label}</>
              }
            </button>
          </>
        )}

        {/* ── Pending — waiting for customer PIN ── */}
        {step === 'pending' && (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Check Your Phone</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto shadow-lg">
                <OperatorLogo id={operator} size={48} />
              </div>
              <p className="font-extrabold text-white text-xl">K{amount.toLocaleString()}</p>
              <p className="text-white/80 text-sm">Payment prompt sent to</p>
              <p className="font-bold text-white text-lg">{phone}</p>
              <p className="text-white/70 text-xs">via {selectedOp?.label}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="font-bold text-amber-800 text-sm">📲 Enter your PIN to approve</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                A payment request for <strong>K{amount}</strong> has been sent to your phone.
                Open the {selectedOp?.label} prompt and <strong>enter your PIN</strong> to complete the payment.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-ink-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Waiting for confirmation… ({Math.min(pollCount * 6, 120)}s)</span>
            </div>

            <button
              type="button"
              onClick={handleManualConfirm}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
            >
              <CheckCircle2 className="w-4 h-4" /> I've Approved the Payment
            </button>

            <button onClick={() => { stopPolling(); setStep('select'); }} className="w-full py-2 text-xs text-ink-muted hover:text-ink">
              ← Use a different number
            </button>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <CheckCircle2 className="w-11 h-11" style={{ color: '#1B4332' }} />
            </div>
            <p className="font-extrabold text-ink text-2xl">Payment Confirmed!</p>
            <p className="text-sm text-ink-muted">K{amount.toLocaleString()} received via {selectedOp?.label}</p>
          </div>
        )}

        {/* ── Failed ── */}
        {step === 'failed' && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-extrabold text-ink text-lg">Payment Failed</p>
            <p className="text-sm text-ink-muted">The payment was not completed. Please try again.</p>
            <button
              onClick={() => setStep('select')}
              className="px-6 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
