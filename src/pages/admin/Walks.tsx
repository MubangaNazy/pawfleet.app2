import React, { useState } from 'react';
import { format } from 'date-fns';
import { ListChecks, UserCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { WalkStatus } from '../../types';

type Filter = 'all' | WalkStatus;

const filterTabs: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AdminWalks() {
  const { data, assignWalker, cancelWalk } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedWalkerId, setSelectedWalkerId] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const walkers = data.users.filter(u => u.role === 'walker');

  const filtered = data.walks
    .filter(w => filter === 'all' ? true : w.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAssign = () => {
    if (assignModal && selectedWalkerId) {
      assignWalker(assignModal, selectedWalkerId);
      setAssignModal(null);
      setSelectedWalkerId('');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">All Walks</h1>
        <p className="text-ink-secondary mt-1">{data.walks.length} total walks</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl overflow-x-auto border border-surface-border flex-nowrap pb-1">
        {filterTabs.map(tab => {
          const count = tab.value === 'all' ? data.walks.length : data.walks.filter(w => w.status === tab.value).length;
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

      {/* Walk cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <ListChecks className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No walks found</p>
          <p className="text-ink-muted text-sm mt-1">{filter === 'all' ? 'No walks have been created yet.' : `No ${filter} walks.`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const owner = data.users.find(u => u.id === walk.ownerId);
            const walker = data.users.find(u => u.id === walk.walkerId);
            const canAssign = walk.status === 'pending' || walk.status === 'assigned';
            const canCancel = walk.status === 'pending' || walk.status === 'assigned';

            return (
              <div key={walk.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" /> : <span className="text-lg">🐕</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{dog?.name || 'Unknown Dog'}</p>
                      {dog?.breed && <p className="text-xs text-ink-muted">{dog.breed}</p>}
                    </div>
                  </div>
                  <StatusBadge status={walk.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-ink-muted mb-0.5">Owner</p>
                    <p className="text-ink font-medium">{owner?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted mb-0.5">Walker</p>
                    <p className={walker ? 'text-ink font-medium' : 'text-ink-muted italic'}>{walker?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted mb-0.5">Scheduled</p>
                    <p className="text-ink">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted mb-0.5">Price</p>
                    <p className="text-ink">ZMW {walk.price}</p>
                  </div>
                  {walk.duration && (
                    <div>
                      <p className="text-xs text-ink-muted mb-0.5">Duration</p>
                      <p className="text-ink">{walk.duration} min</p>
                    </div>
                  )}
                </div>

                {walk.notes && <p className="text-xs text-ink-muted italic mb-4">"{walk.notes}"</p>}

                {(canAssign || canCancel) && (
                  <div className="flex gap-2 flex-wrap pt-3 border-t border-surface-border">
                    {canAssign && (
                      <Button variant="primary" size="sm" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => { setAssignModal(walk.id); setSelectedWalkerId(walk.walkerId || ''); }}>
                        {walk.walkerId ? 'Reassign' : 'Assign Walker'}
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="ghost" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => setCancelConfirm(walk.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedWalkerId(''); }} title="Assign Walker" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">Select a walker to assign to this walk.</p>
          <Select
            label="Choose Walker"
            options={walkers.map(w => ({ value: w.id, label: w.name }))}
            placeholder="-- Select a walker --"
            value={selectedWalkerId}
            onChange={e => setSelectedWalkerId(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => { setAssignModal(null); setSelectedWalkerId(''); }}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!selectedWalkerId} onClick={handleAssign}>Assign</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancel Walk" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">Are you sure you want to cancel this walk? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setCancelConfirm(null)}>Keep Walk</Button>
            <Button variant="danger" size="sm" onClick={() => { if (cancelConfirm) { cancelWalk(cancelConfirm); setCancelConfirm(null); } }}>Cancel Walk</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
