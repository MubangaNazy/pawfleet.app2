import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { format, isToday } from 'date-fns';
import { CheckCircle, Clock, ArrowRight, Flame, TrendingUp, ChevronRight, Users } from 'lucide-react';
import SubscriptionBanner from '../../components/ui/SubscriptionBanner';
import { useApp } from '../../context/AppContext';
import Onboarding from '../../components/ui/Onboarding';
import { SkeletonWalkerDashboard } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import WalkRequestPopup, { getDeclinedWalks, addDeclinedWalk } from '../../components/ui/WalkRequestPopup';
import { WalkingDogIllustration } from '../../components/ui/Illustrations';
import type { User } from '../../types';
import GoOnlineCard from '../../components/walker/GoOnlineCard';
import { useDirectInbox } from '../../lib/directMessages';
import { canWalkerTakeOpenJob } from '../../lib/jobs';

const WALK_SLIDES = [
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=85',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=85',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=85',
];

export default function WalkerDashboard() {
  const { data, currentUser, getWalkerStats, loading, sendNotification } = useApp();
  const { unreadTotal: unreadMessages } = useDirectInbox(currentUser?.id);

  const [popupWalkId, setPopupWalkId] = useState<string | null>(null);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const shownPopupsRef = React.useRef<Set<string>>(new Set());
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
    .filter(w => w.status === 'pending' && !w.walkerId && !declinedIds.has(w.id) && canWalkerTakeOpenJob(w, currentUser))
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

  // Check if walker has already applied to be a trainer
  const trainerStatus = (currentUser?.pricing as any)?.trainerStatus as string | undefined;

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

  if (loading) return <SkeletonWalkerDashboard />;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {currentUser && <Onboarding userId={currentUser.id} role="walker" />}
      <SubscriptionBanner />
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-0 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="text-white">
              <p className="text-white/70 text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
              <h1 className="mt-0.5 flex items-center gap-2 flex-wrap">
                <span
                  className="text-[28px] font-black italic tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #A7F3D0 0%, #ffffff 50%, #52B788 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'fadeSlideIn 0.6s ease both',
                  }}
                >
                  {greeting}, {firstName}
                </span>
                <span className="text-[28px]" style={{ animation: 'pawBounce 1.2s ease 0.5s both' }}>🐾</span>
              </h1>
              <style>{`
                @keyframes fadeSlideIn {
                  from { opacity: 0; transform: translateY(8px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes pawBounce {
                  0%   { opacity: 0; transform: scale(0.4) rotate(-20deg); }
                  60%  { transform: scale(1.25) rotate(8deg); }
                  80%  { transform: scale(0.92) rotate(-4deg); }
                  100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
              `}</style>
              <p className="text-white/70 text-sm mt-1 font-medium">Here's your day</p>
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
        {/* Go online so owners nearby can find and book you */}
        <GoOnlineCard />

        {/* Become a Trainer CTA */}
        {trainerStatus !== 'approved' && (
          <button type="button" onClick={() => setShowTrainerModal(true)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={trainerStatus === 'applied'
              ? { background: '#FFFBEB', border: '1.5px solid #FDE68A' }
              : { background: 'linear-gradient(135deg, #0f3020 0%, #1B4332 60%, #2B8A50 100%)', boxShadow: '0 4px 18px rgba(27,67,50,0.32)' }}>
            {/* Trainer icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: trainerStatus === 'applied' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.14)' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                {/* Whistle body */}
                <rect x="2" y="11" width="14" height="8" rx="4" fill={trainerStatus === 'applied' ? '#92400E' : 'white'} opacity="0.9"/>
                {/* Whistle mouthpiece */}
                <rect x="14" y="13" width="8" height="4" rx="2" fill={trainerStatus === 'applied' ? '#92400E' : 'white'} opacity="0.85"/>
                {/* Whistle hole */}
                <circle cx="7" cy="15" r="1.8" fill={trainerStatus === 'applied' ? '#FFFBEB' : '#1B4332'}/>
                {/* Sound waves */}
                <path d="M20 8 Q22 10 22 13" stroke={trainerStatus === 'applied' ? '#92400E' : 'white'} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
                <path d="M22 6 Q25 9.5 25 13" stroke={trainerStatus === 'applied' ? '#92400E' : 'white'} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.45"/>
                {/* Paw badge */}
                <circle cx="5.5" cy="5.5" r="4" fill={trainerStatus === 'applied' ? '#F59E0B' : '#52B788'}/>
                <circle cx="5.5" cy="5.5" r="1.4" fill="white"/>
                <circle cx="3.2" cy="3.5" r="0.9" fill="white"/>
                <circle cx="7.8" cy="3.5" r="0.9" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-extrabold text-sm ${trainerStatus === 'applied' ? 'text-amber-800' : 'text-white'}`}>
                {trainerStatus === 'applied' ? 'Trainer Application Pending' : 'Become a Dog Trainer'}
              </p>
              <p className={`text-xs mt-0.5 ${trainerStatus === 'applied' ? 'text-amber-600' : 'text-white/65'}`}>
                {trainerStatus === 'applied' ? 'Under review by admin — we\'ll notify you' : 'Earn more by offering training services'}
              </p>
            </div>
            {trainerStatus !== 'applied' && <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />}
          </button>
        )}

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
            { to: '/walker/chats',    emoji: '💬', label: 'Chat',     badge: unreadMessages > 0 ? unreadMessages : null, badgeType: 'red' as const },
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
                      <p className="text-xs text-ink-muted">{owner?.name}{walk.scheduledDate ? ` · ${format(new Date(walk.scheduledDate), 'MMM d, h:mm a')}` : ''}</p>
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
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <WalkingDogIllustration size={140} />
                <p className="text-sm font-semibold text-ink-muted mt-1">No walks scheduled today</p>
                <Link to="/walker/walks" className="text-xs font-bold px-4 py-1.5 rounded-xl mt-1" style={{ color: '#2B8A50', background: '#EBF5EF' }}>
                  Browse available walks →
                </Link>
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
                      <p className="text-xs text-ink-muted">{walk.scheduledDate ? format(new Date(walk.scheduledDate), 'MMM d, h:mm a') : ''}</p>
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

        {/* Community banner */}
        <Link to="/walker/community"
          className="relative block overflow-hidden rounded-2xl active:scale-[0.98] transition-all"
          style={{ height: 150 }}>
          <img src="/images/community.png" alt="Community" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(27,67,50,0.72) 0%, rgba(43,138,80,0.45) 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="text-base font-extrabold text-white leading-tight">PawFleet Community</p>
            <p className="text-xs text-white/80 mt-0.5">Connect with walkers &amp; owners in Zambia</p>
          </div>
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
            Join →
          </div>
        </Link>

        {/* Shop banner */}
        <Link to="/walker/shop"
          className="relative block overflow-hidden rounded-2xl active:scale-[0.98] transition-all mt-0"
          style={{ height: 120 }}>
          <img src="/images/dog treats  (1).png" alt="Shop" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(27,67,50,0.80) 0%, rgba(27,67,50,0.30) 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-center p-4">
            <p className="text-base font-extrabold text-white">Shop Treats &amp; Gear</p>
            <p className="text-xs text-white/75 mt-0.5">Order supplies for your walks</p>
          </div>
          <div className="absolute right-3 bottom-3 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: '#2B8A50' }}>
            Shop Now →
          </div>
        </Link>

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

      {/* ── Trainer Application Modal ── */}
      {showTrainerModal && (
        <TrainerApplicationModal
          walker={currentUser!}
          onClose={() => setShowTrainerModal(false)}
        />
      )}
    </div>
  );
}

// ── Trainer Application Modal ──────────────────────────────────
function TrainerApplicationModal({ walker, onClose }: { walker: User; onClose: () => void }) {
  const { updateUser, sendNotification, data } = useApp();
  const [step, setStep] = React.useState<'info' | 'form' | 'done'>('info');
  const [experience, setExperience] = React.useState('');
  const [motivation, setMotivation] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const adminUser = data.users.find(u => u.role === 'admin');

  const handleSubmit = async () => {
    setSubmitting(true);
    const existing = (walker.pricing as any) || {};
    await updateUser(walker.id, {
      pricing: {
        ...existing,
        trainerStatus: 'applied',
        trainerAppliedAt: new Date().toISOString(),
        experience,
        motivation,
      },
    });
    const adminId = adminUser?.id ?? '47ba55a7-0484-4047-bd56-1aa383aa1c7b';
    sendNotification(adminId, 'trainer_application', 'Trainer Application', `${walker.name} has applied to become a dog trainer`, {
      walkerId: walker.id, walkerName: walker.name, experience, motivation,
    });
    setSubmitting(false);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-border" />
        </div>

        {step === 'info' && (
          <div className="px-6 pb-10">
            {/* Icon */}
            <div className="flex justify-center mt-4 mb-5">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="4" y="20" width="22" height="13" rx="6.5" fill="white" opacity="0.9"/>
                  <rect x="24" y="23" width="14" height="7" rx="3.5" fill="white" opacity="0.85"/>
                  <circle cx="12" cy="26" r="3" fill="#1B4332"/>
                  <path d="M33 13 Q36 17 36 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
                  <path d="M36 10 Q40 16 40 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
                  <circle cx="10" cy="10" r="7" fill="#52B788"/>
                  <circle cx="10" cy="10" r="2.5" fill="white"/>
                  <circle cx="6.5" cy="6.5" r="1.5" fill="white"/>
                  <circle cx="13.5" cy="6.5" r="1.5" fill="white"/>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-extrabold text-ink text-center mb-1">Become a Dog Trainer</h2>
            <p className="text-sm text-ink-secondary text-center mb-6">Join PawFleet's certified trainer programme and earn more</p>

            <div className="space-y-3 mb-7">
              {[
                { icon: '💰', title: 'Higher earnings', desc: 'Trainers earn K3,500–K6,000 per training package' },
                { icon: '📋', title: 'Flexible schedule', desc: '35–60 min daily sessions, 14-day programmes' },
                { icon: '🎓', title: 'PawFleet certified', desc: 'Get a verified trainer badge on your profile' },
                { icon: '🐕', title: 'Basic & security training', desc: 'Commands, aggression control, protection training' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3.5 rounded-2xl border border-surface-border">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-bold text-ink text-sm">{item.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep('form')}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-base"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
              Apply Now →
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className="px-6 pb-10">
            <h2 className="text-lg font-extrabold text-ink mb-1 mt-4">Your application</h2>
            <p className="text-sm text-ink-muted mb-5">Tell us about your experience with dogs</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Dog handling experience</label>
                <textarea
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  rows={3}
                  placeholder="E.g. I've been handling dogs for 3 years, helped train guard dogs..."
                  className="w-full px-4 py-3 rounded-2xl border border-surface-border text-sm text-ink resize-none focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Why do you want to be a trainer?</label>
                <textarea
                  value={motivation}
                  onChange={e => setMotivation(e.target.value)}
                  rows={3}
                  placeholder="E.g. I'm passionate about working with dogs and want to help owners..."
                  className="w-full px-4 py-3 rounded-2xl border border-surface-border text-sm text-ink resize-none focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting || !experience.trim()}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-base mt-6 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-6 pb-12 text-center">
            <p className="text-5xl mt-8 mb-4">🎉</p>
            <h2 className="text-xl font-extrabold text-ink mb-2">Application Submitted!</h2>
            <p className="text-sm text-ink-secondary mb-8">
              The admin will review your application and contact you within 48 hours. You'll get a notification when approved.
            </p>
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
