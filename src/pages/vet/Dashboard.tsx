import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, TrendingUp, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns';

function parseVetNote(notes: string) {
  const lines  = notes.split('\n');
  const svcLine = lines[0] || '';
  const service = svcLine.replace('VET BOOKING: ', '');
  const aggressive  = lines.some(l => l.includes('Aggressive'));
  const transport   = lines.some(l => l.includes('Walker transport'));
  const totalLine   = lines.find(l => l.startsWith('Total:'));
  const total       = totalLine ? parseInt(totalLine.replace('Total: K', '')) : 0;
  return { service, aggressive, transport, total };
}

export default function VetDashboard() {
  const navigate = useNavigate();
  const { data }  = useApp();

  const vetWalks = data.walks
    .filter(w => w.notes?.startsWith('VET BOOKING:'))
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const todayAppts  = vetWalks.filter(w => isToday(parseISO(w.scheduledDate)));
  const weekStart   = startOfWeek(new Date());
  const weekEnd     = endOfWeek(new Date());
  const weekAppts   = vetWalks.filter(w => {
    const d = parseISO(w.scheduledDate);
    return d >= weekStart && d <= weekEnd;
  });
  const totalRev    = vetWalks.filter(w => w.status === 'completed').reduce((s, w) => s + w.price, 0);
  const pending     = vetWalks.filter(w => w.status === 'pending').length;

  const stats = [
    { icon: Calendar,     label: "Today's Appts",    value: todayAppts.length,  color: '#0891B2' },
    { icon: ClipboardList,label: 'This Week',         value: weekAppts.length,   color: '#0F766E' },
    { icon: TrendingUp,   label: 'Revenue (K)',       value: totalRev,           color: '#7C3AED' },
    { icon: Clock,        label: 'Pending',           value: pending,            color: '#D97706' },
  ];

  const upcoming = vetWalks.filter(w => w.status === 'pending').slice(0, 5);

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
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/vet/appointments')}
          className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors shadow-sm">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#F0FDFA' }}>
            <ClipboardList className="w-5 h-5" style={{ color: '#0891B2' }} />
          </div>
          <p className="text-sm font-bold text-ink">All Appointments</p>
          <p className="text-xs text-ink-muted">{vetWalks.length} total</p>
        </button>
        <div className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-ink">Pending Confirm</p>
          <p className="text-xs text-ink-muted">{pending} waiting</p>
        </div>
      </div>

      {/* Upcoming appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink">Upcoming Appointments</p>
          <button onClick={() => navigate('/vet/appointments')}
            className="text-xs font-semibold" style={{ color: '#0891B2' }}>
            View all →
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-2xl p-8 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-semibold text-ink">No upcoming bookings</p>
            <p className="text-sm text-ink-muted mt-1">New vet bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(walk => {
              const pet   = data.dogs.find(d => d.id === walk.dogId);
              const owner = data.users.find(u => u.id === walk.ownerId);
              const { service, aggressive, transport } = parseVetNote(walk.notes || '');
              return (
                <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-4 flex gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#F0FDFA' }}>
                    {pet?.animalType === 'cat' ? '🐈' : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{pet?.name ?? 'Unknown Pet'}</p>
                    <p className="text-xs text-ink-muted">{service}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {aggressive  && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⚠️ Aggressive</span>}
                      {transport   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🚗 Transport</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-ink">{format(parseISO(walk.scheduledDate), 'MMM d')}</p>
                    <p className="text-xs text-ink-muted">{format(parseISO(walk.scheduledDate), 'h:mm a')}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: '#0891B2' }}>K{walk.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
