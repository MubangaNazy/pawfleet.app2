import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Calendar, Clock, MapPin, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';

export default function OwnerSchedule() {
  const { data, currentUser } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const myWalks = data.walks.filter(w => w.ownerId === currentUser?.id);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];

  const walksForDay = (date: Date) =>
    myWalks.filter(w => isSameDay(new Date(w.scheduledDate), date));

  const selectedDayWalks = selectedDate ? walksForDay(selectedDate) : [];

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28 lg:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Schedule</h1>
          <p className="text-ink-secondary text-sm mt-0.5">View and manage your walk calendar</p>
        </div>
        <Link
          to="/owner/request"
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Book Walk
        </Link>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-ink">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-surface-border">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-ink-muted py-2">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 p-1">
          {paddedDays.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="h-11" />;
            const walks = walksForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`relative h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all mx-0.5 my-0.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : today
                    ? 'bg-primary-50 font-bold text-primary'
                    : inMonth
                    ? 'text-ink hover:bg-surface-hover'
                    : 'text-ink-muted'
                }`}
              >
                <span className="text-xs font-semibold">{format(day, 'd')}</span>
                {walks.length > 0 && (
                  <div className="flex gap-0.5">
                    {walks.slice(0, 3).map((_, j) => (
                      <div
                        key={j}
                        className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-primary'}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-surface-border">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Walk scheduled
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <div className="w-4 h-4 rounded-lg bg-primary-50 border border-primary/20" />
            Today
          </div>
        </div>
      </div>

      {/* Selected day walks */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink">{format(selectedDate, 'EEEE, MMMM d')}</h3>
          {selectedDayWalks.length === 0 ? (
            <div className="bg-white border border-surface-border rounded-2xl p-6 text-center">
              <Calendar className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-sm text-ink-secondary mb-1">No walks on this day</p>
              <Link to="/owner/request" className="text-xs text-primary hover:underline">Book a walk →</Link>
            </div>
          ) : selectedDayWalks.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const walker = data.users.find(u => u.id === walk.walkerId);
            return (
              <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                    {dog?.imageUrl
                      ? <img src={dog.imageUrl} alt={dog.name} className="w-11 h-11 object-cover" />
                      : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{dog?.name}</p>
                      <StatusBadge status={walk.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        <Clock className="w-3 h-3" />
                        {format(new Date(walk.scheduledDate), 'h:mm a')}
                      </span>
                      {walker && (
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin className="w-3 h-3" />
                          {walker.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/owner/chat/${walk.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-secondary hover:bg-primary-50 text-ink-secondary hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/owner/track/${walk.id}`}
                      className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-xl font-semibold hover:bg-primary/20 transition-colors"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming walks */}
      {!selectedDate && (
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Upcoming Walks</h3>
          <div className="space-y-2">
            {upcomingWalks.length === 0 ? (
              <div className="bg-white border border-surface-border rounded-2xl p-6 text-center">
                <p className="text-sm text-ink-secondary mb-2">No upcoming walks scheduled</p>
                <Link to="/owner/request" className="text-xs text-primary hover:underline">Book one →</Link>
              </div>
            ) : upcomingWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              return (
                <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                    {dog?.imageUrl
                      ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" />
                      : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{dog?.name}</p>
                      <StatusBadge status={walk.status} />
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {format(new Date(walk.scheduledDate), 'EEE, MMM d · h:mm a')}
                      {walker ? ` · ${walker.name}` : ''}
                    </p>
                  </div>
                  <Link
                    to={`/owner/track/${walk.id}`}
                    className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-xl font-semibold hover:bg-primary/20 shrink-0"
                  >
                    Track
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
