import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Play, Square, MapPin, Navigation, AlertCircle, MessageCircle, CheckCircle2, X, ThumbsUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PaymentBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { GeoLocation, WalkStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { StaggerList, StaggerItem } from '../../components/ui/Anim';
import { NoWalksIllustration } from '../../components/ui/Illustrations';

const CANCEL_REASONS = [
  { id: 'not_home',  label: 'Owner not home',        icon: '🏠' },
  { id: 'dog_ill',   label: 'Dog is ill / injured',   icon: '🤒' },
  { id: 'emergency', label: 'Personal emergency',     icon: '🚨' },
  { id: 'aggressive',label: 'Dog too aggressive',     icon: '⚠️' },
  { id: 'weather',   label: 'Bad weather',            icon: '🌧️' },
  { id: 'other',     label: 'Other reason',           icon: '📝' },
];

type Filter = 'available' | 'scheduled' | 'all' | WalkStatus;

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
  const { data, currentUser, startWalk, endWalk, assignWalker, cancelWalk, sendNotification } = useApp();
  const [filter, setFilter] = useState<Filter>('available');
  const [gpsLoading, setGpsLoading] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Only show pending unassigned walks for TODAY or past — not future bookings
  const availableWalks = data.walks
    .filter(w => w.status === 'pending' && !w.walkerId && new Date(w.scheduledDate) <= todayEnd)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const myWalks = data.walks
    .filter(w => w.walkerId === currentUser?.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  // Future assigned/pending walks for this walker — pre-booked schedule
  const scheduledWalks = data.walks
    .filter(w => new Date(w.scheduledDate) > todayEnd &&
      (w.status === 'assigned' || w.status === 'pending') &&
      (w.walkerId === currentUser?.id || (!w.walkerId && w.status === 'pending')))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  // Fetch unread message counts for all relevant walks
  useEffect(() => {
    if (!currentUser) return;
    const walkIds = [
      ...myWalks.filter(w => w.status === 'assigned' || w.status === 'active').map(w => w.id),
      ...availableWalks.map(w => w.id),
    ];
    if (!walkIds.length) return;

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(walkIds.map(async walkId => {
        const lastSeen = localStorage.getItem(`chat_seen_${walkId}`) || '1970-01-01T00:00:00Z';
        const { data: msgs } = await supabase
          .from('messages')
          .select('sender_id, user_id, created_at')
          .eq('walk_id', walkId)
          .gt('created_at', lastSeen);
        counts[walkId] = (msgs || []).filter(
          m => (m.sender_id || m.user_id) !== currentUser.id
        ).length;
      }));
      setUnreadCounts(counts);
    };
    fetchCounts();

    // Real-time: increment badge on new incoming messages
    const channels = walkIds.map(walkId =>
      supabase.channel(`unread-badge-${walkId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `walk_id=eq.${walkId}` },
          payload => {
            const msg = payload.new as { sender_id?: string; user_id?: string };
            if ((msg.sender_id || msg.user_id) !== currentUser.id) {
              setUnreadCounts(prev => ({ ...prev, [walkId]: (prev[walkId] || 0) + 1 }));
            }
          }
        ).subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [currentUser?.id, myWalks.length, availableWalks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'available'
    ? availableWalks
    : filter === 'scheduled'
    ? scheduledWalks
    : myWalks.filter(w => filter === 'all' ? true : w.status === filter);

  const filterTabs: { label: string; value: Filter }[] = [
    { label: 'Available', value: 'available' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'My Walks', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  const handleAccept = async (walkId: string) => {
    if (!currentUser) return;
    setAccepting(walkId);
    assignWalker(walkId, currentUser.id);
    await new Promise(r => setTimeout(r, 600));
    setAccepting(null);
    setFilter('all');
  };

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
        <h1 className="pf-heading">Walks</h1>
        <p className="pf-subtitle">{availableWalks.length} available · {myWalks.length} assigned to you</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary border border-surface-border rounded-xl overflow-x-auto flex-nowrap pb-1">
        {filterTabs.map(tab => {
          const count = tab.value === 'available'
            ? availableWalks.length
            : tab.value === 'scheduled'
            ? scheduledWalks.length
            : tab.value === 'all'
            ? myWalks.length
            : myWalks.filter(w => w.status === tab.value).length;
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
        <div className="bg-white border border-surface-border rounded-2xl py-12 px-6 text-center shadow-card flex flex-col items-center gap-3">
          <NoWalksIllustration />
          <p className="pf-heading-sm mt-2">
            {filter === 'available' ? 'No walks available today' : filter === 'scheduled' ? 'No upcoming bookings' : 'No walks in this category'}
          </p>
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            {filter === 'available'
              ? "Today's bookings will appear here when owners post them."
              : filter === 'scheduled'
              ? 'Pre-booked walks for future dates will appear here.'
              : 'Walks will show up here once you accept or start them.'}
          </p>
        </div>
      ) : (
        <StaggerList className="space-y-4">
          {filtered.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const owner = data.users.find(u => u.id === walk.ownerId);
            const isGpsLoading = gpsLoading === walk.id;
            const payment = data.payments.find(p => p.walkId === walk.id);

            return (
              <StaggerItem key={walk.id}>
              <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
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

                {filter === 'available' && walk.status === 'pending' && !walk.walkerId && (
                  <div className="flex items-center gap-3 pt-3 border-t border-surface-border flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAccept(walk.id)}
                      disabled={accepting === walk.id}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
                    >
                      {accepting === walk.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Accepting…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Accept Walk
                        </>
                      )}
                    </button>
                    {/* Pre-booking chat */}
                    <Link
                      to={`/walker/chat/${walk.id}`}
                      className="relative flex items-center gap-2 bg-surface-secondary text-ink text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-hover border border-surface-border transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message Owner
                      {(unreadCounts[walk.id] || 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                          style={{ background: '#DC2626' }}>
                          {unreadCounts[walk.id]}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {walk.status === 'assigned' && (() => {
                  const walkDay = new Date(walk.scheduledDate); walkDay.setHours(0,0,0,0);
                  const today0  = new Date(); today0.setHours(0,0,0,0);
                  const isWalkDay = walkDay <= today0;
                  const isConfirmed = confirmedIds.has(walk.id);
                  return (
                  <div className="flex flex-col gap-2 pt-3 border-t border-surface-border">
                    {!isWalkDay && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {isConfirmed ? (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-700">
                            <CheckCircle2 className="w-4 h-4" /> Confirmed — {format(new Date(walk.scheduledDate), 'EEE, MMM d')}
                          </div>
                        ) : (
                          <>
                            <button type="button"
                              onClick={() => {
                                setConfirmedIds(prev => new Set([...prev, walk.id]));
                                const owner = data.users.find(u => u.id === walk.ownerId);
                                if (owner) sendNotification(owner.id, 'walk_accepted', '✅ Walker Confirmed Booking', `${currentUser?.name} confirmed your scheduled walk on ${format(new Date(walk.scheduledDate), 'EEE, MMM d')}.`, { walkId: walk.id });
                              }}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                              <ThumbsUp className="w-3.5 h-3.5" /> Accept Booking
                            </button>
                            <button type="button"
                              onClick={() => { setCancelTarget(walk.id); setCancelReason(''); }}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 bg-red-50">
                              <X className="w-3.5 h-3.5" /> Decline
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      {isWalkDay && (
                        <Button variant="success" size="md" icon={<Play className="w-4 h-4" />} loading={isGpsLoading} onClick={() => handleStart(walk.id)}>
                          {isGpsLoading ? 'Getting GPS...' : 'Start Walk'}
                        </Button>
                      )}
                      <Link
                        to={`/walker/chat/${walk.id}`}
                        className="relative flex items-center gap-2 bg-surface-secondary text-ink text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-hover border border-surface-border transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                        {(unreadCounts[walk.id] || 0) > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                            style={{ background: '#DC2626' }}>
                            {unreadCounts[walk.id]}
                          </span>
                        )}
                      </Link>
                      {isWalkDay && (
                        <>
                          <button type="button"
                            onClick={() => { setCancelTarget(walk.id); setCancelReason(''); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-danger border border-danger/30 bg-danger/5 hover:bg-danger/10 transition-colors">
                            <X className="w-3.5 h-3.5" /> Cancel Walk
                          </button>
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <AlertCircle className="w-3 h-3" /> GPS captured on start
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {walk.status === 'active' && (
                  <div className="flex items-center gap-3 pt-3 border-t border-surface-border flex-wrap">
                    <Link
                      to={`/walker/live/${walk.id}`}
                      className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Go Live
                    </Link>
                    <Link
                      to={`/walker/chat/${walk.id}`}
                      className="relative flex items-center gap-2 bg-surface-secondary text-ink text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-hover border border-surface-border transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                      {(unreadCounts[walk.id] || 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                          style={{ background: '#DC2626' }}>
                          {unreadCounts[walk.id]}
                        </span>
                      )}
                    </Link>
                    <Button variant="danger" size="md" icon={<Square className="w-4 h-4" />} loading={isGpsLoading} onClick={() => handleEnd(walk.id)}>
                      {isGpsLoading ? 'Getting GPS...' : 'End Walk'}
                    </Button>
                  </div>
                )}

                {walk.status === 'completed' && (
                  <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                    <div className="text-sm text-success-dark font-medium">ZMW {walk.walkerEarning} earned</div>
                    {payment && <PaymentBadge status={payment.status} />}
                  </div>
                )}
              </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      {/* Cancel walk reason modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setCancelTarget(null); }}>
          <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
            style={{ animation: 'slideUp 0.25s ease-out' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-base font-extrabold text-ink mb-1">Cancel Walk</p>
            <p className="text-sm text-ink-muted mb-5">Please tell us why you're cancelling so we can notify the owner.</p>
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map(r => (
                <button key={r.id} type="button"
                  onClick={() => setCancelReason(r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                    cancelReason === r.id
                      ? 'border-danger bg-danger/5'
                      : 'border-surface-border bg-white hover:bg-surface-hover'
                  }`}>
                  <span className="text-xl">{r.icon}</span>
                  <span className={`font-semibold text-sm ${cancelReason === r.id ? 'text-danger' : 'text-ink'}`}>{r.label}</span>
                </button>
              ))}
            </div>
            <button type="button"
              disabled={!cancelReason}
              onClick={() => {
                if (cancelTarget && cancelReason) {
                  cancelWalk(cancelTarget, cancelReason, 'walker');
                  setCancelTarget(null);
                  setFilter('all');
                }
              }}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 active:scale-95 transition-all"
              style={{ background: '#DC2626' }}>
              Confirm Cancellation
            </button>
            <button type="button" onClick={() => setCancelTarget(null)}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">
              Keep this walk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
