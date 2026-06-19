import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import {
  Clock, MapPin, MessageCircle, Navigation,
  ChevronLeft, ChevronRight, StickyNote, X, Check, Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Walk } from '../../types';

function NotesModal({ walk, onClose }: { walk: Walk; onClose: () => void }) {
  const { updateWalk } = useApp();
  const [note,   setNote]   = useState(walk.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateWalk(walk.id, { notes: note.trim() || undefined });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg mx-auto p-5 pb-10 space-y-4">
        <div className="flex justify-center mb-1">
          <div className="w-10 h-1 rounded-full bg-surface-border" />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Instructions for Walker</h3>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Leave notes for the walker about your pet or walk preferences.
        </p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Please use the side gate. Buddy needs his harness…"
          rows={5}
          className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none"
        />
        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#1B4332' }}>
          {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save Note</>}
        </button>
      </div>
    </div>
  );
}

const isVetWalk = (notes?: string) => notes?.startsWith('VET BOOKING:') ?? false;

const SERVICE_OPTIONS = [
  { icon: '🦮', label: 'Dog Walk',  sub: 'Book a walker',      to: '/owner/request',     color: '#1B4332', bg: '#EBF5EF' },
  { icon: '✂️', label: 'Grooming',  sub: 'At-home grooming',   to: '/owner/services',    color: '#0891B2', bg: '#EFF6FF' },
  { icon: '🩺', label: 'Vet Care',  sub: 'Clinic appointment', to: '/owner/vet-booking', color: '#7C3AED', bg: '#F5F3FF' },
];

