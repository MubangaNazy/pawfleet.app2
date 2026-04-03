import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowRight } from 'lucide-react';

export default function OwnerDogs() {
  const { data, currentUser } = useApp();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">My Dogs</h1>
        <p className="text-ink-secondary mt-1">{myDogs.length} registered dogs</p>
      </div>

      {myDogs.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <p className="text-4xl mb-4">🐕</p>
          <p className="font-medium text-ink">No dogs registered</p>
          <p className="text-ink-muted text-sm mt-1">Contact your admin to add your dogs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myDogs.map(dog => {
            const dogWalks = data.walks.filter(w => w.dogId === dog.id);
            const completedWalks = dogWalks.filter(w => w.status === 'completed');
            const lastWalk = completedWalks.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];

            return (
              <div key={dog.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                    {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-16 h-16 object-cover" /> : <span className="text-3xl">🐕</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink text-lg">{dog.name}</h3>
                    {dog.breed && <p className="text-sm text-ink-muted">{dog.breed}</p>}
                    {dog.age && <p className="text-xs text-ink-muted">{dog.age} years old</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-surface-border">
                    <p className="text-lg font-bold text-ink">{completedWalks.length}</p>
                    <p className="text-xs text-ink-muted">Walks</p>
                  </div>
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-surface-border">
                    <p className="text-sm font-medium text-ink">{lastWalk ? format(new Date(lastWalk.scheduledDate), 'MMM d') : 'None'}</p>
                    <p className="text-xs text-ink-muted">Last Walk</p>
                  </div>
                </div>
                <Link to={`/owner/dogs/${dog.id}`}>
                  <Button variant="secondary" fullWidth iconRight={<ArrowRight className="w-4 h-4" />}>
                    View Profile
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
