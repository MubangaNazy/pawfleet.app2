import React from 'react';
import { Phone, Dog } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';

export default function AdminOwners() {
  const { data } = useApp();
  const owners = data.users.filter(u => u.role === 'owner');

  const getOwnerDogs = (ownerId: string) => data.dogs.filter(d => d.ownerId === ownerId);
  const getOwnerWalks = (ownerId: string) => data.walks.filter(w => w.ownerId === ownerId);

  const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dog Owners</h1>
        <p className="text-ink-secondary mt-1">{owners.length} registered owners, {data.dogs.length} dogs total</p>
      </div>

      {owners.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <p className="text-ink-muted">No owners registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {owners.map(owner => {
            const dogs = getOwnerDogs(owner.id);
            const walks = getOwnerWalks(owner.id);
            const completedWalks = walks.filter(w => w.status === 'completed').length;
            const pendingWalks = walks.filter(w => w.status === 'pending' || w.status === 'assigned').length;
            const activeWalk = walks.find(w => w.status === 'active');

            return (
              <div key={owner.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
                {/* Owner header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">{getInitials(owner.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink truncate">{owner.name}</h3>
                      {activeWalk && (
                        <span className="flex items-center gap-1 text-xs text-success bg-success-light px-2 py-0.5 rounded-full border border-success/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" /> Active Walk
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                      <Phone className="w-3 h-3" /> {owner.phone}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border text-center">
                    <p className="text-lg font-bold text-ink">{dogs.length}</p>
                    <p className="text-xs text-ink-muted">Dogs</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-success-light border border-success/10 text-center">
                    <p className="text-lg font-bold text-success-dark">{completedWalks}</p>
                    <p className="text-xs text-ink-muted">Completed</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary-50 border border-primary/10 text-center">
                    <p className="text-lg font-bold text-primary">{pendingWalks}</p>
                    <p className="text-xs text-ink-muted">Upcoming</p>
                  </div>
                </div>

                {/* Dogs list */}
                {dogs.length > 0 && (
                  <div className="pt-3 border-t border-surface-border">
                    <p className="text-xs text-ink-muted mb-2 flex items-center gap-1.5">
                      <Dog className="w-3.5 h-3.5" /> Dogs
                    </p>
                    <div className="space-y-2">
                      {dogs.map(dog => {
                        const lastWalk = data.walks
                          .filter(w => w.dogId === dog.id && w.status === 'completed')
                          .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
                        return (
                          <div key={dog.id} className="flex items-center justify-between bg-surface-secondary rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                                {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-8 h-8 object-cover" /> : <span className="text-sm">🐕</span>}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-ink">{dog.name}</span>
                                {dog.breed && <span className="text-xs text-ink-muted ml-1">· {dog.breed}</span>}
                                {dog.age && <span className="text-xs text-ink-muted ml-1">· {dog.age}yr</span>}
                              </div>
                            </div>
                            {lastWalk && <StatusBadge status={lastWalk.status} />}
                          </div>
                        );
                      })}
                    </div>
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
