import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, addDays, startOfWeek, isSameDay, isToday,
} from 'date-fns';
import { PlusCircle, Clock, MapPin, MessageCircle, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function OwnerSchedule() {
  const { data, currentUser } = useApp();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const myWalks = data.walks.filter(w => w.ownerId === currentUser?.id);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const walksForDay = (date: Date) =>
    myWalks.filter(w => isSameDay(new Date(w.scheduledDate), date));

  const selectedDayWalks = walksForDay(selectedDate).sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending' || w.status === 'active')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const typeBadge = (status: string) => {
    if (status === 'active') return { label: 'Active', cls: 'bg-success-light text-success-dark border border-success/20' };
    if (status === 'completed') return { label: 'Done', cls: 'bg-surface-secondary text-ink-secondary border border-surface-border' };
    return { label: 'Walk', cls: 'bg-primary/10 text-primary border border-primary/20' };
  };

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{format(new Date(), 'MMMM yyyy')}</h1>
            <p className="text-sm text-ink-secondary mt-0.5">Your upcoming bookings</p>
          </div>
          <Link
            to="/owner/request"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ background: '#1B4332' }}
          >
            +
          </Link>
        </div>

        {/* Week strip */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setWeekStart(d => addDays(d, -7))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-ink-secondary">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <button
              onClick={() => setWeekStart(d => addDays(d, 7))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => {
              const dayWalks = walksForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all"
                  style={isSelected ? { background: '#1B4332' } : isTodayDay ? { background: '#EBF5EF' } : {}}
                >
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white/70' : 'text-ink-muted'}`}>
                    {dayLabels[i]}
                  </span>
                  <span className={`text-base font-extrabold ${isSelected ? 'text-white' : isTodayDay ? 'text-primary' : 'text-ink'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayWalks.length > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-primary'}`} />
                  )}
                  {dayWalks.length === 0 && <div className="w-1.5 h-1.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-surface-border" />

        {/* Events for selected day */}
        {selectedDayWalks.length > 0 ? (
          <div className="space-y-3">
            {selectedDayWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              const badge = typeBadge(walk.status);
              return (
                <div key={walk.id} className="flex gap-4">
                  {/* Date block */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5" style={{ minWidth: 48 }}>
                    <p className="text-[10px] font-bold text-ink-muted uppercase">{format(new Date(walk.scheduledDate), 'MMM')}</p>
                    <p className="text-2xl font-extrabold text-ink leading-tight">{format(new Date(walk.scheduledDate), 'd')}</p>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white border border-surface-border rounded-2xl p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(walk.scheduledDate), 'h:mm a')} · 45 min</span>
                        </div>
                        <p className="font-bold text-ink text-sm">
                          Walk with {walker?.name?.split(' ')[0] || 'Walker'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{dog?.name || 'Your dog'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link
                        to={`/owner/chat/${walk.id}`}
                        className="flex items-center gap-1.5 text-xs text-ink-secondary font-semibold hover:text-primary transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                      <span className="text-ink-muted">·</span>
                      <Link
                        to={`/owner/track/${walk.id}`}
                        className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Track
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : upcomingWalks.length > 0 ? (
          /* No walks today — show all upcoming */
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              No walks on {format(selectedDate, 'MMM d')} — upcoming
            </p>
            {upcomingWalks.slice(0, 5).map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              const badge = typeBadge(walk.status);
              return (
                <div key={walk.id} className="flex gap-4">
                  <div className="flex flex-col items-center shrink-0 pt-0.5" style={{ minWidth: 48 }}>
                    <p className="text-[10px] font-bold text-ink-muted uppercase">{format(new Date(walk.scheduledDate), 'MMM')}</p>
                    <p className="text-2xl font-extrabold text-ink leading-tight">{format(new Date(walk.scheduledDate), 'd')}</p>
                  </div>
                  <div className="flex-1 bg-white border border-surface-border rounded-2xl p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(walk.scheduledDate), 'h:mm a')} · 45 min</span>
                        </div>
                        <p className="font-bold text-ink text-sm">
                          Walk with {walker?.name?.split(' ')[0] || 'Walker'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{dog?.name || 'Your dog'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link to={`/owner/chat/${walk.id}`} className="flex items-center gap-1.5 text-xs text-ink-secondary font-semibold hover:text-primary transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                      <span className="text-ink-muted">·</span>
                      <Link to={`/owner/track/${walk.id}`} className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                        <Navigation className="w-3.5 h-3.5" /> Track
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EBF5EF' }}>
              <span className="text-3xl">📅</span>
            </div>
            <p className="font-bold text-ink mb-1">No walks scheduled</p>
            <p className="text-sm text-ink-muted mb-5">Book a walk to see it here</p>
            <Link to="/owner/request"
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-6 py-3 rounded-2xl"
              style={{ background: '#1B4332' }}>
              <PlusCircle className="w-4 h-4" /> Book a Walk
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
