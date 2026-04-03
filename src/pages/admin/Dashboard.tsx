import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, DollarSign, Users, Dog, PlusCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { currentUser, data } = useApp();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || '';

  const activeWalks = data.walks.filter(w => w.status === 'active').length;
  const totalRevenue = data.walks.filter(w => w.status === 'completed').reduce((s, w) => s + w.price, 0);
  const walkers = data.users.filter(u => u.role === 'walker').length;
  const totalDogs = data.dogs.length;
  const unpaidPayments = data.payments.filter(p => p.status === 'unpaid');
  const recentWalks = [...data.walks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{greeting}, {firstName} 👋</h1>
          <p className="text-ink-secondary mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/admin/create-walk">
          <Button icon={<PlusCircle className="w-4 h-4" />}>Create Walk</Button>
        </Link>
      </div>

      {/* Unpaid alert */}
      {unpaidPayments.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-warning-light border border-warning/30 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-sm text-warning-dark flex-1">
            <span className="font-semibold">{unpaidPayments.length} unpaid payment{unpaidPayments.length > 1 ? 's' : ''}</span> — total ZMW {unpaidPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
          </p>
          <Link to="/admin/payments">
            <Button size="sm" variant="outline" className="border-warning/50 text-warning-dark hover:bg-warning-light">View</Button>
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="w-5 h-5" />} label="Active Walks" value={activeWalks} color="green" subtitle="Right now" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Revenue" value={`ZMW ${totalRevenue.toLocaleString()}`} color="blue" subtitle="All time" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Walkers" value={walkers} color="violet" subtitle="Registered" />
        <StatCard icon={<Dog className="w-5 h-5" />} label="Dogs" value={totalDogs} color="amber" subtitle="All breeds" />
      </div>

      {/* Recent walks */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-ink">Recent Walks</h2>
          <Link to="/admin/walks" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-surface-border">
          {recentWalks.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">No walks yet. <Link to="/admin/create-walk" className="text-primary hover:underline">Create one.</Link></div>
          ) : recentWalks.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const walker = data.users.find(u => u.id === walk.walkerId);
            const owner = data.users.find(u => u.id === walk.ownerId);
            return (
              <div key={walk.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-secondary transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-base shrink-0 overflow-hidden">
                  {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-8 h-8 rounded-xl object-cover" /> : '🐕'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{dog?.name} <span className="text-ink-muted font-normal">· {dog?.breed}</span></p>
                  <p className="text-xs text-ink-muted truncate">{owner?.name} → {walker?.name || 'Unassigned'}</p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={walk.status} />
                  <p className="text-xs text-ink-muted mt-1">{format(new Date(walk.scheduledDate), 'MMM d')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
