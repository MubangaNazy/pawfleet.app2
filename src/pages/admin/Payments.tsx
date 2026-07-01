import React from 'react';
import { format } from 'date-fns';
import { CreditCard, TrendingUp, CheckCircle, Clock, Banknote, Smartphone, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { PaymentBadge } from '../../components/ui/Badge';

const METHOD_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash:         { label: 'Cash',         icon: <Banknote className="w-3 h-3" />,   color: '#059669' },
  mobile_money: { label: 'Mobile Money', icon: <Smartphone className="w-3 h-3" />, color: '#7C3AED' },
};

export default function AdminPayments() {
  const { data } = useApp();

  const paidPayments   = data.payments.filter(p => p.status === 'paid');
  const unpaidPayments = data.payments.filter(p => p.status === 'unpaid');
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

  const allPayments = [...data.payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Payments</h1>
        <p className="text-ink-secondary mt-1">Overview of walker earnings — read-only</p>
      </div>

      {/* Read-only info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Payments happen directly between owners and walkers.</span>
          {' '}The walker receives money from the pet owner after each walk. This page is read-only — no admin action required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Earnings" value={`ZMW ${totalPaid + totalUnpaid}`} subtitle={`${data.payments.length} records`} color="blue" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Paid to Walkers" value={`ZMW ${totalPaid}`} subtitle={`${paidPayments.length} payments`} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={`ZMW ${totalUnpaid}`} subtitle={`${unpaidPayments.length} pending`} color="amber" />
      </div>

      {/* Payments list */}
      {allPayments.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <CreditCard className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No payment records</p>
          <p className="text-ink-muted text-sm mt-1">Payments will appear here after walks are completed.</p>
        </div>
      ) : (
        <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-surface-border">
            {allPayments.map(payment => {
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
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: methodInfo.color }}>
                      {methodInfo.icon} Paid via {methodInfo.label}
                      {payment.walkerConfirmed && <span className="ml-1 text-success">· Walker confirmed ✓</span>}
                    </div>
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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Walker Confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {allPayments.map(payment => {
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
                        {methodInfo ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: methodInfo.color }}>
                            {methodInfo.icon} {methodInfo.label}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {payment.walkerConfirmed
                          ? <span className="text-xs font-semibold text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmed</span>
                          : <span className="text-xs text-ink-muted">Awaiting walker</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
