import { useState } from 'react';
import { TrendingUp, Users, Activity, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

type Range = '7d' | '30d' | '6m';

function BarChart({ data, height = 120, color = '#2B8A50' }: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 w-full" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group cursor-default relative">
          {d.value > 0 && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d.value}
            </div>
          )}
          <div
            className="w-full rounded-t-md"
            style={{
              height: `${(d.value / max) * (height - 20)}px`,
              minHeight: d.value > 0 ? 3 : 2,
              background: d.value > 0 ? color : '#E5E7EB',
              marginTop: 'auto',
            }}
          />
          <span className="text-[9px] text-ink-muted leading-none truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, sg) => s + sg.value, 0);
  if (total === 0) return <div className="text-center text-sm text-ink-muted py-4">No data</div>;

  let cumulative = 0;
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
        {segments.map(seg => {
          if (seg.value === 0) return null;
          const pct = seg.value / total;
          const dash = pct * CIRCUMFERENCE;
          const offset = CIRCUMFERENCE * (1 - cumulative);
          cumulative += pct;
          return (
            <circle key={seg.label} cx="50" cy="50" r={RADIUS}
              fill="none" stroke={seg.color} strokeWidth="18"
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset + CIRCUMFERENCE}
            />
          );
        })}
      </svg>
      <div className="flex flex-col gap-2">
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
            <div>
              <span className="text-xs font-semibold text-ink">{seg.label}</span>
              <span className="text-xs text-ink-muted ml-1.5">{seg.value} ({Math.round((seg.value / total) * 100)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { data } = useApp();
  const [range, setRange] = useState<Range>('7d');

  const now = new Date();

  // Revenue chart data
  const revenueData = range === '7d'
    ? Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const ds = format(d, 'yyyy-MM-dd');
        return { label: format(d, 'EEE'), value: data.walks.filter(w => w.status === 'completed' && w.scheduledDate.startsWith(ds)).reduce((s, w) => s + w.price, 0) };
      })
    : range === '30d'
    ? Array.from({ length: 30 }, (_, i) => {
        const d = subDays(now, 29 - i);
        const ds = format(d, 'yyyy-MM-dd');
        return { label: format(d, 'd'), value: data.walks.filter(w => w.status === 'completed' && w.scheduledDate.startsWith(ds)).reduce((s, w) => s + w.price, 0) };
      })
    : Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(now, 5 - i);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        return {
          label: format(m, 'MMM'),
          value: data.walks.filter(w => w.status === 'completed' && isWithinInterval(new Date(w.scheduledDate), { start, end })).reduce((s, w) => s + w.price, 0),
        };
      });

  // Walks count chart
  const walksData = range === '7d'
    ? Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const ds = format(d, 'yyyy-MM-dd');
        return { label: format(d, 'EEE'), value: data.walks.filter(w => w.scheduledDate.startsWith(ds)).length };
      })
    : range === '30d'
    ? Array.from({ length: 30 }, (_, i) => {
        const d = subDays(now, 29 - i);
        const ds = format(d, 'yyyy-MM-dd');
        return { label: format(d, 'd'), value: data.walks.filter(w => w.scheduledDate.startsWith(ds)).length };
      })
    : Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(now, 5 - i);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        return { label: format(m, 'MMM'), value: data.walks.filter(w => isWithinInterval(new Date(w.scheduledDate), { start, end })).length };
      });

  const totalRevenue = revenueData.reduce((s, d) => s + d.value, 0);
  const totalWalks = walksData.reduce((s, d) => s + d.value, 0);

  // Walk status breakdown
  const walkStatuses = [
    { label: 'Completed', value: data.walks.filter(w => w.status === 'completed').length, color: '#2B8A50' },
    { label: 'Active',    value: data.walks.filter(w => w.status === 'active').length,    color: '#52B788' },
    { label: 'Assigned',  value: data.walks.filter(w => w.status === 'assigned').length,  color: '#60A5FA' },
    { label: 'Pending',   value: data.walks.filter(w => w.status === 'pending').length,   color: '#F59E0B' },
    { label: 'Cancelled', value: data.walks.filter(w => w.status === 'cancelled').length, color: '#EF4444' },
  ];

  // Walker leaderboard
  const leaderboard = data.users
    .filter(u => u.role === 'walker')
    .map(w => {
      const completed = data.walks.filter(wk => wk.walkerId === w.id && wk.status === 'completed').length;
      const earned = data.payments.filter(p => p.walkerId === w.id && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const rating = 4.5 + Math.random() * 0.5; // placeholder
      return { ...w, completed, earned, rating: Math.round(rating * 10) / 10 };
    })
    .sort((a, b) => b.completed - a.completed);

  const RANGE_OPTS: { value: Range; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '6m', label: '6 Months' },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-7 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <p className="text-white/70 text-xs font-medium mb-1">Admin · Insights</p>
        <h1 className="text-2xl font-extrabold text-white mb-4">Analytics</h1>
        {/* Range selector */}
        <div className="flex gap-1 bg-white/20 rounded-xl p-1 w-fit">
          {RANGE_OPTS.map(o => (
            <button key={o.value} onClick={() => setRange(o.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${range === o.value ? 'bg-white text-ink shadow' : 'text-white/80 hover:text-white'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: DollarSign, label: 'Revenue', value: `K${totalRevenue.toLocaleString()}`, sub: `${range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 6 months'}`, up: true },
            { icon: Activity, label: 'Walks', value: totalWalks, sub: 'Booked in period', up: totalWalks > 0 },
            { icon: Users, label: 'Active Walkers', value: data.users.filter(u => u.role === 'walker').length, sub: `${data.users.filter(u => u.role === 'owner').length} owners` },
            { icon: TrendingUp, label: 'Avg / Walk', value: totalWalks ? `K${Math.round(totalRevenue / totalWalks)}` : 'K0', sub: 'Revenue per walk' },
          ].map(({ icon: Icon, label, value, sub, up }) => (
            <div key={label} className="bg-white border border-surface-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <Icon className="w-4 h-4" style={{ color: '#2B8A50' }} />
                </div>
                {up !== undefined && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-success' : 'text-danger'}`}>
                    {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  </span>
                )}
              </div>
              <p className="text-xl font-extrabold text-ink">{value}</p>
              <p className="text-xs font-semibold text-ink mt-0.5">{label}</p>
              <p className="text-[11px] text-ink-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <h2 className="font-bold text-ink mb-1">Revenue</h2>
          <p className="text-xs text-ink-muted mb-4">K{totalRevenue.toLocaleString()} earned in period</p>
          <BarChart data={revenueData} height={120} color="url(#greenGrad)" />
        </div>

        {/* Walks booked chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <h2 className="font-bold text-ink mb-1">Walks Booked</h2>
          <p className="text-xs text-ink-muted mb-4">{totalWalks} walks in period</p>
          <BarChart data={walksData} height={100} color="#52B788" />
        </div>

        {/* Walk status donut */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <h2 className="font-bold text-ink mb-4">Walk Status Breakdown</h2>
          <DonutChart segments={walkStatuses} />
        </div>

        {/* Walker leaderboard */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="font-bold text-ink">Walker Leaderboard</h2>
            <p className="text-xs text-ink-muted mt-0.5">Ranked by completed walks</p>
          </div>
          {leaderboard.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-muted">No walkers registered yet</div>
          ) : (
            <div className="divide-y divide-surface-border">
              {leaderboard.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-7 h-7 rounded-xl text-xs font-extrabold flex items-center justify-center shrink-0"
                    style={{
                      background: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#EBF5EF',
                      color: i < 3 ? 'white' : '#1B4332',
                    }}>
                    {i + 1}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                    style={{ background: '#1B4332' }}>
                    {w.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{w.name}</p>
                    <p className="text-xs text-ink-muted">{w.completed} walks · K{w.earned} earned</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-500">★ {w.rating}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">{w.completed} walks</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
