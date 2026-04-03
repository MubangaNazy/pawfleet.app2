import React from 'react';
import { Map } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MapView as MapComponent } from '../../components/map/MapView';
import { StatusBadge } from '../../components/ui/Badge';
import { format } from 'date-fns';

export default function AdminMapView() {
  const { data } = useApp();

  const activeWalks = data.walks.filter(w => w.status === 'active' || w.status === 'assigned');

  const mapWalks = activeWalks.map(walk => ({
    walk,
    walker: data.users.find(u => u.id === walk.walkerId),
    dog: data.dogs.find(d => d.id === walk.dogId),
    owner: data.users.find(u => u.id === walk.ownerId),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Live Map</h1>
        <p className="text-ink-secondary mt-1">Track active walks in real time</p>
      </div>

      {activeWalks.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <Map className="w-12 h-12 text-ink-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink">No Active Walks</h3>
          <p className="text-ink-secondary text-sm mt-2">Active walks will appear on the map when walkers start them.</p>
        </div>
      ) : (
        <>
          <MapComponent walks={mapWalks} height="500px" zoom={14} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mapWalks.map(({ walk, walker, dog, owner }) => (
              <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-lg overflow-hidden">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-9 h-9 object-cover" /> : '🐕'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{dog?.name}</p>
                      <p className="text-xs text-ink-muted">{dog?.breed}</p>
                    </div>
                  </div>
                  <StatusBadge status={walk.status} />
                </div>
                <div className="space-y-1.5 text-xs text-ink-secondary">
                  <div className="flex justify-between">
                    <span>Walker</span>
                    <span className="font-medium text-ink">{walker?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Owner</span>
                    <span className="font-medium text-ink">{owner?.name}</span>
                  </div>
                  {walk.startTime && (
                    <div className="flex justify-between">
                      <span>Started</span>
                      <span className="font-medium text-ink">{format(new Date(walk.startTime), 'h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
