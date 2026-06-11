import { useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  TrendingUp, Users, DollarSign, Star, Activity,
  Dog, ShoppingBag, Shield, UserCheck, Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function StatTile({
  icon, label, value, sub, color,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-2xl p-4 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-xs font-semibold text-ink-secondary mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ProfitManagement() {
  const { data } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'walks' | 'ratings'>('overview');

  // ── Computed stats ─────────────────────────────────────────
  const admins     = data.users.filter(u => u.role === 'admin');
  const walkers    = data.users.filter(u => u.role === 'walker');
  const activeWalkers = walkers.filter(u => u.walkerStatus === 'active' || !u.walkerStatus);
  const pendingWalkers = walkers.filter(u => u.walkerStatus === 'pending_approval');
  const owners     = data.users.filter(u => u.role === 'owner');
  const shopOwners = data.users.filter(u => u.role === 'shopowner');
  const totalUsers = data.users.length;

  const completedWalks = data.walks.filter(w => w.status === 'completed');
  const activeWalks    = data.walks.filter(w => w.status === 'active');
  const pendingWalks   = data.walks.filter(w => w.status === 'pending');

  const totalRevenue   = data.payments.reduce((s, p) => s + p.amount, 0);
  const paidRevenue    = data.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const unpaidRevenue  = data.payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);

  const ratedWalks  = completedWalks.filter(w => w.rating);
  const avgRating   = ratedWalks.length
    ? (ratedWalks.reduce((s, w) => s + (w.rating || 0), 0) / ratedWalks.length).toFixed(1)
    : '—';

  // Last 7 days walk activity
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d  = subDays(new Date(), 6 - i);
    const ds = format(d, 'yyyy-MM-dd');
    const count = completedWalks.filter(w => w.scheduledDate.startsWith(ds)).length;
    return { label: format(d, 'EEE'), count };
  });
  const maxCount = Math.max(...last7.map(d => d.count), 1);

  // Recent activity (last 10 walks)
  const recentActivity = [...data.walks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-ink">Profit Management</h1>
        <p className="text-ink-secondary mt-1">Full platform overview — revenue, users, activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary border border-surface-border rounded-xl w-fit overflow-x-auto">
        {(['overview','users','walks','ratings'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap capitalize ${
              activeTab === t ? 'bg-primary text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Revenue cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<TrendingUp className="w-5 h-5 text-white" />} label="Total Revenue" value={`K${totalRevenue.toLocaleString()}`} sub={`${data.payments.length} payments`} color="bg-primary" />
            <StatTile icon={<DollarSign className="w-5 h-5 text-white" />} label="Paid Out" value={`K${paidRevenue.toLocaleString()}`} sub="Confirmed" color="bg-success" />
            <StatTile icon={<Clock className="w-5 h-5 text-white" />} label="Pending" value={`K${unpaidRevenue.toLocaleString()}`} sub="Awaiting payment" color="bg-amber-500" />
            <StatTile icon={<Activity className="w-5 h-5 text-white" />} label="Completed Walks" value={completedWalks.length} sub={`${activeWalks.length} active now`} color="bg-blue-500" />
          </div>

          {/* User counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<Shield className="w-5 h-5 text-white" />} label="Admins" value={admins.length} color="bg-violet-600" />
            <StatTile icon={<UserCheck className="w-5 h-5 text-white" />} label="Walkers" value={activeWalkers.length} sub={pendingWalkers.length > 0 ? `+${pendingWalkers.length} pending` : undefined} color="bg-primary" />
            <StatTile icon={<Users className="w-5 h-5 text-white" />} label="Dog Owners" value={owners.length} color="bg-teal-600" />
            <StatTile icon={<ShoppingBag className="w-5 h-5 text-white" />} label="Shop Owners" value={shopOwners.length} color="bg-orange-500" />
          </div>

          {/* Walk activity chart */}
          <div className="bg-white border border-surface-border rounded-2xl p-5">
            <h2 className="font-bold text-ink mb-1">Walk Activity — Last 7 Days</h2>
            <p className="text-xs text-ink-muted mb-5">Completed walks per day</p>
            <div className="flex items-end gap-2" style={{ height: 100 }}>
              {last7.map(d => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${(d.count / maxCount) * 76}px`,
                      minHeight: d.count > 0 ? 4 : 2,
                      background: d.count > 0 ? 'linear-gradient(180deg,#2B8A50,#1B4332)' : '#E5E7EB',
                    }} />
                  <span className="text-[10px] text-ink-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform health */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-surface-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-ink">{totalUsers}</p>
              <p className="text-xs font-semibold text-ink-secondary mt-1">Total Users</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-ink">{data.dogs.length}</p>
              <p className="text-xs font-semibold text-ink-secondary mt-1">Registered Dogs</p>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-ink">{avgRating} <span className="text-amber-400">★</span></p>
              <p className="text-xs font-semibold text-ink-secondary mt-1">Avg Walker Rating</p>
              <p className="text-[10px] text-ink-muted">{ratedWalks.length} reviews</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {[
            { role: 'Admin', icon: '🛡️', users: admins },
            { role: 'Walker', icon: '🦮', users: walkers },
            { role: 'Dog Owner', icon: '🐾', users: owners },
            { role: 'Shop Owner', icon: '🛍️', users: shopOwners },
          ].map(({ role, icon, users }) => (
            <div key={role} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <p className="font-bold text-ink">{role}s</p>
                </div>
                <span className="text-sm font-bold text-primary">{users.length}</span>
              </div>
              {users.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">None registered yet.</p>
              ) : (
                <div className="divide-y divide-surface-border">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center shrink-0">
                        {u.imageUrl
                          ? <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-bold text-primary">{u.name[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{u.name}</p>
                        <p className="text-xs text-ink-muted truncate">{u.phone}{u.email ? ` · ${u.email}` : ''}</p>
                      </div>
                      {u.walkerStatus && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          u.walkerStatus === 'active' ? 'bg-success/10 text-success' :
                          u.walkerStatus === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                          'bg-danger/10 text-danger'
                        }`}>
                          {u.walkerStatus === 'pending_approval' ? 'Pending' : u.walkerStatus}
                        </span>
                      )}
                      <p className="text-xs text-ink-muted whitespace-nowrap">{format(new Date(u.createdAt), 'MMM d, yy')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'walks' && (
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border">
            <p className="font-bold text-ink">All Walk Records</p>
            <p className="text-xs text-ink-muted">{data.walks.length} total</p>
          </div>
          <div className="divide-y divide-surface-border">
            {recentActivity.map(walk => {
              const dog    = data.dogs.find(d => d.id === walk.dogId);
              const owner  = data.users.find(u => u.id === walk.ownerId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              const statusColors: Record<string, string> = {
                completed: 'text-success bg-success/10',
                active: 'text-blue-600 bg-blue-50',
                assigned: 'text-amber-600 bg-amber-50',
                pending: 'text-ink-muted bg-surface-secondary',
                cancelled: 'text-danger bg-danger/10',
              };
              return (
                <div key={walk.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-secondary/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt="" className="w-full h-full object-cover" /> : <span>🐕</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{dog?.name || 'Unknown dog'}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {owner?.name || '—'} → {walker?.name || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${statusColors[walk.status] || ''}`}>
                      {walk.status}
                    </span>
                    <p className="text-[10px] text-ink-muted mt-0.5">{format(new Date(walk.scheduledDate), 'MMM d')}</p>
                  </div>
                  {walk.rating && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-ink">{walk.rating}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ratings' && (
        <div className="space-y-3">
          {ratedWalks.length === 0 ? (
            <div className="bg-white border border-surface-border rounded-2xl p-16 text-center">
              <Star className="w-10 h-10 text-ink-muted mx-auto mb-3" />
              <p className="font-medium text-ink">No ratings yet</p>
              <p className="text-sm text-ink-muted mt-1">Owner ratings will appear here after walks are completed.</p>
            </div>
          ) : (
            ratedWalks.sort((a, b) => (b.rating || 0) - (a.rating || 0)).map(walk => {
              const walker = data.users.find(u => u.id === walk.walkerId);
              const owner  = data.users.find(u => u.id === walk.ownerId);
              const dog    = data.dogs.find(d => d.id === walk.dogId);
              return (
                <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink text-sm">{walker?.name || 'Walker'}</p>
                      <p className="text-xs text-ink-muted">{dog?.name} · {owner?.name}</p>
                      <p className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= (walk.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-surface-border fill-surface-border'}`} />
                      ))}
                    </div>
                  </div>
                  {walk.ratingComment && (
                    <p className="mt-2 text-sm text-ink-secondary italic bg-surface-secondary rounded-xl px-3 py-2">
                      "{walk.ratingComment}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
