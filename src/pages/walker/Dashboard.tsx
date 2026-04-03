import React from 'react';
import { Link } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { CheckCircle, DollarSign, Clock, ArrowRight, Flame, Star, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';

export default function WalkerDashboard() {
  const { data, currentUser, getWalkerStats } = useApp();

  const myWalks = data.walks.filter(w => w.walkerId === currentUser?.id);
  const myPayments = data.payments.filter(p => p.walkerId === currentUser?.id);

  const todayWalks = myWalks.filter(w => isToday(new Date(w.scheduledDate)) && (w.status === 'assigned' || w.status === 'active'));
  const completedToday = myWalks.filter(w => w.status === 'completed' && w.endTime && isToday(new Date(w.endTime)));
  const activeWalk = myWalks.find(w => w.status === 'active');

  const totalEarned = myPayments.reduce((s, p) => s + p.amount, 0);
  const unpaidBalance = myPayments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  const gamStats = getWalkerStats(currentUser?.id || '');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || '';

  // Level calculation
  const getLevel = (pts: number) => {
    if (pts >= 1000) return { name: 'Expert', next: null, progress: 100 };
    if (pts >= 500) return { name: 'Professional', next: 1000, progress: ((pts - 500) / 500) * 100 };
    if (pts >= 200) return { name: 'Junior', next: 500, progress: ((pts - 200) / 300) * 100 };
    return { name: 'Rookie', next: 200, progress: (pts / 200) * 100 };
  };
  const level = getLevel(gamStats.points);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{greeting}, {firstName} 🐾</h1>
          <p className="text-ink-secondary mt-1">{format(new Date(), 'EEEE, MMMM d')} — Here's your day</p>
        </div>
        {gamStats.streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning-light border border-warning/30">
            <Flame className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning-dark">{gamStats.streak} day streak!</span>
          </div>
        )}
      </div>

      {/* Active Walk Banner */}
      {activeWalk && (
        <div className="flex items-center gap-4 px-4 py-4 bg-success-light border border-success/30 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-success pulse-dot shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-dark">
                Walk in Progress — {data.dogs.find(d => d.id === activeWalk.dogId)?.name}
              </p>
              <p className="text-xs text-success/70">
                Started {activeWalk.startTime ? format(new Date(activeWalk.startTime), 'h:mm a') : 'now'}
              </p>
            </div>
          </div>
          <Link to="/walker/walks" className="ml-auto">
            <Button variant="success" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>Manage</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Completed Today" value={completedToday.length} subtitle={`${todayWalks.length} remaining`} color="green" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Earned" value={`ZMW ${totalEarned}`} color="blue" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Unpaid Balance" value={`ZMW ${unpaidBalance}`} color="amber" subtitle="Awaiting payment" />
        <StatCard icon={<Star className="w-5 h-5" />} label="Points" value={gamStats.points} color="violet" subtitle={level.name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Walks */}
        <div className="bg-white border border-surface-border rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-ink">Today's Walks</h2>
            <Link to="/walker/walks" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {todayWalks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                <p className="text-ink-muted text-sm">No more walks today</p>
              </div>
            ) : todayWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              return (
                <Link key={walk.id} to="/walker/walks" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-9 h-9 object-cover" /> : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{dog?.name}</p>
                    <p className="text-xs text-ink-muted">{data.users.find(u => u.id === walk.ownerId)?.name}</p>
                  </div>
                  <StatusBadge status={walk.status} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white border border-surface-border rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-ink">Upcoming Walks</h2>
            <span className="text-xs text-ink-muted">{upcomingWalks.length} scheduled</span>
          </div>
          <div className="p-3 space-y-2">
            {upcomingWalks.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                <p className="text-ink-muted text-sm">No upcoming walks</p>
              </div>
            ) : upcomingWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              return (
                <div key={walk.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">🐕</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{dog?.name}</p>
                    <p className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'MMM d, h:mm a')}</p>
                  </div>
                  <StatusBadge status={walk.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Points / Gamification preview */}
      <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-ink">Your Progress</h2>
            <p className="text-sm text-ink-secondary mt-0.5">{level.name} · {gamStats.points} points</p>
          </div>
          <Link to="/walker/badges">
            <Button variant="ghost" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>View Badges</Button>
          </Link>
        </div>
        {level.next && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-ink-muted mb-1.5">
              <span>{level.name}</span>
              <span>{level.next - gamStats.points} pts to next level</span>
            </div>
            <ProgressBar value={level.progress} />
          </div>
        )}
        {gamStats.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {gamStats.badges.slice(0, 4).map(badge => (
              <span key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border text-xs font-medium text-ink">
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
