import { useState, useEffect, useRef } from 'react';
import { X, Phone, CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { startPayment, paymentStatus, type PaymentKind, type Operator, type PaymentIntent } from '../../lib/lenco';

interface Props {
  /** Shown to the person. The amount actually charged is worked out by the server. */
  amount: number;
  description: string;
  customerName: string;
  customerPhone?: string;
  kind: PaymentKind;
  refId?: string;
  payload?: Record<string, unknown>;
  onConfirm: (method: string, reference: string, intent: PaymentIntent) => void;
  onClose: () => void;
}

type Step = 'select' | 'pending' | 'timeout' | 'done' | 'failed';

const OPERATORS: { id: Operator; label: string; color: string; bg: string }[] = [
  { id: 'airtel', label: 'Airtel Money',  color: '#E2231A', bg: '#FEE2E2' },
  { id: 'mtn',    label: 'MTN MoMo',      color: '#FFCB00', bg: '#FEF9C3' },
  { id: 'zamtel', label: 'Zamtel Kwacha', color: '#00A651', bg: '#DCFCE7' },
];

const POLL_MS = 5000;
const WAIT_MS = 2 * 60 * 1000;

function guessOperator(phone?: string): Operator {
  const d = String(phone || '').replace(/\D/g, '').replace(/^260/, '0');
  if (/^0(97|77|57)/.test(d)) return 'airtel';
  if (/^0(96|76|56)/.test(d)) return 'mtn';
  if (/^0(95|75|55)/.test(d)) return 'zamtel';
  return 'airtel';
}

function OperatorLogo({ id, size = 40 }: { id: string; size?: number }) {
  const fill = id === 'airtel' ? '#E2231A' : id === 'mtn' ? '#FFCB00' : '#00A651';
  const text = id === 'airtel' ? 'AIRTEL' : id === 'mtn' ? 'MTN' : 'ZAMTEL';
  const fs = id === 'mtn' ? 13 : id === 'airtel' ? 11 : 8;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill={fill} />
      <text x="20" y={id === 'zamtel' ? 24 : 26} textAnchor="middle" fontSize={fs} fontWeight="bold" fill={id === 'mtn' ? '#1a1a1a' : 'white'} fontFamily="Arial">{text}</text>
    </svg>
  );
}

