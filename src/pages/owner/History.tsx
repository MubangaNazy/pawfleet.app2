import React, { useState } from 'react';
import { format, differenceInMinutes, isToday, isYesterday, isThisWeek } from 'date-fns';
import { Clock, MapPin, Star, X, RefreshCw, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { WalkStatus } from '../../types';
import PaymentModal from '../../components/ui/PaymentModal';
import RatingModal from '../../components/ui/RatingModal';

type Filter = 'all' | WalkStatus;

const filterTabs: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Upcoming',  value: 'assigned' },
  { label: 'Active',    value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
];

function walkTypeInfo(notes: string | undefined) {
  if (!notes) return { emoji: '🦮', label: 'Walk' };
  if (notes.startsWith('HOME_GROOMING:') || notes.startsWith('GROOMING:')) return { emoji: '✂️', label: 'Grooming' };
  if (notes.startsWith('VET BOOKING:'))   return { emoji: '🩺', label: 'Vet' };
  if (notes.includes('GROOMING'))         return { emoji: '✂️', label: 'Grooming' };
  return { emoji: '🦮', label: 'Walk' };
}

function dateGroupLabel(date: Date): string {
  if (isToday(date))     return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date))  return 'This Week';
  return format(date, 'MMMM yyyy');
}

export default function OwnerHistory() {
  const { data, currentUser, markPaymentPaid, cancelWalk, createWalk } = useApp();
  const [filter, setFilter]           = useState<Filter>('all');
  const [ratingWalkId, setRatingWalkId]   = useState<string | null>(null);
  const [confirmWalkId, setConfirmWalkId] = useState<string | null>(null);
  const [cancellingId, setCancellingId]   = useState<string | null>(null);

  const myWalks = data.walks
    .filter(w => w.ownerId === currentUser?.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const filtered = myWalks.filter(w => filter === 'all' ? true : w.status === filter);

  const completedCount = myWalks.filter(w => w.status === 'completed').length;
  const activeCount    = myWalks.filter(w => w.status === 'active').length;

  // Group by date label
  const groups: { label: string; walks: typeof filtered }[] = [];
  for (const walk of filtered) {
    const label = dateGroupLabel(new Date(walk.scheduledDate));
    const existing = groups.find(g => g.label === label);
    if (existing) existing.walks.push(walk);
    else groups.push({ label, walks: [walk] });
  }

  return (
    <div className="bg-[#F4F9F6] min-h-screen pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold italic"
            style={{ background: 'linear-gradient(135deg, #1B4332, #52B788)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Walk History
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#5A8A70' }}>{myWalks.length} total · {completedCount} completed{activeCount > 0 ? ` · ${activeCount} active` : ''}</p>
        </div>

        {/* Stats row */}
        {myWalks.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',     value: myWalks.length,   emoji: '📋', color: '#1B4332', bg: '#EBF5EF' },
              { label: 'Completed', value: completedCount,   emoji: '✅', color: '#059669', bg: '#ECFDF5' },
              { label: 'Active',    value: activeCount,      emoji: '🟢', color: '#2B8A50', bg: '#F0FFF4' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3.5 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <div className="text-xl mb-1">{s.emoji}</div>
                <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map(tab => {
            const count = tab.value === 'all' ? myWalks.length : myWalks.filter(w => w.status === tab.value).length;
            const active = filter === tab.value;
            return (
              <button key={tab.value} onClick={() => setFilter(tab.value)}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-bold transition-all"
                style={{
                  background: active ? '#1B4332' : 'white',
                  color: active ? 'white' : '#6B7280',
                  border: active ? '2px solid #1B4332' : '2px solid #DDE9E2',
                }}>
                {tab.label}
                {count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? 'rgba(255,255,255,0.2)' : '#F3F4F6', color: active ? 'white' : '#6B7280' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#DDE9E2]">
            <p className="text-4xl mb-3">🐾</p>
            <p className="font-bold text-ink">No walks here</p>
            <p className="text-sm text-ink-muted mt-1">
              {filter === 'all' ? "You haven't booked any walks yet." : `No ${filter} walks in your history.`}
            </p>
          </div>
        )}

        {/* Grouped walk list */}
        {groups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2.5 px-1">{group.label}</p>
            <div className="space-y-3">
              {group.walks.map(walk => {
                const dog     = data.dogs.find(d => d.id === walk.dogId);
                const walker  = data.users.find(u => u.id === walk.walkerId);
                const payment = data.payments.find(p => p.walkId === walk.id);
                const type    = walkTypeInfo(walk.notes);

                return (
                  <div key={walk.id} className="bg-white rounded-2xl border border-[#DDE9E2] overflow-hidden"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                    {/* Card header */}
                    <div className="flex items-center gap-3 p-4 pb-3">
                      {/* Dog avatar with type emoji overlay */}
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#EBF5EF] shrink-0 flex items-center justify-center border border-primary/10">
                        {dog?.imageUrl
                          ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                          : <span className="text-2xl">{type.emoji}</span>}
                        {dog?.imageUrl && (
                          <span className="absolute bottom-0.5 right-0.5 text-sm bg-white rounded-full px-0.5">{type.emoji}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-bold text-ink truncate">{dog?.name || 'Unknown'}</p>
                            {dog?.breed && <p className="text-xs text-ink-muted truncate hidden sm:block">{dog.breed}</p>}
                          </div>
                          <StatusBadge status={walk.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'EEE, MMM d · h:mm a')}</span>
                        </div>
                        {walker && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                              {walker.name[0]}
                            </div>
                            <span className="text-xs text-ink-muted">{walker.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details strip */}
                    <div className="flex items-center gap-4 px-4 py-2.5 bg-[#F4F9F6] border-t border-[#DDE9E2]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold capitalize" style={{ color: '#2B8A50' }}>{type.label}</span>
                      </div>
                      {walk.duration && (
                        <div className="flex items-center gap-1 text-xs text-ink-muted">
                          <Clock className="w-3 h-3" />{walk.duration} min
                        </div>
                      )}
                      {walk.status === 'active' && walk.startLocation?.address && (
                        <div className="flex items-center gap-1 text-xs text-success-dark min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{walk.startLocation.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions area */}
                    {(() => {
                      const actions: React.ReactNode[] = [];

                      /* Active walk — track button */
                      if (walk.status === 'active') {
                        actions.push(
                          <a key="track" href={`/owner/track/${walk.id}`}
                            className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                            📍 Live Track <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        );
                      }

                      /* Pending/assigned — cancel */
                      if (walk.status === 'pending' || walk.status === 'assigned') {
                        const waitMin  = differenceInMinutes(new Date(), new Date(walk.createdAt));
                        const canCancel = walk.status === 'assigned' || waitMin >= 10;
                        if (!canCancel) {
                          actions.push(
                            <p key="wait" className="text-xs text-amber-600 font-medium py-1">
                              ⏳ Waiting for walker — auto-cancel in {10 - waitMin}m
                            </p>
                          );
                        } else {
                          actions.push(
                            <button key="cancel" type="button"
                              onClick={() => setCancellingId(walk.id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-danger px-3 py-2 rounded-xl border border-danger/30 bg-danger/5 hover:bg-danger/10 transition-colors active:scale-95">
                              <X className="w-3.5 h-3.5" />
                              {walk.status === 'pending' ? 'Cancel Request' : 'Cancel Walk'}
                            </button>
                          );
                        }
                      }

                      /* Cancelled — rebook */
                      if (walk.status === 'cancelled') {
                        actions.push(
                          <button key="rebook" type="button"
                            onClick={() => {
                              if (!currentUser) return;
                              createWalk({
                                dogId: walk.dogId, ownerId: currentUser.id,
                                status: 'pending',
                                scheduledDate: new Date(Date.now() + 86400000).toISOString(),
                                duration: walk.duration || 30, price: walk.price,
                                walkerEarning: walk.walkerEarning,
                                notes: walk.notes?.includes('CANCEL_REASON') ? '' : walk.notes,
                              });
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                            <RefreshCw className="w-3.5 h-3.5" /> Rebook
                          </button>
                        );
                      }

                      /* Completed — pay + rate */
                      if (walk.status === 'completed') {
                        if (payment && (payment.status === 'held' || payment.status === 'unpaid')) {
                          actions.push(
                            <button key="pay" type="button" onClick={() => setConfirmWalkId(walk.id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl active:scale-95"
                              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                              ✅ Confirm & Pay
                            </button>
                          );
                        }
                        if (walk.rating) {
                          actions.push(
                            <div key="rating" className="flex items-center gap-1">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= walk.rating! ? 'fill-amber-400 text-amber-400' : 'text-surface-border fill-surface-border'}`} />
                              ))}
                              {walk.ratingComment && <span className="text-xs text-ink-muted ml-1 italic">"{walk.ratingComment}"</span>}
                            </div>
                          );
                        } else {
                          actions.push(
                            <button key="rate" type="button" onClick={() => setRatingWalkId(walk.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 active:scale-95">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rate walk
                            </button>
                          );
                        }
                      }

                      if (actions.length === 0) return null;
                      return (
                        <div className="px-4 py-3 border-t border-[#DDE9E2] flex flex-wrap items-center gap-2">
                          {actions}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      </div>

      {/* Cancel confirm sheet */}
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
              className="w-full py-3 rounded-2xl text-sm font-medium text-ink-muted">
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
        const walker  = data.users.find(u => u.id === w?.walkerId);
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
