import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, Users, Dog, MapPin, ShoppingBag,
  PlusCircle, ArrowRight, AlertCircle, BarChart2, CreditCard,
  UserCog, ListChecks, Bell, Clock, Store, MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { format, subDays } from 'date-fns';

function BarChart({ data, height = 96 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
          <div className="relative w-full flex items-end justify-center">
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
          </div>
          <span className="text-[10px] text-ink-muted leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: '/admin/create-walk',    icon: PlusCircle,    label: 'New Walk',    bg: '#1B4332', fg: 'white' },
  { to: '/admin/walkers',        icon: UserCog,       label: 'Walkers',     bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/map',            icon: MapPin,        label: 'Live Map',    bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/shop',           icon: ShoppingBag,   label: 'Shop',        bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/payments',       icon: CreditCard,    label: 'Payments',    bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/analytics',      icon: BarChart2,     label: 'Analytics',   bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/owners',         icon: Users,         label: 'Owners',      bg: '#EBF5EF', fg: '#1B4332' },
  { to: '/admin/notifications',  icon: Bell,          label: 'Alerts',      bg: '#EBF5EF', fg: '#1B4332' },
];

export default function AdminDashboard() {
  const { currentUser, data } = useApp();
  const [chartRange] = useState<'7d' | '30d'>('7d');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || '';

  const activeWalks   = data.walks.filter(w => w.status === 'active');
  const pendingWalks  = data.walks.filter(w => w.status === 'pending').length;
  const totalRevenue  = data.walks.filter(w => w.status === 'completed').reduce((s, w) => s + w.price, 0);
  const walkerCount   = data.users.filter(u => u.role === 'walker' && (!u.walkerStatus || u.walkerStatus === 'active')).length;
  const pendingWalkers = data.users.filter(u => u.role === 'walker' && u.walkerStatus === 'pending_approval').length;
  const ownerCount    = data.users.filter(u => u.role === 'owner').length;
  const shopOwnerCount = data.users.filter(u => u.role === 'shopowner').length;
  const adminCount    = data.users.filter(u => u.role === 'admin').length;
  const totalUsers    = data.users.length;
  const unpaidTotal   = data.payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);
  const unreadNotifs  = data.notifications.filter(n => n.userId === currentUser?.id && !n.read).length;

  // 7-day revenue chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const ds = format(d, 'yyyy-MM-dd');
    const rev = data.walks
      .filter(w => w.status === 'completed' && w.scheduledDate.startsWith(ds))
      .reduce((s, w) => s + w.price, 0);
    return { label: format(d, 'EEE'), value: rev };
  });

  const recentWalks = [...data.walks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const topWalkers = data.users
    .filter(u => u.role === 'walker')
    .map(w => ({
      ...w,
      completed: data.walks.filter(wk => wk.walkerId === w.id && wk.status === 'completed').length,
      earned: data.payments.filter(p => p.walkerId === w.id).reduce((s, p) => s + p.amount, 0),
      isActive: activeWalks.some(wk => wk.walkerId === w.id),
    }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto pb-6">
      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-8 pb-8 mb-6"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="text-white">
              <p className="text-sm text-white/70 font-medium mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
              <h1 className="text-2xl font-extrabold">{greeting}, {firstName} 👋</h1>
              <p className="text-white/75 text-sm mt-1">Here's your app at a glance</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/admin/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30 transition-colors">
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-danger text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </Link>
              <Link to="/admin/analytics" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur text-white hover:bg-white/30 transition-colors">
                <BarChart2 className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { label: 'Live Now', value: activeWalks.length, accent: '#52B788' },
              { label: 'Pending', value: pendingWalks, accent: '#F59E0B' },
              { label: 'Walkers', value: walkerCount, accent: '#60A5FA' },
              { label: 'Owners', value: ownerCount, accent: '#A78BFA' },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/70 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Unpaid alert */}
        {unpaidTotal > 0 && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-bold">K{unpaidTotal.toLocaleString()}</span> unpaid to walkers
            </p>
            <Link to="/admin/payments" className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              Pay now <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Platform Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">Platform Overview</h2>
            <span className="text-[11px] text-ink-muted">{totalUsers} total users</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: UserCog, label: 'Active Walkers', value: walkerCount, sub: pendingWalkers > 0 ? `${pendingWalkers} pending` : 'all approved', color: '#1B4332', bg: '#EBF5EF', link: '/admin/walkers' },
              { icon: Users, label: 'Dog Owners', value: ownerCount, sub: `${data.dogs.length} dogs`, color: '#3B82F6', bg: '#EFF6FF', link: '/admin/owners' },
              { icon: Store, label: 'Shop Owners', value: shopOwnerCount, sub: 'active stores', color: '#7C3AED', bg: '#F5F3FF', link: '/admin/shop' },
              { icon: Bell, label: 'Notifications', value: unreadNotifs, sub: `${data.notifications.length} total`, color: unreadNotifs > 0 ? '#EF4444' : '#6B7280', bg: unreadNotifs > 0 ? '#FEF2F2' : '#F9FAFB', link: '/admin/notifications' },
            ].map(({ icon: Icon, label, value, sub, color, bg, link }) => (
              <Link key={label} to={link}
                className="bg-white border border-surface-border rounded-2xl p-4 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-xl font-extrabold text-ink">{value}</p>
                <p className="text-xs font-semibold text-ink mt-0.5">{label}</p>
                <p className="text-[11px] text-ink-muted">{sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Walker applications alert */}
        {pendingWalkers > 0 && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-bold">{pendingWalkers}</span> walker {pendingWalkers === 1 ? 'application' : 'applications'} awaiting review
            </p>
            <Link to="/admin/walkers" className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-bold text-ink mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ to, icon: Icon, label, bg, fg }) => (
              <Link key={to} to={to}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl border border-surface-border hover:shadow-md transition-all active:scale-95"
                style={{ background: bg === '#1B4332' ? undefined : '#FAFAFA' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: bg, color: fg }}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-ink-secondary leading-tight text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-ink">Revenue</h2>
              <p className="text-xs text-ink-muted mt-0.5">Last 7 days · K{chartData.reduce((s, d) => s + d.value, 0).toLocaleString()} total</p>
            </div>
            <Link to="/admin/analytics" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <BarChart data={chartData} height={110} />
        </div>

        {/* Active walks + top walkers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active walks */}
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <h2 className="font-bold text-ink text-sm">Live Walks</h2>
                <span className="text-xs bg-success/10 text-success font-bold px-2 py-0.5 rounded-full">{activeWalks.length}</span>
              </div>
              <Link to="/admin/map" className="text-xs text-primary font-semibold hover:underline">Map →</Link>
            </div>
            <div className="divide-y divide-surface-border">
              {activeWalks.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                  <p className="text-sm text-ink-muted">No active walks right now</p>
                </div>
              ) : activeWalks.slice(0, 4).map(walk => {
                const dog = data.dogs.find(d => d.id === walk.dogId);
                const walker = data.users.find(u => u.id === walk.walkerId);
                return (
                  <div key={walk.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center text-sm shrink-0">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt="" className="w-8 h-8 rounded-xl object-cover" /> : '🐕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{dog?.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">{walker?.name || 'Unassigned'}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top walkers */}
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <h2 className="font-bold text-ink text-sm">Top Walkers</h2>
              <Link to="/admin/walkers" className="text-xs text-primary font-semibold hover:underline">All →</Link>
            </div>
            <div className="divide-y divide-surface-border">
              {topWalkers.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                  <p className="text-sm text-ink-muted">No walkers yet</p>
                </div>
              ) : topWalkers.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: i === 0 ? '#F59E0B' : '#EBF5EF', color: i === 0 ? 'white' : '#1B4332' }}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                    style={{ background: '#1B4332' }}>
                    {w.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-ink truncate">{w.name}</p>
                      {w.isActive && <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />}
                    </div>
                    <p className="text-[11px] text-ink-muted">{w.completed} walks · K{w.earned}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent walks */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <h2 className="font-bold text-ink text-sm">Recent Walks</h2>
            <Link to="/admin/walks" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-surface-border">
            {recentWalks.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-muted">
                No walks yet. <Link to="/admin/create-walk" className="text-primary hover:underline">Create one.</Link>
              </div>
            ) : recentWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              const owner = data.users.find(u => u.id === walk.ownerId);
              return (
                <div key={walk.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-base shrink-0 overflow-hidden">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover" /> : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{dog?.name} <span className="font-normal text-ink-muted text-xs">· {dog?.breed}</span></p>
                    <p className="text-xs text-ink-muted truncate">{owner?.name} → {walker?.name || 'Unassigned'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusBadge status={walk.status} />
                    <p className="text-[10px] text-ink-muted mt-1">{format(new Date(walk.scheduledDate), 'MMM d')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: TrendingUp, label: 'Total Revenue', value: `K${totalRevenue.toLocaleString()}`, sub: 'All time', color: '#1B4332' },
            { icon: Dog, label: 'Dogs Registered', value: data.dogs.length, sub: `${ownerCount} owners`, color: '#52B788' },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-white border border-surface-border rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#EBF5EF' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-xl font-extrabold text-ink">{value}</p>
              <p className="text-xs font-semibold text-ink mt-0.5">{label}</p>
              <p className="text-[11px] text-ink-muted">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
