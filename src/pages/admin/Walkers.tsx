import React from 'react';
import { Phone, CheckCircle, DollarSign, AlertCircle, Activity, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';

export default function AdminWalkers() {
  const { data, getWalkerStats } = useApp();
  const walkers = data.users.filter(u => u.role === 'walker');

  const getStats = (walkerId: string) => {
    const walks = data.walks.filter(w => w.walkerId === walkerId && w.status === 'completed');
    const payments = data.payments.filter(p => p.walkerId === walkerId);
    const totalEarned = payments.reduce((s, p) => s + p.amount, 0);
    const unpaid = payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);
    const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const activeWalk = data.walks.find(w => w.walkerId === walkerId && w.status === 'active');
    return { completedWalks: walks.length, totalEarned, unpaid, paid, activeWalk };
  };

  const totalCompleted = walkers.reduce((s, w) => s + getStats(w.id).completedWalks, 0);
  const totalEarned = walkers.reduce((s, w) => s + getStats(w.id).totalEarned, 0);
  const totalUnpaid = walkers.reduce((s, w) => s + getStats(w.id).unpaid, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Walkers</h1>
        <p className="text-ink-secondary mt-1">{walkers.length} active walkers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Total Completed" value={totalCompleted} color="green" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`ZMW ${totalEarned}`} color="blue" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Total Unpaid" value={`ZMW ${totalUnpaid}`} color="amber" />
      </div>

      {walkers.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <p className="text-ink-muted">No walkers registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {walkers.map(walker => {
            const stats = getStats(walker.id);
            const gamStats = getWalkerStats(walker.id);
            const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

            return (
              <div key={walker.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-info-light flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-info-dark">{getInitials(walker.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink truncate">{walker.name}</h3>
                      {stats.activeWalk && (
                        <span className="flex items-center gap-1 text-xs text-success bg-success-light px-2 py-0.5 rounded-full border border-success/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" /> On Walk
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                      <Phone className="w-3 h-3" /> {walker.phone}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border text-center">
                    <p className="text-xl font-bold text-ink">{stats.completedWalks}</p>
                    <p className="text-xs text-ink-muted mt-0.5">Completed</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success-light border border-success/10 text-center">
                    <p className="text-lg font-bold text-success-dark">{stats.paid}</p>
                    <p className="text-xs text-ink-muted mt-0.5">Paid ZMW</p>
                  </div>
                  <div className="p-3 rounded-xl bg-warning-light border border-warning/10 text-center">
                    <p className="text-lg font-bold text-warning-dark">{stats.unpaid}</p>
                    <p className="text-xs text-ink-muted mt-0.5">Unpaid ZMW</p>
                  </div>
                </div>

                {/* Gamification */}
                <div className="pt-4 border-t border-surface-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Achievements
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-primary">{gamStats.points} pts</span>
                      <span className="text-xs font-semibold text-warning flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> {gamStats.streak}d
                      </span>
                    </div>
                  </div>
                  {gamStats.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {gamStats.badges.map(badge => (
                        <span key={badge.id} className="text-xs px-2 py-1 rounded-lg bg-surface-secondary border border-surface-border" title={badge.description}>
                          {badge.icon} {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted italic">No badges earned yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
