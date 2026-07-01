import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, parseISO, isToday, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const SERVICE_ICON: Record<string, string> = {
  'General Checkup': '🩺',
  'Vaccination':     '💉',
  'Dental Care':     '🦷',
  'Deworming':       '💊',
  'Emergency Visit': '🚨',
};

const STATUS_COLOR: Record<string, { dot: string; label: string }> = {
  pending:   { dot: '#D97706', label: 'Pending' },
  assigned:  { dot: '#0891B2', label: 'Confirmed' },
  active:    { dot: '#2B8A50', label: 'Active' },
  completed: { dot: '#6B7280', label: 'Done' },
  cancelled: { dot: '#DC2626', label: 'Cancelled' },
};

function parseVetNote(notes: string) {
  const lines   = notes.split('\n');
  const service = lines[0]?.replace('VET BOOKING: ', '') ?? '';
  const aggressive = lines.some(l => l.includes('Aggressive'));
  const transport  = lines.some(l => l.includes('Walker transport'));
  return { service, aggressive, transport };
}

export default function VetSchedule() {
  const navigate = useNavigate();
  const { data } = useApp();
  const [weekOffset, setWeekOffset]     = useState(0);
  const [selectedDay, setSelectedDay]   = useState(new Date());

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const vetWalks = data.walks.filter(w => w.notes?.startsWith('VET BOOKING:') && w.status !== 'cancelled');

  const walksForDay = (day: Date) =>
    vetWalks
      .filter(w => isSameDay(parseISO(w.scheduledDate), day))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const dayWalks      = walksForDay(selectedDay);
  const weekTotal     = days.reduce((s, d) => s + walksForDay(d).length, 0);
  const weekRevenue   = days.reduce((s, d) =>
    s + walksForDay(d).filter(w => w.status === 'completed').reduce((a, w) => a + w.price, 0), 0);

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-extrabold text-ink">Schedule</h1>
        <p className="text-ink-muted text-sm mt-0.5">{weekTotal} appointments this week · K{weekRevenue} revenue</p>
      </div>

      {/* Week navigation */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setWeekOffset(w => w - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-surface-hover text-ink-secondary">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-ink">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </p>
        <button type="button" onClick={() => setWeekOffset(w => w + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-surface-hover text-ink-secondary">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day strip */}
      <div className="px-4 mb-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {days.map(day => {
            const count     = walksForDay(day).length;
            const isSelected = isSameDay(day, selectedDay);
            const today     = isToday(day);
            return (
              <button key={day.toISOString()} type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex-1 min-w-[48px] flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : today
                    ? 'bg-surface-secondary border-2 border-primary/30'
                    : 'bg-white border border-surface-border hover:bg-surface-hover'
                }`}
                style={isSelected ? { background: 'linear-gradient(135deg,#0F766E,#0891B2)' } : {}}>
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white/70' : 'text-ink-muted'}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-base font-extrabold ${isSelected ? 'text-white' : today ? 'text-primary' : 'text-ink'}`}>
                  {format(day, 'd')}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments for selected day */}
      <div className="px-4 space-y-3">
        <p className="text-sm font-bold text-ink">
          {isToday(selectedDay) ? "Today" : format(selectedDay, 'EEEE, d MMMM')}
          <span className="text-ink-muted font-normal ml-2">({dayWalks.length} appointment{dayWalks.length !== 1 ? 's' : ''})</span>
        </p>

        {dayWalks.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-semibold text-ink">No appointments</p>
            <p className="text-sm text-ink-muted mt-1">Nothing scheduled for this day</p>
          </div>
        ) : (
          dayWalks.map(walk => {
            const pet    = data.dogs.find(d => d.id === walk.dogId);
            const owner  = data.users.find(u => u.id === walk.ownerId);
            const { service, aggressive, transport } = parseVetNote(walk.notes || '');
            const statusMeta = STATUS_COLOR[walk.status] ?? STATUS_COLOR.pending;
            const isDone     = walk.status === 'completed';
            return (
              <button key={walk.id} type="button"
                onClick={() => navigate(`/vet/appointments/${walk.id}`)}
                className="w-full text-left bg-white border border-surface-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Time column */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5" style={{ minWidth: 44 }}>
                    <p className="text-xs font-extrabold text-ink">{format(parseISO(walk.scheduledDate), 'h:mm')}</p>
                    <p className="text-[10px] text-ink-muted">{format(parseISO(walk.scheduledDate), 'a')}</p>
                    <div className="w-0.5 flex-1 mt-2 rounded-full" style={{ background: statusMeta.dot, minHeight: 24 }} />
                  </div>

                  {/* Content */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: isDone ? '#F3F4F6' : '#F0FDFA' }}>
                    {SERVICE_ICON[service] ?? '🏥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ink truncate">{pet?.name ?? 'Unknown Pet'}</p>
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: statusMeta.dot, background: `${statusMeta.dot}15` }}>
                        {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#0891B2' }}>{service}</p>
                    <p className="text-xs text-ink-muted">Owner: {owner?.name ?? 'Unknown'}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {aggressive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⚠️ Aggressive</span>}
                      {transport  && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🚗 Transport</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: '#0F766E' }}>K{walk.price}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
