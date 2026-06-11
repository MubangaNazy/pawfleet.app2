import React, { useState, useMemo } from 'react';
import { format, subDays, startOfDay, isToday, isSameDay } from 'date-fns';
import { TrendingUp, Star, CheckCircle, Calendar, DollarSign, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const RANGE_OPTIONS = [
  { label: 'Today',  days: 1 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: '1 Year', days: 365 },
];

export default function WalkerHistory() {
  const { data, currentUser } = useApp();
  const [range, setRange] = useState(7);

  const completedWalks = useMemo(() =>
    data.walks.filter(w =>
      w.walkerId === currentUser?.id &&
      w.status === 'completed'
    ).sort((a, b) =>
      new Date(b.endTime || b.scheduledDate).getTime() -
      new Date(a.endTime || a.scheduledDate).getTime()
    ),
    [data.walks, currentUser?.id]
  );

  // Today's stats
  const todayWalks = useMemo(() =>
    completedWalks.filter(w => w.endTime && isToday(new Date(w.endTime))),
    [completedWalks]
  );
  const todayEarnings = todayWalks.reduce((s, w) => s + w.walkerEarning, 0);

  // Range stats
  const cutoff = startOfDay(subDays(new Date(), range - 1));
  const rangeWalks = useMemo(() =>
    completedWalks.filter(w => new Date(w.endTime || w.scheduledDate) >= cutoff),
    [completedWalks, cutoff]
  );
  const rangeEarnings = rangeWalks.reduce((s, w) => s + w.walkerEarning, 0);
  const rangeRated = rangeWalks.filter(w => w.rating);
  const avgRating = rangeRated.length
    ? (rangeRated.reduce((s, w) => s + (w.rating || 0), 0) / rangeRated.length).toFixed(1)
    : null;

  // Daily chart data (capped at 14 days)
  const chartDays = Math.min(range, 14);
  const chartData = useMemo(() => {
    return Array.from({ length: chartDays }, (_, i) => {
      const day = subDays(new Date(), chartDays - 1 - i);
      const dayWalks = completedWalks.filter(w => {
        const dt = new Date(w.endTime || w.scheduledDate);
        return isSameDay(dt, day);
      });
      return {
        date: day,
        label: chartDays <= 7 ? format(day, 'EEE') : format(day, 'MMM d'),
        count: dayWalks.length,
        earnings: dayWalks.reduce((s, w) => s + w.walkerEarning, 0),
      };
    });
  }, [completedWalks, chartDays]);

  const maxEarnings = Math.max(...chartData.map(d => d.earnings), 1);

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {/* Hero header */}
      <div className="px-5 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 className="w-6 h-6 text-white/80" />
          <h1 className="text-2xl font-extrabold text-white">Walk History</h1>
        </div>
        <p className="text-white/70 text-sm pl-9">Your performance report</p>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* Today's snapshot */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Today</p>
              <p className="text-2xl font-extrabold mt-0.5">{todayWalks.length} walk{todayWalks.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Earned</p>
              <p className="text-2xl font-extrabold mt-0.5">K{todayEarnings}</p>
            </div>
          </div>
          <p className="text-white/50 text-[11px]">Resets at midnight</p>
        </div>

        {/* Range selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setRange(opt.days)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                range === opt.days
                  ? 'text-white border-transparent'
                  : 'bg-white text-ink-secondary border-surface-border hover:border-primary/30'
              }`}
              style={range === opt.days ? { background: '#1B4332' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: CheckCircle,
              label: 'Walks',
              value: rangeWalks.length.toString(),
              sub: 'completed',
              color: '#2B8A50',
            },
            {
              icon: DollarSign,
              label: 'Earned',
              value: `K${rangeEarnings}`,
              sub: 'total',
              color: '#2B8A50',
            },
            {
              icon: Star,
              label: 'Rating',
              value: avgRating ? `★ ${avgRating}` : '—',
              sub: avgRating ? `${rangeRated.length} rated` : 'no ratings',
              color: '#F59E0B',
            },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-white border border-surface-border rounded-2xl p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
              <p className="text-base font-extrabold text-ink leading-tight">{value}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
              <p className="text-[9px] text-ink-muted/60">{sub}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: '#2B8A50' }} />
            Daily Earnings
          </h3>
          {chartData.every(d => d.earnings === 0) ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-muted">No earnings in this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-28">
              {chartData.map((day, i) => {
                const heightPct = day.earnings > 0 ? Math.max((day.earnings / maxEarnings) * 100, 8) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`K${day.earnings} · ${day.count} walk${day.count !== 1 ? 's' : ''}`}>
                    <div className="w-full flex flex-col justify-end" style={{ height: 88 }}>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: day.earnings > 0 ? 6 : 0,
                          background: isToday(day.date)
                            ? 'linear-gradient(to top, #1B4332, #52B788)'
                            : '#EBF5EF',
                          border: isToday(day.date) ? 'none' : '1px solid #C6E6D0',
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-ink-muted leading-none">{day.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Walk list */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="text-sm font-bold text-ink">
              Walk Log
              <span className="ml-2 text-xs font-normal text-ink-muted">({rangeWalks.length} walks)</span>
            </h3>
          </div>
          {rangeWalks.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-sm text-ink-muted">No completed walks in this period</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {rangeWalks.map(walk => {
                const dog   = data.dogs.find(d => d.id === walk.dogId);
                const owner = data.users.find(u => u.id === walk.ownerId);
                return (
                  <div key={walk.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0">
                      {dog?.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" />
                        : <span className="text-lg">🐕</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{dog?.name || 'Unknown Dog'}</p>
                      <p className="text-xs text-ink-muted">{owner?.name}</p>
                      <p className="text-[11px] text-ink-muted/70 mt-0.5">
                        {walk.endTime
                          ? format(new Date(walk.endTime), 'MMM d, h:mm a')
                          : format(new Date(walk.scheduledDate), 'MMM d')
                        }
                        {walk.duration ? ` · ${walk.duration} min` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-bold" style={{ color: '#1B4332' }}>K{walk.walkerEarning}</span>
                      {walk.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {walk.rating}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-muted pb-2">
          Made by <span className="font-semibold text-primary">Pegasus AI</span>
        </p>
      </div>
    </div>
  );
}
