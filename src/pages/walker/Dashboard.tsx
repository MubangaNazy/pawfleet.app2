import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { format, isToday } from 'date-fns';
import { CheckCircle, DollarSign, Clock, ArrowRight, Flame, Star, TrendingUp, ChevronRight } from 'lucide-react';
import SubscriptionBanner from '../../components/ui/SubscriptionBanner';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import WalkRequestPopup, { getDeclinedWalks, addDeclinedWalk } from '../../components/ui/WalkRequestPopup';

const WALK_SLIDES = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=85',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=85',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=85',
];

export default function WalkerDashboard() {
  const { data, currentUser, getWalkerStats } = useApp();

  const [popupWalkId, setPopupWalkId] = useState<string | null>(null);
  const shownPopupsRef = React.useRef<Set<string>>(new Set());
  // Walks this walker has already declined — hidden from their available list
  const [declinedIds, setDeclinedIds] = React.useState<Set<string>>(
    () => currentUser ? getDeclinedWalks(currentUser.id) : new Set()
  );

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'walker') return;
    const myUnread = data.notifications.filter(
      n => n.userId === currentUser.id &&
      !n.read &&
      n.type === 'walk_booked' &&
      n.data?.walkId &&
      !shownPopupsRef.current.has(n.id)
    );
    if (myUnread.length > 0) {
      const latest = myUnread[0];
      shownPopupsRef.current.add(latest.id);
      setPopupWalkId(latest.data!.walkId);
    }
  }, [data.notifications, currentUser]);

  const myWalks    = data.walks.filter(w => w.walkerId === currentUser?.id);
  const myPayments = data.payments.filter(p => p.walkerId === currentUser?.id);

  const todayWalks = myWalks.filter(w =>
    isToday(new Date(w.scheduledDate)) && (w.status === 'assigned' || w.status === 'active')
  );
  const completedToday = myWalks.filter(w => w.status === 'completed' && w.endTime && isToday(new Date(w.endTime)));
  const activeWalk = myWalks.find(w => w.status === 'active');

  const totalEarned  = myPayments.reduce((s, p) => s + p.amount, 0);
  const unpaidBalance = myPayments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  const availableWalks = data.walks
    .filter(w => w.status === 'pending' && !w.walkerId && !declinedIds.has(w.id))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 3);

  const handlePopupDismiss = () => setPopupWalkId(null);
  const handlePopupDecline = (walkId: string) => {
    if (currentUser) {
      addDeclinedWalk(currentUser.id, walkId);
      setDeclinedIds(getDeclinedWalks(currentUser.id));
    }
    setPopupWalkId(null);
  };

  const gamStats = getWalkerStats(currentUser?.id || '');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || '';

  const [imgSlide, setImgSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setImgSlide(s => (s + 1) % WALK_SLIDES.length), 4200);
    return () => clearInterval(id);
  }, []);

  const getLevel = (pts: number) => {
    if (pts >= 1000) return { name: 'Expert',       next: null,  progress: 100 };
    if (pts >= 500)  return { name: 'Professional', next: 1000,  progress: ((pts - 500) / 500) * 100 };
    if (pts >= 200)  return { name: 'Junior',        next: 500,   progress: ((pts - 200) / 300) * 100 };
    return                  { name: 'Rookie',        next: 200,   progress: (pts / 200) * 100 };
  };
  const level = getLevel(gamStats.points);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <SubscriptionBanner />
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-0 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="text-white">
              <p className="text-white/70 text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
              <h1 className="text-2xl font-extrabold">{greeting}, {firstName} 🐾</h1>
              <p className="text-white/75 text-sm mt-1">Here's your day</p>
            </div>
            {gamStats.streak > 0 && (
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-2xl px-3 py-2 shrink-0">
                <Flame className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-bold text-white">{gamStats.streak}d</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-5 pb-6">
            {[
              { label: 'Today',   value: completedToday.length, sub: `${todayWalks.length} left` },
              { label: 'Earned',  value: `K${totalEarned}`,     sub: 'All time' },
              { label: 'Pending', value: `K${unpaidBalance}`,   sub: 'Owed' },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3 text-center">
                <p className="text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-white/70 text-[10px] mt-0.5">{s.label}</p>
                <p className="text-white/50 text-[9px]">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo slideshow strip */}
        <div className="relative -mx-5 overflow-hidden" style={{ height: 200 }}>
          {WALK_SLIDES.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: imgSlide === i ? 1 : 0, transition: 'opacity 0.9s ease' }}
            />
          ))}
          {/* Green fade at top blending into hero */}
          <div className="absolute inset-x-0 top-0 h-10"
            style={{ background: 'linear-gradient(to bottom, #1B4332, transparent)' }} />
          {/* Green fade at bottom blending into content */}
          <div className="absolute inset-x-0 bottom-0 h-16"
            style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)' }} />
          {/* Slide dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 items-center z-10">
            {WALK_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImgSlide(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: imgSlide === i ? 18 : 6,
                  height: 6,
                  background: imgSlide === i ? '#1B4332' : 'rgba(27,67,50,0.35)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Active Walk Banner */}
        {activeWalk && (
          <div className="flex items-center gap-4 px-4 py-4 bg-success/10 border border-success/30 rounded-2xl">
            <div className="flex items-center gap-2.5 flex-1">
              <span className="w-3 h-3 rounded-full bg-success animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold text-success-dark">
                  Walk in Progress — {data.dogs.find(d => d.id === activeWalk.dogId)?.name}
                </p>
                <p className="text-xs text-ink-muted">
                  Started {activeWalk.startTime ? format(new Date(activeWalk.startTime), 'h:mm a') : 'now'}
                </p>
              </div>
            </div>
            <Link to="/walker/walks"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shrink-0"
              style={{ background: '#1B4332' }}>
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Quick action grid */}
        {(() => {
          const unreadWalkerNotifs = data.notifications.filter(
            n => n.userId === currentUser?.id && !n.read && n.type.startsWith('walk')
          );
          const quickItems = [
            { to: '/walker/walks',    emoji: '🐾', label: 'Walks',    badge: availableWalks.length > 0 ? availableWalks.length : null, badgeType: 'amber' as const },
            { to: '/walker/schedule', emoji: '📅', label: 'Schedule', badge: null, badgeType: 'amber' as const },
            { to: '/walker/earnings', emoji: '💰', label: 'Earnings', badge: null, badgeType: 'amber' as const },
            { to: '/walker/guide',    emoji: '📖', label: 'Guide',    badge: null, badgeType: 'amber' as const },
            { to: '/walker/chats',    emoji: '💬', label: 'Chat',     badge: unreadWalkerNotifs.length > 0 ? unreadWalkerNotifs.length : null, badgeType: 'red' as const },
          ];
          return (
            <div className="grid grid-cols-5 gap-3">
              {quickItems.map(({ to, emoji, label, badge, badgeType }) => (
                <Link key={to} to={to}
                  className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-white transition-all active:scale-95"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: '#EBF5EF' }}>
                      {emoji}
                    </div>
                    {badge != null && (
                      <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white ${badgeType === 'amber' ? 'bg-amber-400' : 'bg-red-500'}`}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-ink">{label}</span>
                </Link>
              ))}
            </div>
          );
        })()}

        {/* Available Walks — new walk requests */}
        {availableWalks.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-amber-200" style={{ background: '#FFFBEB' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <h2 className="font-bold text-amber-900 text-sm">New Walks Available</h2>
                <span className="text-[11px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">{availableWalks.length}</span>
              </div>
              <Link to="/walker/walks" className="text-xs font-semibold text-amber-700 flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-amber-100">
              {availableWalks.map(walk => {
                const dog   = data.dogs.find(d => d.id === walk.dogId);
                const owner = data.users.find(u => u.id === walk.ownerId);
                return (
                  <Link key={walk.id} to={`/walker/walk/${walk.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-amber-100/60 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {dog?.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" />
                        : <span className="text-lg">🐕</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{dog?.name || 'Unknown Dog'}</p>
                      <p className="text-xs text-ink-muted">{owner?.name} · {format(new Date(walk.scheduledDate), 'MMM d, h:mm a')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-bold" style={{ color: '#1B4332' }}>K{walk.walkerEarning}</span>
                      <span className="text-[10px] text-amber-600 font-medium">Tap to accept →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's Walks */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-bold text-ink text-sm">Today's Walks</h2>
            <Link to="/walker/walks" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#2B8A50' }}>
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-surface-border">
            {todayWalks.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                <p className="text-sm text-ink-muted">No more walks today</p>
              </div>
            ) : todayWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const owner = data.users.find(u => u.id === walk.ownerId);
              return (
                <Link key={walk.id} to={`/walker/walk/${walk.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-secondary transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" /> : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{dog?.name}</p>
                    <p className="text-xs text-ink-muted">{owner?.name}</p>
                  </div>
                  <StatusBadge status={walk.status} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Upcoming Walks */}
        {upcomingWalks.length > 0 && (
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h2 className="font-bold text-ink text-sm">Upcoming</h2>
              <span className="text-xs text-ink-muted">{upcomingWalks.length} scheduled</span>
            </div>
            <div className="divide-y divide-surface-border">
              {upcomingWalks.map(walk => {
                const dog = data.dogs.find(d => d.id === walk.dogId);
                return (
                  <Link key={walk.id} to={`/walker/walk/${walk.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-secondary transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg overflow-hidden">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-10 h-10 object-cover" /> : '🐕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{dog?.name}</p>
                      <p className="text-xs text-ink-muted">{format(new Date(walk.scheduledDate), 'MMM d, h:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={walk.status} />
                      <ChevronRight className="w-4 h-4 text-ink-muted" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress / Level */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-ink text-sm">Your Progress</h2>
              <p className="text-xs text-ink-muted mt-0.5">{level.name} · {gamStats.points} pts</p>
            </div>
            <Link to="/walker/badges"
              className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#2B8A50' }}>
              Badges <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {level.next && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-ink-muted mb-1.5">
                <span>{level.name}</span>
                <span>{level.next - gamStats.points} pts to next</span>
              </div>
              <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${level.progress}%`, background: '#2B8A50' }} />
              </div>
            </div>
          )}
          {gamStats.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gamStats.badges.slice(0, 4).map(badge => (
                <span key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border text-xs font-medium text-ink">
                  {badge.icon} {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Earnings preview */}
        <div className="bg-white border border-surface-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink text-sm">Earnings</h2>
            <Link to="/walker/earnings" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#2B8A50' }}>
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: TrendingUp, label: 'Total',    value: `K${totalEarned}`,  color: '#2B8A50' },
              { icon: CheckCircle, label: 'Paid',    value: `K${myPayments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0)}`, color: '#2B8A50' },
              { icon: Clock,       label: 'Pending', value: `K${unpaidBalance}`, color: '#F59E0B' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-surface-secondary border border-surface-border">
                <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                <p className="text-sm font-extrabold text-ink">{value}</p>
                <p className="text-[10px] text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {popupWalkId && (
        <WalkRequestPopup
          walkId={popupWalkId}
          onDismiss={handlePopupDismiss}
          onDecline={() => handlePopupDecline(popupWalkId)}
        />
      )}
    </div>
  );
}
