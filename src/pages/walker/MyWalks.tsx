import React, { useState } from 'react';
import { format } from 'date-fns';
import { Play, Square, MapPin, Clock, Navigation, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { GeoLocation, WalkStatus } from '../../types';

type Filter = 'all' | WalkStatus;

const LUSAKA_FALLBACK: GeoLocation = { lat: -15.4167, lng: 28.2833, address: 'Lusaka, Zambia' };

async function getGPS(): Promise<GeoLocation> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(LUSAKA_FALLBACK); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }),
      () => resolve(LUSAKA_FALLBACK),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

export default function WalkerMyWalks() {
  const { data, currentUser, startWalk, endWalk } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [gpsLoading, setGpsLoading] = useState<string | null>(null);

  const myWalks = data.walks
    .filter(w => w.walkerId === currentUser?.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const filtered = myWalks.filter(w => filter === 'all' ? true : w.status === filter);

  const filterTabs: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  const handleStart = async (walkId: string) => {
    setGpsLoading(walkId);
    const location = await getGPS();
    startWalk(walkId, location);
    setGpsLoading(null);
  };

  const handleEnd = async (walkId: string) => {
    setGpsLoading(walkId);
    const location = await getGPS();
    endWalk(walkId, location);
    setGpsLoading(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">My Walks</h1>
        <p className="text-ink-secondary mt-1">{myWalks.length} total walks assigned to you</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary border border-surface-border rounded-xl overflow-x-auto flex-nowrap pb-1">
        {filterTabs.map(tab => {
          const count = tab.value === 'all' ? myWalks.length : myWalks.filter(w => w.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === tab.value ? 'bg-primary text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'}`}
            >
              {tab.label}
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.value ? 'bg-white/20' : 'bg-surface-border'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <MapPin className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No walks in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const owner = data.users.find(u => u.id === walk.ownerId);
            const isGpsLoading = gpsLoading === walk.id;
            const payment = data.payments.find(p => p.walkId === walk.id);

            return (
              <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-12 h-12 object-cover" /> : <span className="text-xl">🐕</span>}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink text-base">{dog?.name || 'Unknown Dog'}</h3>
                      {dog?.breed && <p className="text-xs text-ink-muted">{dog.breed}</p>}
                      <p className="text-xs text-ink-muted mt-0.5">Owner: {owner?.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={walk.status} />
                    {payment && <PaymentBadge status={payment.status} />}
                  </div>
                </div>

                {/* Walk details */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border">
                    <p className="text-xs text-ink-muted mb-1">Scheduled</p>
                    <p className="text-ink font-medium">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'h:mm a')}</p>
                  </div>
                  {walk.status === 'active' && walk.startTime && (
                    <div className="p-2.5 rounded-xl bg-success-light border border-success/20">
                      <p className="text-xs text-ink-muted mb-1">Started at</p>
                      <p className="text-success-dark font-medium">{format(new Date(walk.startTime), 'h:mm a')}</p>
                      <p className="text-xs text-success/70">{Math.round((Date.now() - new Date(walk.startTime).getTime()) / 60000)} min ago</p>
                    </div>
                  )}
                  {walk.status === 'completed' && walk.duration && (
                    <div className="p-2.5 rounded-xl bg-success-light border border-success/20">
                      <p className="text-xs text-ink-muted mb-1">Duration</p>
                      <p className="text-success-dark font-medium">{walk.duration} min</p>
                      <p className="text-xs text-success/70">Completed</p>
                    </div>
                  )}
                </div>

                {(walk.startLocation || walk.endLocation) && (
                  <div className="mb-4 space-y-1.5">
                    {walk.startLocation && (
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <Navigation className="w-3 h-3 text-success shrink-0" />
                        <span>Start: {walk.startLocation.address || `${walk.startLocation.lat.toFixed(4)}, ${walk.startLocation.lng.toFixed(4)}`}</span>
                      </div>
                    )}
                    {walk.endLocation && (
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <MapPin className="w-3 h-3 text-danger shrink-0" />
                        <span>End: {walk.endLocation.address || `${walk.endLocation.lat.toFixed(4)}, ${walk.endLocation.lng.toFixed(4)}`}</span>
                      </div>
                    )}
                  </div>
                )}

                {walk.notes && (
                  <p className="text-xs text-ink-muted mb-4 italic p-2.5 rounded-xl bg-surface-secondary">"{walk.notes}"</p>
                )}

                {walk.status === 'assigned' && (
                  <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                    <Button variant="success" size="md" icon={<Play className="w-4 h-4" />} loading={isGpsLoading} onClick={() => handleStart(walk.id)}>
                      {isGpsLoading ? 'Getting GPS...' : 'Start Walk'}
                    </Button>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <AlertCircle className="w-3 h-3" /> GPS location will be captured
                    </div>
                  </div>
                )}

                {walk.status === 'active' && (
                  <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                    <Button variant="danger" size="md" icon={<Square className="w-4 h-4" />} loading={isGpsLoading} onClick={() => handleEnd(walk.id)}>
                      {isGpsLoading ? 'Getting GPS...' : 'End Walk'}
                    </Button>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Clock className="w-3 h-3" /> Duration will be calculated
                    </div>
                  </div>
                )}

                {walk.status === 'completed' && (
                  <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                    <div className="text-sm text-success-dark font-medium">ZMW {walk.walkerEarning} earned</div>
                    {payment && <PaymentBadge status={payment.status} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
