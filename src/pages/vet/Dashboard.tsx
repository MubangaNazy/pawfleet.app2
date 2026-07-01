import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, TrendingUp, Clock, CheckCircle2, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isTomorrow } from 'date-fns';

const SERVICE_ICON: Record<string, string> = {
  'General Checkup': '🩺',
  'Vaccination':     '💉',
  'Dental Care':     '🦷',
  'Deworming':       '💊',
  'Emergency Visit': '🚨',
};

function parseVetNote(notes: string) {
  const lines    = notes.split('\n');
  const svcLine  = lines[0] || '';
  const service  = svcLine.replace('VET BOOKING: ', '');
  const aggressive  = lines.some(l => l.includes('Aggressive'));
  const transport   = lines.some(l => l.includes('Walker transport'));
  const totalLine   = lines.find(l => l.startsWith('Total:'));
  const total       = totalLine ? parseInt(totalLine.replace('Total: K', '')) : 0;
  return { service, aggressive, transport, total };
}

export default function VetDashboard() {
  const navigate = useNavigate();
  const { data } = useApp();

  const vetWalks = data.walks
    .filter(w => w.notes?.startsWith('VET BOOKING:'))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const todayAppts   = vetWalks.filter(w => isToday(parseISO(w.scheduledDate)));
  const tomorrowAppts = vetWalks.filter(w => isTomorrow(parseISO(w.scheduledDate)));
  const weekStart    = startOfWeek(new Date());
  const weekEnd      = endOfWeek(new Date());
  const weekAppts    = vetWalks.filter(w => {
    const d = parseISO(w.scheduledDate);
    return d >= weekStart && d <= weekEnd;
  });
  const totalRev   = vetWalks.filter(w => w.status === 'completed').reduce((s, w) => s + w.price, 0);
  const pending    = vetWalks.filter(w => w.status === 'pending').length;
  const completed  = vetWalks.filter(w => w.status === 'completed').length;

  // Service breakdown for mini chart
  const serviceBreakdown = Object.entries(
    vetWalks.reduce<Record<string, number>>((acc, w) => {
      const { service } = parseVetNote(w.notes || '');
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const maxCount = serviceBreakdown.reduce((m, [, c]) => Math.max(m, c), 1);

  const stats = [
    { icon: Calendar,     label: "Today's Appts",  value: todayAppts.length,  color: '#0891B2' },
    { icon: ClipboardList,label: 'This Week',       value: weekAppts.length,   color: '#0F766E' },
    { icon: TrendingUp,   label: 'Revenue (K)',     value: totalRev,           color: '#7C3AED' },
    { icon: Clock,        label: 'Pending',         value: pending,            color: '#D97706' },
  ];

  const upcomingPending = vetWalks.filter(w => w.status === 'pending').slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto pb-16 p-4 space-y-5">

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0891B2 60%, #0EA5E9 100%)' }}>
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">🏥</div>
            <div>
              <p className="text-white font-extrabold text-base leading-tight">Vet Dashboard</p>
              <p className="text-white/70 text-xs">PawFleet Partner Clinic</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3">
                <p className="text-xl font-extrabold text-white">{value}</p>
                <p className="text-white/70 text-[11px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => navigate('/vet/appointments')}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#F0FDFA' }}>
            <ClipboardList className="w-5 h-5" style={{ color: '#0891B2' }} />
          </div>
          <p className="text-xs font-bold text-ink text-center">All Appts</p>
          <p className="text-[10px] text-ink-muted">{vetWalks.length} total</p>
        </button>
        <button onClick={() => navigate('/vet/schedule')}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xs font-bold text-ink text-center">Schedule</p>
          <p className="text-[10px] text-ink-muted">{weekAppts.length} this wk</p>
        </button>
        <button onClick={() => navigate('/vet/analytics')}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#F5F3FF' }}>
            <BarChart2 className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-xs font-bold text-ink text-center">Analytics</p>
          <p className="text-[10px] text-ink-muted">K{totalRev} rev</p>
        </button>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink">Today's Schedule</p>
          <span className="text-xs text-ink-muted">{format(new Date(), 'EEE d MMM')}</span>
        </div>

        {todayAppts.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold text-ink text-sm">No appointments today</p>
            {tomorrowAppts.length > 0 && (
              <p className="text-xs text-ink-muted mt-1">
                {tomorrowAppts.length} appointment{tomorrowAppts.length !== 1 ? 's' : ''} tomorrow
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map(walk => {
              const pet   = data.dogs.find(d => d.id === walk.dogId);
              const owner = data.users.find(u => u.id === walk.ownerId);
              const { service, aggressive, transport } = parseVetNote(walk.notes || '');
              const svcIcon = SERVICE_ICON[service] ?? '🏥';
              const isDone  = walk.status === 'completed';
              return (
                <button key={walk.id} type="button"
                  onClick={() => navigate(`/vet/appointments/${walk.id}`)}
                  className="w-full text-left bg-white border border-surface-border rounded-2xl p-4 flex gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: isDone ? '#F3F4F6' : '#F0FDFA' }}>
                    {svcIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink truncate">{pet?.name ?? 'Unknown Pet'}</p>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                    </div>
                    <p className="text-xs text-ink-muted">{service} · {owner?.name}</p>
                    <div className="flex gap-1 mt-1">
                      {aggressive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Aggressive</span>}
                      {transport  && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">🚗 Transport</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-ink">{format(parseISO(walk.scheduledDate), 'h:mm a')}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: '#0891B2' }}>K{walk.price}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                      isDone ? 'bg-gray-100 text-gray-500' :
                      walk.status === 'assigned' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isDone ? 'Done' : walk.status === 'assigned' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending confirmations */}
      {upcomingPending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-ink">Needs Confirmation</p>
            <button onClick={() => navigate('/vet/appointments')}
              className="text-xs font-semibold" style={{ color: '#0891B2' }}>
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {upcomingPending.map(walk => {
              const pet   = data.dogs.find(d => d.id === walk.dogId);
              const { service } = parseVetNote(walk.notes || '');
              return (
                <div key={walk.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: '#FEF3C7' }}>
                    {SERVICE_ICON[service] ?? '🏥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{pet?.name ?? 'Unknown Pet'}</p>
                    <p className="text-xs text-amber-700">{service}</p>
                    <p className="text-xs text-ink-muted">{format(parseISO(walk.scheduledDate), 'EEE d MMM · h:mm a')}</p>
                  </div>
                  <button type="button"
                    onClick={() => navigate(`/vet/appointments/${walk.id}`)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
                    Review
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Service breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="bg-white border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-ink">Service Breakdown</p>
            <span className="text-xs text-ink-muted">{completed} completed</span>
          </div>
          <div className="space-y-3">
            {serviceBreakdown.map(([svc, count]) => (
              <div key={svc}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    {SERVICE_ICON[svc] ?? '🏥'} {svc}
                  </span>
                  <span className="text-xs font-bold text-ink-muted">{count}</span>
                </div>
                <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%`, background: 'linear-gradient(90deg,#0F766E,#0891B2)' }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/vet/analytics')}
            className="mt-4 w-full py-2 rounded-xl text-xs font-bold border border-surface-border text-ink-secondary hover:bg-surface-hover transition-colors">
            Full Analytics →
          </button>
        </div>
      )}
    </div>
  );
}
