import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, History, Star, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { WalkStatus } from '../../types';

type Filter = 'all' | WalkStatus;

const filterTabs: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'assigned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
];

function RatingModal({ walkId, walkerName, onClose }: { walkId: string; walkerName: string; onClose: () => void }) {
  const { addRating } = useApp();
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!stars) return;
    setSaving(true);
    addRating(walkId, stars, comment.trim() || undefined);
    setTimeout(() => { setSaving(false); setDone(true); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-extrabold text-ink text-base">Rate Your Walk</p>
            <p className="text-sm text-ink-muted">How did {walkerName} do?</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl">🌟</div>
            <p className="font-bold text-ink">Thank you for your review!</p>
            <p className="text-sm text-ink-muted">{walkerName} has been notified.</p>
            <button onClick={onClose} className="mt-2 px-8 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>Done</button>
          </div>
        ) : (
          <div className="space-y-5 mt-5">
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setStars(s)}
                  className="transition-transform active:scale-90">
                  <Star className={`w-10 h-10 transition-colors ${
                    s <= (hovered || stars)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-surface-border fill-surface-border'
                  }`} />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm font-semibold text-ink-secondary">
                {['','Poor','Fair','Good','Great','Excellent!'][stars]}
              </p>
            )}
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="Leave a comment (optional)…"
              className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none" />
            <button type="button" onClick={handleSubmit} disabled={!stars || saving}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              {saving
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving…</>
                : <><Star className="w-4 h-4" /> Submit Review</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerHistory() {
  const { data, currentUser } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [ratingWalkId, setRatingWalkId] = useState<string | null>(null);

  const myWalks = data.walks
    .filter(w => w.ownerId === currentUser?.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const filtered = myWalks.filter(w => filter === 'all' ? true : w.status === filter);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Walk History</h1>
        <p className="text-ink-secondary mt-1">All walks for your dogs — {myWalks.length} total</p>
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
          <History className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No walks found</p>
          <p className="text-ink-muted text-sm mt-1">{filter === 'all' ? "You haven't booked any walks yet." : `No ${filter} walks in your history.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const walker = data.users.find(u => u.id === walk.walkerId);

            return (
              <div key={walk.id} className="bg-white border border-surface-border rounded-xl p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" /> : <span className="text-lg">🐕</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="font-semibold text-ink">{dog?.name || 'Unknown'}</span>
                        {dog?.breed && <span className="text-ink-muted text-sm ml-1.5">{dog.breed}</span>}
                      </div>
                      <StatusBadge status={walk.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <p className="text-ink-muted">Date</p>
                        <p className="text-ink font-medium">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-ink-muted">Walker</p>
                        <p className={walker ? 'text-ink font-medium' : 'text-ink-muted italic'}>{walker?.name || 'Unassigned'}</p>
                      </div>
                      {walk.duration && (
                        <div>
                          <p className="text-ink-muted">Duration</p>
                          <div className="flex items-center gap-1 text-ink font-medium">
                            <Clock className="w-3 h-3" /> {walk.duration} min
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-ink-muted">Price</p>
                        <p className="text-ink font-medium">ZMW {walk.price}</p>
                      </div>
                    </div>
                    {walk.status === 'active' && walk.startLocation && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-success-dark">
                        <MapPin className="w-3 h-3" />
                        <span>In progress near {walk.startLocation.address}</span>
                      </div>
                    )}
                    {walk.notes && <p className="mt-2 text-xs text-ink-muted italic">"{walk.notes}"</p>}

                    {/* Rating display / prompt */}
                    {walk.status === 'completed' && (
                      walk.rating ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= walk.rating! ? 'fill-amber-400 text-amber-400' : 'text-surface-border fill-surface-border'}`} />
                          ))}
                          {walk.ratingComment && <span className="text-xs text-ink-muted ml-1 italic">"{walk.ratingComment}"</span>}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRatingWalkId(walk.id)}
                          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" /> Rate this walk
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ratingWalkId && (() => {
        const w = myWalks.find(w => w.id === ratingWalkId);
        const walkerUser = data.users.find(u => u.id === w?.walkerId);
        return (
          <RatingModal
            walkId={ratingWalkId}
            walkerName={walkerUser?.name || 'Your walker'}
            onClose={() => setRatingWalkId(null)}
          />
        );
      })()}
    </div>
  );
}
