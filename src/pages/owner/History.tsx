import React, { useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Clock, MapPin, History, Star, X, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { WalkStatus } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import RatingModal from '../../components/ui/RatingModal';

type Filter = 'all' | WalkStatus;

const filterTabs: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'assigned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OwnerHistory() {
  const { data, currentUser, markPaymentPaid, cancelWalk, createWalk } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [ratingWalkId, setRatingWalkId] = useState<string | null>(null);
  const [confirmWalkId, setConfirmWalkId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
      <div className="flex gap-1 p-1.5 bg-surface-secondary rounded-2xl overflow-x-auto flex-nowrap scrollbar-none" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
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
        <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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
              <div key={walk.id} className="bg-white rounded-2xl p-4 transition-all" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
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

                    {/* Owner cancel (pending = no response in 10 min; assigned = hasn't started) */}
                    {(walk.status === 'pending' || walk.status === 'assigned') && (() => {
                      const waitMin = differenceInMinutes(new Date(), new Date(walk.createdAt));
                      const canCancel = walk.status === 'assigned' || waitMin >= 10;
                      const isPending = walk.status === 'pending';
                      if (!canCancel) return (
                        <p className="mt-2 text-xs text-amber-600 font-medium">
                          ⏳ Waiting for walker — auto-cancel in {10 - waitMin}m if no response
                        </p>
                      );
                      return (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button"
                            onClick={() => setCancellingId(walk.id)}
                            disabled={cancellingId === walk.id}
                            className="flex items-center gap-1.5 text-xs font-bold text-danger px-3 py-1.5 rounded-xl border border-danger/30 bg-danger/5 hover:bg-danger/10 transition-colors active:scale-95">
                            <X className="w-3.5 h-3.5" />
                            {isPending ? 'Cancel — No Response' : 'Cancel Walk'}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Rebook CTA for cancelled walks */}
                    {walk.status === 'cancelled' && (
                      <div className="mt-3">
                        <p className="text-xs text-ink-muted mb-2">
                          {walk.notes?.startsWith('CANCEL_REASON:')
                            ? `Cancelled: ${walk.notes.split('\n')[0].replace('CANCEL_REASON: ', '')}`
                            : 'This walk was cancelled'}
                        </p>
                        <button type="button"
                          onClick={() => {
                            const dog = data.dogs.find(d => d.id === walk.dogId);
                            if (!currentUser || !dog) return;
                            createWalk({
                              dogId: walk.dogId, ownerId: currentUser.id,
                              status: 'pending',
                              scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                              duration: walk.duration || 30,
                              price: walk.price, walkerEarning: walk.walkerEarning,
                              notes: walk.notes?.includes('CANCEL_REASON') ? '' : walk.notes,
                            });
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-colors active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                          <RefreshCw className="w-3.5 h-3.5" /> Rebook Walk
                        </button>
                      </div>
                    )}

                    {/* Payment confirm CTA */}
                    {walk.status === 'completed' && (() => {
                      const payment = data.payments.find(p => p.walkId === walk.id);
                      if (payment && (payment.status === 'held' || payment.status === 'unpaid')) {
                        return (
                          <button
                            type="button"
                            onClick={() => setConfirmWalkId(walk.id)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-colors"
                            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
                          >
                            ✅ Confirm & Pay Walker
                          </button>
                        );
                      }
                      return null;
                    })()}

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

      {/* Owner cancel confirm */}
      {cancellingId && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setCancellingId(null); }}>
          <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
            style={{ animation: 'slideUp 0.25s ease-out' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-base font-extrabold text-ink">Cancel this walk?</p>
              <p className="text-sm text-ink-muted mt-2">The walker (if assigned) will be notified. You can rebook anytime.</p>
            </div>
            <button type="button"
              onClick={() => { cancelWalk(cancellingId, 'timeout'); setCancellingId(null); }}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm active:scale-95 transition-all mb-3"
              style={{ background: '#DC2626' }}>
              Yes, Cancel Walk
            </button>
            <button type="button" onClick={() => setCancellingId(null)}
              className="w-full py-3 rounded-2xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">
              Keep it
            </button>
          </div>
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

      {confirmWalkId && (() => {
        const w = data.walks.find(w => w.id === confirmWalkId);
        const walker = data.users.find(u => u.id === w?.walkerId);
        const payment = data.payments.find(p => p.walkId === confirmWalkId);
        return (
          <PaymentModal
            amount={w?.walkerEarning || 0}
            description={`Payment to ${walker?.name || 'walker'} for walk`}
            customerName={currentUser?.name || ''}
            customerPhone={currentUser?.phone}
            onConfirm={(method) => {
              if (payment) markPaymentPaid(payment.id, method as any);
              setConfirmWalkId(null);
            }}
            onClose={() => setConfirmWalkId(null)}
          />
        );
      })()}
    </div>
  );
}
