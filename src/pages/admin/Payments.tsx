import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, CreditCard, Clock, TrendingUp, X, Banknote, Smartphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { PaymentBadge } from '../../components/ui/Badge';
import type { PaymentMethod } from '../../types';

type Tab = 'unpaid' | 'paid';

function ConfirmPaymentModal({
  walkerName,
  dogName,
  amount,
  onConfirm,
  onClose,
}: {
  walkerName: string;
  dogName: string;
  amount: number;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    onConfirm(method);
    setTimeout(onClose, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ink">Confirm Payment</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover">
            <X className="w-4 h-4 text-ink-muted" />
          </button>
        </div>

        {/* Summary */}
        <div className="bg-surface-secondary rounded-2xl p-4 mb-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-muted">Walker</span>
            <span className="font-semibold text-ink">{walkerName}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-muted">Dog</span>
            <span className="font-semibold text-ink">{dogName}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-surface-border mt-2">
            <span className="font-bold text-ink">Amount</span>
            <span className="font-extrabold text-lg" style={{ color: '#2B8A50' }}>K{amount}</span>
          </div>
        </div>

        {/* Payment method */}
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">How was this paid?</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setMethod('cash')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              method === 'cash' ? 'border-primary bg-primary-50' : 'border-surface-border hover:border-primary/30'
            }`}>
            <Banknote className={`w-6 h-6 ${method === 'cash' ? 'text-primary' : 'text-ink-muted'}`} />
            <span className={`text-sm font-bold ${method === 'cash' ? 'text-primary' : 'text-ink'}`}>Cash</span>
          </button>
          <button
            onClick={() => setMethod('mobile_money')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              method === 'mobile_money' ? 'border-primary bg-primary-50' : 'border-surface-border hover:border-primary/30'
            }`}>
            <Smartphone className={`w-6 h-6 ${method === 'mobile_money' ? 'text-primary' : 'text-ink-muted'}`} />
            <span className={`text-sm font-bold ${method === 'mobile_money' ? 'text-primary' : 'text-ink'}`}>Mobile Money</span>
          </button>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {saving ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving…</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Confirm {method === 'cash' ? 'Cash' : 'Mobile Money'} Payment</>
          )}
        </button>
      </div>
    </div>
  );
}

const METHOD_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash:         { label: 'Cash',         icon: <Banknote className="w-3 h-3" />,    color: '#059669' },
  mobile_money: { label: 'Mobile Money', icon: <Smartphone className="w-3 h-3" />,  color: '#7C3AED' },
};

export default function AdminPayments() {
  const { data, markPaymentPaid } = useApp();
  const [tab, setTab] = useState<Tab>('unpaid');
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);

  const unpaidPayments = data.payments.filter(p => p.status === 'unpaid');
  const paidPayments   = data.payments.filter(p => p.status === 'paid');
  const totalPaid   = paidPayments.reduce((s, p) => s + p.amount, 0);
  const totalUnpaid = unpaidPayments.reduce((s, p) => s + p.amount, 0);

  const getWalkerName = (walkerId: string) => data.users.find(u => u.id === walkerId)?.name || 'Unknown';
  const getDogName = (walkId: string) => {
    const walk = data.walks.find(w => w.id === walkId);
    return walk ? data.dogs.find(d => d.id === walk.dogId)?.name || 'Unknown' : 'Unknown';
  };
  const getWalkDate = (walkId: string) => {
    const walk = data.walks.find(w => w.id === walkId);
    return walk ? walk.scheduledDate : null;
  };
  const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

  const displayPayments = [...(tab === 'unpaid' ? unpaidPayments : paidPayments)]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingPayment = confirmingPayment
    ? data.payments.find(p => p.id === confirmingPayment)
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Payments</h1>
        <p className="text-ink-secondary mt-1">Track and manage walker payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Earnings" value={`ZMW ${totalPaid + totalUnpaid}`} subtitle={`${data.payments.length} records`} color="blue" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Total Paid" value={`ZMW ${totalPaid}`} subtitle={`${paidPayments.length} payments`} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Unpaid" value={`ZMW ${totalUnpaid}`} subtitle={`${unpaidPayments.length} pending`} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary border border-surface-border rounded-xl w-fit">
        {([{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }] as const).map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.value ? 'bg-primary text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
            }`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.value ? 'bg-white/20' : 'bg-surface-border'}`}>
              {t.value === 'unpaid' ? unpaidPayments.length : paidPayments.length}
            </span>
          </button>
        ))}
      </div>

      {/* Payments list */}
      {displayPayments.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <CreditCard className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No {tab} payments</p>
          <p className="text-ink-muted text-sm mt-1">{tab === 'unpaid' ? 'All payments are cleared!' : 'No payment history yet.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-surface-border">
            {displayPayments.map(payment => {
              const walkDate = getWalkDate(payment.walkId);
              const methodInfo = payment.paymentMethod ? METHOD_LABEL[payment.paymentMethod] : null;
              return (
                <div key={payment.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-ink">{getWalkerName(payment.walkerId)}</span>
                    <PaymentBadge status={payment.status} />
                  </div>
                  <div className="flex justify-between text-xs text-ink-secondary">
                    <span>{getDogName(payment.walkId)}</span>
                    <span className="font-bold text-ink">K{payment.amount}</span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {walkDate ? format(new Date(walkDate), 'MMM d, yyyy') : payment.date}
                  </div>
                  {methodInfo && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: methodInfo.color }}>
                      {methodInfo.icon} Paid via {methodInfo.label}
                      {payment.walkerConfirmed && <span className="ml-1 text-success">· Walker confirmed ✓</span>}
                    </div>
                  )}
                  {tab === 'unpaid' && (
                    <button
                      onClick={() => setConfirmingPayment(payment.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Mark as Paid
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-surface-secondary/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Walker</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Dog</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {tab === 'paid' ? 'Method' : 'Action'}
                  </th>
                  {tab === 'paid' && <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Confirmed</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {displayPayments.map(payment => {
                  const walkDate = getWalkDate(payment.walkId);
                  const walkerName = getWalkerName(payment.walkerId);
                  const methodInfo = payment.paymentMethod ? METHOD_LABEL[payment.paymentMethod] : null;
                  return (
                    <tr key={payment.id} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{getInitials(walkerName)}</span>
                          </div>
                          <span className="text-sm font-medium text-ink">{walkerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink">{getDogName(payment.walkId)}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-secondary whitespace-nowrap">
                        {walkDate ? format(new Date(walkDate), 'MMM d, yyyy') : payment.date}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-ink">K{payment.amount}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentBadge status={payment.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {tab === 'unpaid' ? (
                          <button
                            onClick={() => setConfirmingPayment(payment.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        ) : methodInfo ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold"
                            style={{ color: methodInfo.color }}>
                            {methodInfo.icon} {methodInfo.label}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      {tab === 'paid' && (
                        <td className="px-5 py-3.5">
                          {payment.walkerConfirmed
                            ? <span className="text-xs font-semibold text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Walker confirmed</span>
                            : <span className="text-xs text-ink-muted">Awaiting walker</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm payment modal */}
      {confirmingPayment && pendingPayment && (
        <ConfirmPaymentModal
          walkerName={getWalkerName(pendingPayment.walkerId)}
          dogName={getDogName(pendingPayment.walkId)}
          amount={pendingPayment.amount}
          onConfirm={(method) => markPaymentPaid(confirmingPayment, method)}
          onClose={() => setConfirmingPayment(null)}
        />
      )}
    </div>
  );
}
