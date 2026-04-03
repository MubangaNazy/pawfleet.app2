import React from 'react';
import { format } from 'date-fns';
import { TrendingUp, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { PaymentBadge } from '../../components/ui/Badge';

export default function WalkerEarnings() {
  const { data, currentUser } = useApp();

  const myPayments = data.payments.filter(p => p.walkerId === currentUser?.id);
  const paidPayments = myPayments.filter(p => p.status === 'paid');
  const unpaidPayments = myPayments.filter(p => p.status === 'unpaid');

  const totalEarned = myPayments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
  const totalUnpaid = unpaidPayments.reduce((s, p) => s + p.amount, 0);

  const myCompletedWalks = data.walks.filter(w => w.walkerId === currentUser?.id && w.status === 'completed');

  const earningsHistory = myCompletedWalks
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .map(walk => ({
      walk,
      payment: myPayments.find(p => p.walkId === walk.id),
      dog: data.dogs.find(d => d.id === walk.dogId),
      owner: data.users.find(u => u.id === walk.ownerId),
    }));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Earnings</h1>
        <p className="text-ink-secondary mt-1">{myCompletedWalks.length} completed walks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Earned" value={`ZMW ${totalEarned}`} subtitle="All time" color="blue" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Total Paid" value={`ZMW ${totalPaid}`} subtitle={`${paidPayments.length} payments`} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Unpaid Balance" value={`ZMW ${totalUnpaid}`} subtitle={`${unpaidPayments.length} awaiting`} color="amber" />
      </div>

      {totalUnpaid > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-warning-light border border-warning/30">
          <Clock className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-dark">ZMW {totalUnpaid} is pending payment</p>
            <p className="text-xs text-ink-secondary mt-0.5">Your admin will process your payment soon.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-ink">Earnings History</h2>
        </div>
        {earningsHistory.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <p className="font-medium text-ink">No earnings yet</p>
            <p className="text-ink-muted text-sm mt-1">Complete walks to start earning</p>
          </div>
        ) : (
          <>
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-surface-border">
            {earningsHistory.map(({ walk, payment, dog, owner }) => (
              <div key={walk.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-8 h-8 object-cover" /> : '🐕'}
                    </div>
                    <span className="font-medium text-sm text-ink">{dog?.name || 'Unknown'}</span>
                  </div>
                  {payment ? <PaymentBadge status={payment.status} /> : <span className="text-ink-muted text-xs">—</span>}
                </div>
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>{owner?.name || 'Unknown'}</span>
                  <span className="font-semibold text-success-dark">ZMW {walk.walkerEarning}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</span>
                  <span>{walk.duration ? `${walk.duration} min` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Dog</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Owner</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Duration</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Earned</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {earningsHistory.map(({ walk, payment, dog, owner }) => (
                  <tr key={walk.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                          {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-8 h-8 object-cover" /> : '🐕'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{dog?.name || 'Unknown'}</p>
                          {dog?.breed && <p className="text-xs text-ink-muted">{dog.breed}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink">{owner?.name || 'Unknown'}</td>
                    <td className="px-5 py-3.5 text-sm text-ink-secondary whitespace-nowrap">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5 text-sm text-ink">{walk.duration ? `${walk.duration} min` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-success-dark">ZMW {walk.walkerEarning}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {payment ? <PaymentBadge status={payment.status} /> : <span className="text-ink-muted text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
