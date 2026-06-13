import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface SavedCard {
  id: string;
  label: string;
  last4: string;
  type: 'card' | 'mobile';
  network?: string;
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const [saved] = useState<SavedCard[]>([
    { id: '1', label: 'Airtel Money', last4: '7821', type: 'mobile', network: 'Airtel' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'card' | 'mobile'>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = () => {
    setDone(true);
    setTimeout(() => { setDone(false); setShowAdd(false); }, 1500);
  };

  return (
    <div className="max-w-lg mx-auto pb-28 bg-white min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink flex-1">Payment Methods</h1>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Saved methods */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Saved Methods</p>
          <div className="space-y-2">
            {saved.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-white border border-surface-border rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
                  {s.type === 'mobile' ? <Smartphone className="w-5 h-5" style={{ color: '#1B4332' }} /> : <CreditCard className="w-5 h-5" style={{ color: '#1B4332' }} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{s.label}</p>
                  <p className="text-xs text-ink-muted">•••• {s.last4}</p>
                </div>
                <button className="text-ink-muted hover:text-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {saved.length === 0 && (
              <div className="py-8 text-center">
                <CreditCard className="w-10 h-10 text-ink-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-ink-muted">No saved payment methods</p>
              </div>
            )}
          </div>
        </div>

        {/* Add new */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
            <Plus className="w-4 h-4" /> Add Payment Method
          </button>
        ) : (
          <div className="bg-white border border-surface-border rounded-2xl p-5 space-y-4">
            <p className="font-bold text-ink text-sm">Add New Method</p>

            {/* Type selector */}
            <div className="flex gap-2">
              {(['mobile', 'card'] as const).map(t => (
                <button key={t} onClick={() => setAddType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${addType === t ? 'border-primary bg-primary/10 text-primary' : 'border-surface-border text-ink-muted'}`}>
                  {t === 'mobile' ? '📱 Mobile Money' : '💳 Debit/Credit Card'}
                </button>
              ))}
            </div>

            {addType === 'mobile' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Mobile Money Number</label>
                  <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)}
                    placeholder="+260 97 XXX XXXX"
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <p className="text-xs text-ink-muted bg-[#EBF5EF] rounded-xl p-3">
                  Works with Airtel Money and MTN MoMo. A PIN prompt will appear on your phone when you pay.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Card Number</label>
                  <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456" maxLength={19}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Name on Card</label>
                  <input type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                    placeholder="JOHN BANDA"
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-muted mb-1 block">Expiry</label>
                    <input type="text" value={expiry} onChange={e => setExpiry(e.target.value)}
                      placeholder="MM/YY" maxLength={5}
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted mb-1 block">CVV</label>
                    <input type="password" value={cvv} onChange={e => setCvv(e.target.value)}
                      placeholder="•••" maxLength={4}
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl border border-surface-border text-sm font-semibold text-ink-secondary hover:bg-surface-hover">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                {done ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Method'}
              </button>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="rounded-2xl p-4 text-xs text-white/90 leading-relaxed" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <p className="font-bold mb-1">Secure Payments via Lenco</p>
          <p className="opacity-80">All payments are processed securely. PawFleet never stores your card details.</p>
        </div>
      </div>
    </div>
  );
}
