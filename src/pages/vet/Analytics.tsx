import { useState } from 'react';
import { format, parseISO, subDays, isAfter, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, CheckCircle2, Clock, XCircle, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const SERVICE_ICON: Record<string, string> = {
  'General Checkup': '🩺',
  'Vaccination':     '💉',
  'Dental Care':     '🦷',
  'Deworming':       '💊',
  'Emergency Visit': '🚨',
};
const SERVICE_COLOR: Record<string, string> = {
  'General Checkup': '#2B8A50',
  'Vaccination':     '#0891B2',
  'Dental Care':     '#7C3AED',
  'Deworming':       '#B45309',
  'Emergency Visit': '#DC2626',
};

function parseVetNote(notes: string) {
  const lines   = notes.split('\n');
  return lines[0]?.replace('VET BOOKING: ', '') ?? '';
}

type Range = '7d' | '30d' | 'month' | 'all';

export default function VetAnalytics() {
  const { data } = useApp();
  const [range, setRange] = useState<Range>('30d');

  const allVetWalks = data.walks.filter(w => w.notes?.startsWith('VET BOOKING:'));

  const now = new Date();
  const filtered = allVetWalks.filter(w => {
    const d = parseISO(w.scheduledDate);
    if (range === '7d')    return isAfter(d, subDays(now, 7));
    if (range === '30d')   return isAfter(d, subDays(now, 30));
    if (range === 'month') return d >= startOfMonth(now) && d <= endOfMonth(now);
    return true;
  });

  const completed  = filtered.filter(w => w.status === 'completed');
  const pending    = filtered.filter(w => w.status === 'pending');
  const cancelled  = filtered.filter(w => w.status === 'cancelled');
  const totalRev   = completed.reduce((s, w) => s + w.price, 0);
  const avgRev     = completed.length > 0 ? Math.round(totalRev / completed.length) : 0;

  // Service breakdown
  const byService = filtered.reduce<Record<string, { count: number; revenue: number }>>((acc, w) => {
    const svc = parseVetNote(w.notes || '');
    if (!acc[svc]) acc[svc] = { count: 0, revenue: 0 };
    acc[svc].count++;
    if (w.status === 'completed') acc[svc].revenue += w.price;
    return acc;
  }, {});

  const serviceList = Object.entries(byService).sort((a, b) => b[1].count - a[1].count);
  const maxCount    = serviceList.reduce((m, [, v]) => Math.max(m, v.count), 1);

  // Daily revenue for last 7 days (bar chart)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day   = subDays(now, 6 - i);
    const label = format(day, 'EEE');
    const rev   = allVetWalks
      .filter(w => w.status === 'completed' && format(parseISO(w.scheduledDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
      .reduce((s, w) => s + w.price, 0);
    return { label, rev };
  });
  const maxBar = last7.reduce((m, d) => Math.max(m, d.rev), 1);

  const RANGES: { key: Range; label: string }[] = [
    { key: '7d',    label: '7 days'     },
    { key: '30d',   label: '30 days'    },
    { key: 'month', label: 'This month' },
    { key: 'all',   label: 'All time'   },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-extrabold text-ink">Analytics</h1>
        <p className="text-ink-muted text-sm mt-0.5">Revenue and appointment performance</p>
      </div>

      {/* Range filter */}
      <div className="px-4 mb-5">
        <div className="flex gap-1.5 p-1 bg-surface-secondary border border-surface-border rounded-xl">
          {RANGES.map(r => (
            <button key={r.key} type="button" onClick={() => setRange(r.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                range === r.key ? 'text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-hover'
              }`}
              style={range === r.key ? { background: 'linear-gradient(135deg,#0F766E,#0891B2)' } : {}}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: DollarSign,   label: 'Revenue',     value: `K${totalRev}`,        color: '#0F766E', bg: '#F0FDFA' },
          { icon: CheckCircle2, label: 'Completed',   value: completed.length,      color: '#0891B2', bg: '#EFF6FF' },
          { icon: Clock,        label: 'Pending',     value: pending.length,        color: '#D97706', bg: '#FFFBEB' },
          { icon: TrendingUp,   label: 'Avg per Appt',value: `K${avgRev}`,         color: '#7C3AED', bg: '#F5F3FF' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white border border-surface-border rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-xl font-extrabold text-ink">{value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue bar chart (last 7 days) */}
      <div className="mx-4 mb-5 bg-white border border-surface-border rounded-2xl p-4">
        <p className="text-sm font-bold text-ink mb-4">Daily Revenue (last 7 days)</p>
        <div className="flex items-end gap-2 h-28">
          {last7.map(({ label, rev }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-ink-muted">{rev > 0 ? `K${rev}` : ''}</span>
              <div className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max((rev / maxBar) * 80, rev > 0 ? 4 : 2)}px`,
                  background: rev > 0 ? 'linear-gradient(180deg,#0891B2,#0F766E)' : '#E5E7EB',
                  minHeight: 2,
                }} />
              <span className="text-[10px] text-ink-muted font-semibold">{label}</span>
            </div>
          ))}
        </div>
        {totalRev === 0 && (
          <p className="text-xs text-ink-muted text-center mt-2">No revenue data for this period</p>
        )}
      </div>

      {/* Service breakdown */}
      <div className="mx-4 bg-white border border-surface-border rounded-2xl p-4">
        <p className="text-sm font-bold text-ink mb-4">By Service Type</p>
        {serviceList.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-4">No appointment data for this period</p>
        ) : (
          <div className="space-y-4">
            {serviceList.map(([svc, { count, revenue }]) => {
              const color = SERVICE_COLOR[svc] ?? '#0891B2';
              return (
                <div key={svc}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink flex items-center gap-2">
                      <span>{SERVICE_ICON[svc] ?? '🏥'}</span> {svc}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-ink">{count}</span>
                      <span className="text-xs text-ink-muted ml-2">K{revenue}</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status summary */}
      <div className="mx-4 mt-4 bg-white border border-surface-border rounded-2xl p-4">
        <p className="text-sm font-bold text-ink mb-3">Status Summary</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed', count: completed.length,  color: '#0891B2', icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: 'Pending',   count: pending.length,    color: '#D97706', icon: <Clock className="w-4 h-4" /> },
            { label: 'Cancelled', count: cancelled.length,  color: '#DC2626', icon: <XCircle className="w-4 h-4" /> },
          ].map(({ label, count, color, icon }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-surface-border">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
                {icon}
              </div>
              <p className="text-lg font-extrabold text-ink">{count}</p>
              <p className="text-[10px] text-ink-muted font-medium">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-surface-border flex justify-between items-center">
          <span className="text-xs text-ink-muted">Completion rate</span>
          <span className="text-sm font-bold" style={{ color: '#0F766E' }}>
            {filtered.length > 0 ? Math.round((completed.length / filtered.length) * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