export default function OwnerSchedule() {
  const { data, currentUser } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [notesWalk,    setNotesWalk]    = useState<Walk | null>(null);

  const myWalks = data.walks.filter(w => w.ownerId === currentUser?.id);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];

  const walksForDay = (date: Date) =>
    myWalks.filter(w => isSameDay(new Date(w.scheduledDate), date));

  const selectedDayWalks = selectedDate
    ? walksForDay(selectedDate).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    : [];

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending' || w.status === 'active')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const statusBadge = (status: string) => {
    if (status === 'active')    return { label: 'Active',    cls: 'bg-success/10 text-success border border-success/20' };
    if (status === 'completed') return { label: 'Done',      cls: 'bg-surface-secondary text-ink-secondary border border-surface-border' };
    if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border border-red-100' };
    return { label: 'Upcoming', cls: 'bg-primary/10 text-primary border border-primary/20' };
  };

  const renderWalkCard = (walk: Walk) => {
    const dog    = data.dogs.find(d => d.id === walk.dogId);
    const walker = data.users.find(u => u.id === walk.walkerId);
    const badge  = statusBadge(walk.status);
    const vet    = isVetWalk(walk.notes);

    const lines      = (walk.notes ?? '').split('\n');
    const vetService = vet ? lines[0].replace('VET BOOKING: ', '') : null;
    const clinicLine = lines.find(l => l.startsWith('📍 Clinic:'));
    const clinic     = clinicLine ? clinicLine.replace('📍 Clinic: ', '') : null;
    const ownerNote  = !vet && walk.notes?.trim() ? walk.notes : null;

    return (
      <div key={walk.id} className="flex gap-4">
        <div className="flex flex-col items-center shrink-0 pt-0.5" style={{ minWidth: 48 }}>
          <p className="text-[10px] font-bold text-ink-muted uppercase">{format(new Date(walk.scheduledDate), 'MMM')}</p>
          <p className="text-2xl font-extrabold text-ink leading-tight">{format(new Date(walk.scheduledDate), 'd')}</p>
        </div>

        <div className="flex-1 bg-white border border-surface-border rounded-2xl p-3.5 shadow-sm min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{format(new Date(walk.scheduledDate), 'h:mm a')} · {vet ? '60 min' : '45 min'}</span>
              </div>

              {vet ? (
                <>
                  <p className="font-bold text-ink text-sm flex items-center gap-1.5">
                    <span>🏥</span>{vetService}
                  </p>
                  {clinic && (
                    <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{clinic}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="font-bold text-ink text-sm">
                    Walk with {walker?.name?.split(' ')[0] || 'Walker'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{dog?.name || 'Your pet'}</span>
                  </div>
                </>
              )}

              {ownerNote && (
                <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-2">
                  <StickyNote className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 leading-snug break-words">{ownerNote}</p>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {!vet && (
            <div className="flex gap-3 mt-3 flex-wrap items-center">
              <Link to={`/owner/chat/${walk.id}`}
                className="flex items-center gap-1.5 text-xs text-ink-secondary font-semibold hover:text-primary transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> Chat
              </Link>
              <span className="text-ink-muted text-xs">·</span>
              <Link to={`/owner/track/${walk.id}`}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                <Navigation className="w-3.5 h-3.5" /> Track
              </Link>
              <span className="text-ink-muted text-xs">·</span>
              <button type="button" onClick={() => setNotesWalk(walk)}
                className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold hover:text-amber-700 transition-colors">
                <StickyNote className="w-3.5 h-3.5" />
                {ownerNote ? 'Edit Note' : 'Add Note'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Schedule</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Pick a date to book a service</p>
        </div>

        {/* Monthly calendar */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-ink">{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-surface-border">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-ink-muted py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 p-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="h-11" />;
              const walks   = walksForDay(day);
              const isSel   = selectedDate ? isSameDay(day, selectedDate) : false;
              const today   = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <button key={day.toISOString()}
                  onClick={() => setSelectedDate(isSel ? null : day)}
                  className={`relative h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all mx-0.5 my-0.5 ${
                    isSel     ? 'text-white shadow-sm'
                    : today   ? 'font-bold text-primary'
                    : inMonth ? 'text-ink hover:bg-surface-hover'
                    : 'text-ink-muted'
                  }`}
                  style={isSel ? { background: '#1B4332' } : today ? { background: '#EBF5EF' } : {}}>
                  <span className="text-xs font-semibold">{format(day, 'd')}</span>
                  {walks.length > 0 && (
                    <div className="flex gap-0.5">
                      {walks.slice(0, 3).map((w, j) => (
                        <div key={j} className={`w-1 h-1 rounded-full ${
                          isSel ? 'bg-white/70' : isVetWalk(w.notes) ? 'bg-teal-500' : 'bg-primary'
                        }`} />
                      ))}
                    </div>
                  )}
                  {walks.length === 0 && <div className="w-1.5 h-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-surface-border">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-2 h-2 rounded-full bg-primary" />Walk
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-2 h-2 rounded-full bg-teal-500" />Vet
            </div>
          </div>
        </div>

        {/* Selected date section */}
        {selectedDate && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>

            {/* Existing bookings for this day */}
            {selectedDayWalks.length > 0 && selectedDayWalks.map(renderWalkCard)}

            {/* Book a service panel */}
            <div className="rounded-2xl overflow-hidden border border-surface-border">
              <div className="px-4 py-3 border-b border-surface-border" style={{ background: '#F8FBF9' }}>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                  {selectedDayWalks.length > 0 ? '+ Add another booking' : 'What would you like to schedule?'}
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-surface-border bg-white">
                {SERVICE_OPTIONS.map(s => (
                  <Link key={s.label} to={s.to}
                    className="flex flex-col items-center gap-2 py-5 px-2 hover:opacity-80 active:scale-95 transition-all">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: s.bg }}>
                      {s.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-ink">{s.label}</p>
                      <p className="text-[10px] text-ink-muted mt-0.5">{s.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No date selected — all upcoming */}
        {!selectedDate && upcomingWalks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">All Upcoming</p>
            {upcomingWalks.slice(0, 15).map(renderWalkCard)}
          </div>
        )}

        {/* No date selected — empty */}
        {!selectedDate && upcomingWalks.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EBF5EF' }}>
              <Calendar className="w-8 h-8" style={{ color: '#1B4332' }} />
            </div>
            <p className="font-bold text-ink mb-1">No bookings yet</p>
            <p className="text-sm text-ink-muted mb-5">Tap a date on the calendar to get started</p>
          </div>
        )}

      </div>

      {notesWalk && !isVetWalk(notesWalk.notes) && (
        <NotesModal walk={notesWalk} onClose={() => setNotesWalk(null)} />
      )}
    </div>
  );
}