export default function PaymentModal({ amount, description, customerPhone, kind, refId, payload, onConfirm, onClose }: Props) {
  const [operator, setOperator] = useState<Operator>(guessOperator(customerPhone));
  const [phone, setPhone]       = useState(customerPhone || '');
  const [step, setStep]         = useState<Step>('select');
  const [sending, setSending]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError]       = useState('');
  const [failReason, setFailReason] = useState('');
  const [intent, setIntent]     = useState<PaymentIntent | null>(null);
  const [elapsed, setElapsed]   = useState(0);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmed = useRef(false);
  const alive = useRef(true);
  const startedAt = useRef(0);

  const stopTimers = () => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (tickTimer.current) { clearInterval(tickTimer.current); tickTimer.current = null; }
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopTimers();
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, []);

  const finishSuccess = (it: PaymentIntent) => {
    if (confirmed.current) return; // never confirm twice
    confirmed.current = true;
    stopTimers();
    setIntent(it);
    setStep('done');
    doneTimer.current = setTimeout(() => onConfirm('mobile_money', it.reference, it), 1200);
  };

  const apply = (it: PaymentIntent): 'continue' | 'stop' => {
    if (!alive.current) return 'stop';
    setIntent(it);
    if (it.status === 'successful') { finishSuccess(it); return 'stop'; }
    if (it.status === 'failed' || it.status === 'expired') {
      stopTimers();
      setFailReason(it.status === 'expired'
        ? 'The prompt expired before it was approved.'
        : (it.reason || 'The payment was cancelled or declined on the phone.'));
      setStep('failed');
      return 'stop';
    }
    return 'continue';
  };

  // One check at a time: the next one is scheduled only after the previous one has answered.
  const poll = (intentId: string) => {
    pollTimer.current = setTimeout(async () => {
      const r = await paymentStatus(intentId);
      if (!alive.current || confirmed.current) return;
      if (r.ok && apply(r.data) === 'stop') return;
      if (Date.now() - startedAt.current >= WAIT_MS) { stopTimers(); setStep('timeout'); return; }
      poll(intentId);
    }, POLL_MS);
  };

  const beginWaiting = (it: PaymentIntent) => {
    stopTimers();
    startedAt.current = Date.now();
    setElapsed(0);
    setStep('pending');
    tickTimer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    poll(it.intentId);
  };

  const handlePay = async () => {
    if (sending) return;
    if (!phone.trim()) { setError('Please enter your mobile money number.'); return; }
    setError('');
    setSending(true);
    const r = await startPayment({ kind, refId, operator, phone, payload });
    setSending(false);
    if (!alive.current) return;
    if (!r.ok) { setError(r.error); return; }
    if (apply(r.data) === 'stop') return;
    beginWaiting(r.data);
  };

  // Asks how it went. Never sends a new prompt.
  const checkAgain = async () => {
    if (!intent || checking) return;
    setChecking(true);
    const r = await paymentStatus(intent.intentId);
    setChecking(false);
    if (!alive.current) return;
    if (!r.ok) { setError(r.error); return; }
    setError('');
    if (apply(r.data) === 'continue') setError('Not confirmed yet. If you approved it, give it a moment and check again.');
  };

  const resetToSelect = () => {
    stopTimers();
    setIntent(null);
    setError('');
    setFailReason('');
    setStep('select');
  };

  const selectedOp = OPERATORS.find(o => o.id === operator);
  const shownAmount = intent?.amount ?? amount;
  const canClose = step !== 'done';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget && step === 'select' && !sending) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl space-y-5">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />

        {step === 'select' && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Mobile Money Payment</h2>
                <p className="text-sm text-ink-muted mt-0.5">{description}</p>
              </div>
              <button onClick={onClose} disabled={sending} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#EBF5EF] rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold" style={{ color: '#1B4332' }}>K{shownAmount.toLocaleString()}</p>
              <p className="text-xs text-ink-muted mt-1">Total amount due</p>
            </div>

            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Select Network</p>
              <div className="grid grid-cols-3 gap-2">
                {OPERATORS.map(op => (
                  <button key={op.id} type="button" onClick={() => setOperator(op.id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all"
                    style={{ borderColor: operator === op.id ? op.color : '#E5E7EB', background: operator === op.id ? op.bg : 'white' }}>
                    <OperatorLogo id={op.id} size={38} />
                    <span className="text-[10px] font-bold text-ink leading-tight text-center">{op.label}</span>
                    {operator === op.id && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: op.color }} />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-muted mb-1 block">Mobile Money Number</label>
              <div className="flex items-center gap-2 border-2 border-surface-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                <Phone className="w-4 h-4 text-ink-muted shrink-0" />
                <input type="tel" inputMode="tel" value={phone}
                  onChange={e => { setPhone(e.target.value); setOperator(guessOperator(e.target.value)); }}
                  placeholder="0971 234 567" className="flex-1 text-sm text-ink focus:outline-none" />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                One payment prompt is sent to this number. Approve it with your PIN.
              </p>
            </div>

            {error && <p className="text-sm text-danger text-center font-medium">{error}</p>}

            <button type="button" onClick={handlePay} disabled={sending || !phone.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending prompt…</>
                : <>Pay K{shownAmount.toLocaleString()} via {selectedOp?.label}</>}
            </button>
          </>
        )}

        {(step === 'pending' || step === 'timeout') && (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">{step === 'pending' ? 'Check Your Phone' : 'Not Confirmed Yet'}</h2>
              {canClose && (
                <button onClick={() => { stopTimers(); onClose(); }} aria-label="Close"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto shadow-lg">
                <OperatorLogo id={operator} size={48} />
              </div>
              <p className="font-extrabold text-white text-xl">K{shownAmount.toLocaleString()}</p>
              <p className="text-white/80 text-sm">Payment prompt sent to</p>
              <p className="font-bold text-white text-lg">{phone}</p>
              {intent?.reference && <p className="text-white/60 text-[10px] font-mono">Ref {intent.reference}</p>}
            </div>

            {step === 'pending' ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <p className="font-bold text-amber-800 text-sm">📲 Enter your PIN to approve</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Open the {selectedOp?.label} prompt and enter your PIN. If you cancel it, we'll stop here — nothing is charged
                    and no new prompt is sent.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-ink-muted">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for confirmation… ({Math.min(elapsed, 120)}s)</span>
                </div>
              </>
            ) : (
              <div className="bg-surface-secondary rounded-2xl p-4">
                <p className="text-sm text-ink leading-relaxed">
                  We haven't had a confirmation from {selectedOp?.label} yet. If you approved the prompt, tap <strong>Check again</strong>.
                  This does not send another prompt.
                </p>
              </div>
            )}

            {error && <p className="text-xs text-danger text-center">{error}</p>}

            <button type="button" onClick={checkAgain} disabled={checking}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {checking ? 'Checking…' : "I've approved — check again"}
            </button>

            {step === 'timeout' && (
              <button onClick={() => { stopTimers(); onClose(); }} className="w-full py-2 text-xs text-ink-muted hover:text-ink">
                Close — I'll pay later
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <CheckCircle2 className="w-11 h-11" style={{ color: '#1B4332' }} />
            </div>
            <p className="font-extrabold text-ink text-2xl">Payment Confirmed!</p>
            <p className="text-sm text-ink-muted">K{shownAmount.toLocaleString()} received via {selectedOp?.label}</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-extrabold text-ink text-lg">Payment Not Completed</p>
            <p className="text-sm text-ink-muted">{failReason} Nothing was charged.</p>
            <div className="flex gap-3 w-full">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink">
                Close
              </button>
              <button onClick={resetToSelect}
                className="flex-1 py-3 rounded-2xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                Send a new prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
