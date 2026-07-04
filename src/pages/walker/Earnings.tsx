import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { TrendingUp, CheckCircle, Clock, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentBadge } from '../../components/ui/Badge';

type Range = '7d' | '30d' | 'all';

function BarChart({ data, height = 100 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group cursor-default relative">
          {d.value > 0 && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              K{d.value}
            </div>
          )}
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * (height - 20)}px`,
              minHeight: d.value > 0 ? 4 : 2,
              background: d.value > 0 ? 'linear-gradient(180deg,#2B8A50,#1B4332)' : '#E5E7EB',
            }}
          />
          <span className="text-[10px] text-ink-muted leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function sendReceiptEmail(payload: {
  to: string; ownerName: string; walkerName: string;
  dogName: string; amount: number; duration?: number; date: string;
}) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget — don't surface email errors to the walker UI
  }
}

export default function WalkerEarnings() {
  const { data, currentUser, confirmPaymentReceived } = useApp();
  const [confirming, setConfirming] = useState<string | null>(null);

  const myPayments = data.payments.filter(p => p.walkerId === currentUser?.id);
  const paidPayments   = myPayments.filter(p => p.status === 'paid');
  const unpaidPayments = myPayments.filter(p => p.status === 'unpaid');
  const unconfirmed    = paidPayments.filter(p => !p.walkerConfirmed);

  const totalEarned  = myPayments.reduce((s, p) => s + p.amount, 0);
  const totalPaid    = paidPayments.reduce((s, p) => s + p.amount, 0);
  const totalUnpaid  = unpaidPayments.reduce((s, p) => s + p.amount, 0);

  const myCompletedWalks = data.walks.filter(
    w => w.walkerId === currentUser?.id && w.status === 'completed',
  );

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d  = subDays(new Date(), 6 - i);
    const ds = format(d, 'yyyy-MM-dd');
    const earned = myCompletedWalks
      .filter(w => w.scheduledDate.startsWith(ds))
      .reduce((s, w) => s + (w.walkerEarning || 0), 0);
    return { label: format(d, 'EEE'), value: earned };
  });

  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);

  const earningsHistory = myCompletedWalks
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .map(walk => ({
      walk,
      payment: myPayments.find(p => p.walkId === walk.id),
      dog:     data.dogs.find(d => d.id === walk.dogId),
      owner:   data.users.find(u => u.id === walk.ownerId),
    }));

  const handleConfirm = async (paymentId: string) => {
    setConfirming(paymentId);
    confirmPaymentReceived(paymentId);

    // Send receipt email to the owner (fire-and-forget)
    const payment = myPayments.find(p => p.id === paymentId);
    const walk    = payment ? data.walks.find(w => w.id === payment.walkId) : null;
    const dog     = walk ? data.dogs.find(d => d.id === walk.dogId) : null;
    const owner   = walk ? data.users.find(u => u.id === walk.ownerId) : null;
    if (owner?.email && walk && dog) {
      sendReceiptEmail({
        to:         owner.email,
        ownerName:  owner.name,
        walkerName: currentUser?.name ?? 'Your Walker',
        dogName:    dog.name,
        amount:     payment?.amount ?? walk.walkerEarning ?? 0,
        duration:   walk.duration,
        date:       walk.scheduledDate,
      });
    }

    setTimeout(() => setConfirming(null), 600);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-7 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <p className="text-white/70 text-xs font-medium mb-1">Your Earnings</p>
        <h1 className="text-2xl font-extrabold text-white mb-1">K{totalEarned.toLocaleString()}</h1>
        <p className="text-white/75 text-sm">{myCompletedWalks.length} walks completed all time</p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: 'Paid Out',   value: `K${totalPaid}`,   color: '#52B788' },
            { label: 'Pending',    value: `K${totalUnpaid}`, color: '#F59E0B' },
            { label: 'Avg / Walk', value: myCompletedWalks.length ? `K${Math.round(totalEarned / myCompletedWalks.length)}` : 'K0', color: '#60A5FA' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3 text-center">
              <p className="text-lg font-extrabold text-white">{s.value}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-5">

        {/* ── Unconfirmed payment alert ── */}
        {unconfirmed.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {unconfirmed.length} payment{unconfirmed.length > 1 ? 's' : ''} awaiting your confirmation
                </p>
                <p className="text-xs text-blue-700/75 mt-0.5">
                  Tap "Confirm Received" below once you've received payment from the pet owner.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {unconfirmed.map(p => {
                const walk  = data.walks.find(w => w.id === p.walkId);
                const dog   = data.dogs.find(d => d.id === walk?.dogId);
                return (
                  <div key={p.id}
                    className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-blue-100">
                    <div>
                      <p className="text-sm font-semibold text-ink">{dog?.name ?? 'Walk'} — K{p.amount}</p>
                      <p className="text-xs text-ink-muted">{format(new Date(p.date), 'MMM d, yyyy')}</p>
                    </div>
                    <button
                      type="button"
                      disabled={confirming === p.id}
                      onClick={() => handleConfirm(p.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-60"
                      style={{ background: '#2B8A50' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {confirming === p.id ? 'Saving…' : 'Confirm Received'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unpaid alert */}
        {totalUnpaid > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">K{totalUnpaid} pending payment</p>
              <p className="text-xs text-amber-700/70 mt-0.5">The pet owner will pay you directly after the walk.</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-ink">This Week</h2>
            <span className="text-xs font-bold text-primary">K{chartTotal}</span>
          </div>
          <p className="text-xs text-ink-muted mb-4">Daily earnings — last 7 days</p>
          <BarChart data={chartData} height={110} />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-surface-border rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: '#EBF5EF' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#2B8A50' }} />
            </div>
            <p className="text-xl font-extrabold text-ink">K{totalEarned}</p>
            <p className="text-xs font-semibold text-ink mt-0.5">Total Earned</p>
            <p className="text-[11px] text-ink-muted">All time</p>
          </div>
          <div className="bg-white border border-surface-border rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: '#EBF5EF' }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#2B8A50' }} />
            </div>
            <p className="text-xl font-extrabold text-ink">K{totalPaid}</p>
            <p className="text-xs font-semibold text-ink mt-0.5">Total Paid</p>
            <p className="text-[11px] text-ink-muted">{paidPayments.length} payments</p>
          </div>
        </div>

        {/* Earnings history */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="font-bold text-ink">Earnings History</h2>
          </div>
          {earningsHistory.length === 0 ? (
            <div className="py-16 text-center">
              <DollarSign className="w-10 h-10 text-ink-muted mx-auto mb-3" />
              <p className="font-medium text-ink">No earnings yet</p>
              <p className="text-ink-muted text-sm mt-1">Complete walks to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {earningsHistory.map(({ walk, payment, dog, owner }) => (
                <div key={walk.id} className="px-4 py-3.5 hover:bg-surface-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {dog?.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" />
                        : '🐕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{dog?.name || 'Unknown'}</p>
                      <p className="text-xs text-ink-muted">{owner?.name} · {format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                      {walk.duration && <p className="text-[11px] text-ink-muted">{walk.duration} min</p>}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-extrabold" style={{ color: '#2B8A50' }}>K{walk.walkerEarning}</p>
                      {payment ? <PaymentBadge status={payment.status} /> : <span className="text-ink-muted text-xs">—</span>}
                      {payment?.walkerConfirmed && (
                        <div className="flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" style={{ color: '#2B8A50' }} />
                          <span className="text-[10px] font-semibold" style={{ color: '#2B8A50' }}>Confirmed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline confirm button for paid-but-unconfirmed items */}
                  {payment?.status === 'paid' && !payment.walkerConfirmed && (
                    <button
                      type="button"
                      disabled={confirming === payment.id}
                      onClick={() => handleConfirm(payment.id)}
                      className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-60"
                      style={{ background: '#2B8A50' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {confirming === payment.id ? 'Saving…' : 'Confirm Payment Received'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
