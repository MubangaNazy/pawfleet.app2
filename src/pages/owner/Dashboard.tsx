import React from 'react';
import { Link } from 'react-router-dom';
import { format, isThisMonth } from 'date-fns';
import { PlusCircle, ArrowRight, MapPin, Clock, CheckCircle, Droplets, Coffee, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function OwnerDashboard() {
  const { data, currentUser, logHealth } = useApp();

  const myWalks = data.walks.filter(w => w.ownerId === currentUser?.id);
  const completedWalks = myWalks.filter(w => w.status === 'completed');
  const activeWalk = myWalks.find(w => w.status === 'active');
  const thisMonthWalks = completedWalks.filter(w => isThisMonth(new Date(w.scheduledDate)));
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const today = new Date().toISOString().split('T')[0];

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || '';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{greeting}, {firstName} 🐾</h1>
          <p className="text-ink-secondary mt-1">{format(new Date(), 'EEEE, MMMM d')} — Your dog walking overview</p>
        </div>
        <Link to="/owner/request">
          <Button icon={<PlusCircle className="w-4 h-4" />}>Book a Walk</Button>
        </Link>
      </div>

      {/* Active Walk Banner */}
      {activeWalk && (
        <div className="flex items-center gap-4 px-4 py-4 bg-success-light border border-success/30 rounded-2xl">
          <span className="w-3 h-3 rounded-full bg-success pulse-dot shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-success-dark">
              {data.dogs.find(d => d.id === activeWalk.dogId)?.name} is on a walk right now!
            </p>
            <p className="text-xs text-success/70">
              Walker: {data.users.find(u => u.id === activeWalk.walkerId)?.name || 'Unassigned'}
              {activeWalk.startTime && <> · Started at {format(new Date(activeWalk.startTime), 'h:mm a')}</>}
            </p>
          </div>
          <Link to="/owner/history">
            <Button variant="success" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>Details</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Total Walks" value={completedWalks.length} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="This Month" value={thisMonthWalks.length} color="blue" />
        <StatCard icon={<MapPin className="w-5 h-5" />} label="Upcoming" value={upcomingWalks.length} color="violet" />
        <StatCard icon={<PlusCircle className="w-5 h-5" />} label="My Dogs" value={myDogs.length} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dogs with Health Tracking */}
        <div className="bg-white border border-surface-border rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-ink">My Dogs</h2>
            <Link to="/owner/dogs" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="p-4 space-y-4">
            {myDogs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-ink-muted text-sm">No dogs registered</p>
              </div>
            ) : myDogs.map(dog => {
              const todayLog = dog.healthLogs?.find(l => l.date === today);
              const dogWalks = myWalks.filter(w => w.dogId === dog.id).length;

              return (
                <div key={dog.id} className="p-4 rounded-2xl border border-surface-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                      {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-12 h-12 object-cover" /> : <span className="text-xl">🐕</span>}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink">{dog.name}</p>
                      <p className="text-xs text-ink-muted">{dog.breed}{dog.age ? ` · ${dog.age} yrs` : ''} · {dogWalks} walks</p>
                    </div>
                    <Link to={`/owner/dogs/${dog.id}`} className="text-xs text-primary hover:underline">Profile</Link>
                  </div>

                  {/* Health toggles */}
                  <div>
                    <p className="text-xs text-ink-muted mb-2">Today's health log</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => logHealth(dog.id, today, 'water', !todayLog?.water)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${todayLog?.water ? 'bg-info border-info text-white' : 'border-surface-border text-ink-muted hover:border-info'}`}
                      >
                        <Droplets className="w-3.5 h-3.5" /> Water
                      </button>
                      <button
                        onClick={() => logHealth(dog.id, today, 'foodMorning', !todayLog?.foodMorning)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${todayLog?.foodMorning ? 'bg-success border-success text-white' : 'border-surface-border text-ink-muted hover:border-success'}`}
                      >
                        <Coffee className="w-3.5 h-3.5" /> Morning
                      </button>
                      <button
                        onClick={() => logHealth(dog.id, today, 'foodEvening', !todayLog?.foodEvening)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${todayLog?.foodEvening ? 'bg-warning border-warning text-white' : 'border-surface-border text-ink-muted hover:border-warning'}`}
                      >
                        <Moon className="w-3.5 h-3.5" /> Evening
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Walks */}
        <div className="bg-white border border-surface-border rounded-2xl shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-ink">Upcoming Walks</h2>
            <Link to="/owner/history" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {upcomingWalks.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                <p className="text-ink-muted text-sm">No upcoming walks</p>
                <Link to="/owner/request" className="mt-2 text-xs text-primary hover:underline block">Book one →</Link>
              </div>
            ) : upcomingWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const walker = data.users.find(u => u.id === walk.walkerId);
              return (
                <div key={walk.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-9 h-9 object-cover" /> : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{dog?.name}</p>
                    <p className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'MMM d, h:mm a')} · {walker?.name || 'Unassigned'}</p>
                  </div>
                  <StatusBadge status={walk.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
