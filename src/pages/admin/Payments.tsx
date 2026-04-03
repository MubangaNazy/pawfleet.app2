import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, CreditCard, Clock, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

type Tab = 'unpaid' | 'paid';

export default function AdminPayments() {
  const { data, markPaymentPaid } = useApp();
  const [tab, setTab] = useState<Tab>('unpaid');

  const unpaidPayments = data.payments.filter(p => p.status === 'unpaid');
  const paidPayments = data.payments.filter(p => p.status === 'paid');
  const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Payments</h1>
        <p className="text-ink-secondary mt-1">Track and manage walker payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Earnings" value={`ZMW ${totalPaid + totalUnpaid}`} subtitle={`${data.payments.length} records`} color="blue" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Total Paid" value={`ZMW ${totalPaid}`} subtitle={`${paidPayments.length} payments`} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Total Unpaid" value={`ZMW ${totalUnpaid}`} subtitle={`${unpaidPayments.length} pending`} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary border border-surface-border rounded-xl w-fit">
        {([{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }] as const).map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.value ? 'bg-primary text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'}`}
          >
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
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-surface-border">
            {displayPayments.map(payment => {
              const walkDate = getWalkDate(payment.walkId);
              return (
                <div key={payment.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{getWalkerName(payment.walkerId)}</span>
                    <PaymentBadge status={payment.status} />
                  </div>
                  <div className="flex justify-between text-xs text-ink-secondary">
                    <span>{getDogName(payment.walkId)}</span>
                    <span className="font-semibold text-ink">ZMW {payment.amount}</span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {walkDate ? format(new Date(walkDate), 'MMM d, yyyy') : payment.date}
                  </div>
                  {tab === 'paid' && payment.paidAt && (
                    <div className="text-xs text-ink-muted">Paid: {format(new Date(payment.paidAt), 'MMM d, yyyy')}</div>
                  )}
                  {tab === 'unpaid' && (
                    <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => markPaymentPaid(payment.id)} fullWidth>Mark Paid</Button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Walker</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Dog</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Walk Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Status</th>
                  {tab === 'paid' && <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Paid On</th>}
                  {tab === 'unpaid' && <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {displayPayments.map(payment => {
                  const walkDate = getWalkDate(payment.walkId);
                  const walkerName = getWalkerName(payment.walkerId);
                  return (
                    <tr key={payment.id} className="hover:bg-surface-secondary transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-info-light flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-info-dark">{getInitials(walkerName)}</span>
                          </div>
                          <span className="text-sm font-medium text-ink">{walkerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink">{getDogName(payment.walkId)}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-secondary whitespace-nowrap">
                        {walkDate ? format(new Date(walkDate), 'MMM d, yyyy') : payment.date}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-ink">ZMW {payment.amount}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentBadge status={payment.status} />
                      </td>
                      {tab === 'paid' && (
                        <td className="px-5 py-3.5 text-sm text-ink-secondary">
                          {payment.paidAt ? format(new Date(payment.paidAt), 'MMM d, yyyy') : '—'}
                        </td>
                      )}
                      {tab === 'unpaid' && (
                        <td className="px-5 py-3.5">
                          <Button variant="success" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => markPaymentPaid(payment.id)}>
                            Mark Paid
                          </Button>
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
    </div>
  );
}
