import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowLeft, MapPin, CreditCard, UserPlus, CheckCircle, XCircle, ShoppingBag, ChevronRight, Star, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';
import { format } from 'date-fns';

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  walk_booked:     { icon: <MapPin className="w-4 h-4" />,      color: '#2B8A50', bg: '#EBF5EF' },
  walk_accepted:   { icon: <CheckCircle className="w-4 h-4" />, color: '#2B8A50', bg: '#EBF5EF' },
  walk_started:    { icon: <MapPin className="w-4 h-4" />,      color: '#3B82F6', bg: '#EFF6FF' },
  walk_completed:  { icon: <CheckCircle className="w-4 h-4" />, color: '#059669', bg: '#ECFDF5' },
  payment_marked:  { icon: <CreditCard className="w-4 h-4" />,  color: '#7C3AED', bg: '#F5F3FF' },
  walker_signup:   { icon: <UserPlus className="w-4 h-4" />,    color: '#F59E0B', bg: '#FFFBEB' },
  shop_promo:      { icon: <ShoppingBag className="w-4 h-4" />, color: '#EC4899', bg: '#FDF2F8' },
  shop_message:    { icon: <ShoppingBag className="w-4 h-4" />, color: '#1B4332', bg: '#EBF5EF' },
  shop_order:      { icon: <ShoppingBag className="w-4 h-4" />, color: '#1B4332', bg: '#EBF5EF' },
  walker_approved: { icon: <CheckCircle className="w-4 h-4" />, color: '#059669', bg: '#ECFDF5' },
  walker_rejected: { icon: <XCircle className="w-4 h-4" />,     color: '#EF4444', bg: '#FEF2F2' },
  achievement:     { icon: <Star className="w-4 h-4" />,        color: '#D97706', bg: '#FFFBEB' },
};

function parseAchievementNotif(notif: AppNotification) {
  const icon  = notif.data?.achievementIcon  || notif.title.replace('Achievement Unlocked!', '').trim() || '🏆';
  const label = notif.data?.achievementLabel || (() => {
    const m = notif.body.match(/You earned "(.+?)"/);
    return m ? m[1] : 'Achievement';
  })();
  const description = notif.data?.achievementDescription || (() => {
    const m = notif.body.match(/— (.+)$/);
    return m ? m[1] : notif.body;
  })();
  return { icon, label, description };
}

function AchievementBadgeModal({ notif, onClose }: { notif: AppNotification; onClose: () => void }) {
  const { icon, label, description } = parseAchievementNotif(notif);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ animation: 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>

        {/* Gradient header */}
        <div className="relative pt-10 pb-8 px-6 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>

          {/* Decorative dots */}
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{
                background: 'rgba(255,255,255,0.25)',
                top: `${10 + (i * 17) % 60}%`,
                left: `${5 + (i * 23) % 90}%`,
              }} />
          ))}

          {/* Badge ring + emoji */}
          <div className="relative inline-flex items-center justify-center mx-auto mb-4">
            <div className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '3px solid rgba(255,255,255,0.3)',
                boxShadow: '0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(82,183,136,0.3)',
              }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.95)', fontSize: 44 }}>
                {icon}
              </div>
            </div>
          </div>

          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Achievement Unlocked</p>
          <h2 className="text-2xl font-extrabold text-white">{label}</h2>

          {/* Close button */}
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 text-center">
          <p className="text-sm text-ink-muted leading-relaxed mb-2">{description}</p>
          <p className="text-xs text-ink-muted/60 mb-5">
            {format(new Date(notif.createdAt), 'MMM d, yyyy')}
          </p>

          {/* Progress ring visual */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{ background: '#2B8A50', opacity: i < 3 ? 1 : 0.25 }} />
            ))}
          </div>

          <button type="button" onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            Awesome! 🎉
          </button>
        </div>
      </div>

      <style>{`
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentUser, data, markNotificationRead, markAllNotificationsRead } = useApp();
  const [badgeNotif, setBadgeNotif] = useState<AppNotification | null>(null);

  const myNotifs = data.notifications
    .filter(n => n.userId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = myNotifs.filter(n => !n.read).length;

  const handleClick = (notif: AppNotification) => {
    if (!notif.read) markNotificationRead(notif.id);

    if (notif.type === 'achievement') {
      setBadgeNotif(notif);
      return;
    }

    const walkId = notif.data?.walkId;
    const role = currentUser?.role;
    if (walkId) {
      if (role === 'walker' && (notif.type === 'walk_booked' || notif.type === 'walk_accepted')) {
        navigate(`/walker/walk/${walkId}`);
      } else if (role === 'owner' && notif.type === 'walk_started') {
        navigate(`/owner/track/${walkId}`);
      } else if (role === 'owner' && notif.type === 'walk_accepted') {
        navigate(`/owner/track/${walkId}`);
      } else if (role === 'owner' && notif.type === 'walk_completed') {
        navigate(`/owner/track/${walkId}`);
      }
    } else if (notif.data?.walkerId && role === 'admin') {
      navigate('/admin/walkers');
    }
  };

  const isNavigable = (notif: AppNotification) => {
    if (notif.type === 'achievement') return true;
    const walkId = notif.data?.walkId;
    const role = currentUser?.role;
    if (walkId && role === 'walker' && (notif.type === 'walk_booked' || notif.type === 'walk_accepted')) return true;
    if (walkId && role === 'owner' && (notif.type === 'walk_started' || notif.type === 'walk_accepted' || notif.type === 'walk_completed')) return true;
    if (notif.data?.walkerId && role === 'admin') return true;
    return false;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink">Notifications</h1>
            {unread > 0 && <p className="text-xs text-ink-muted">{unread} unread</p>}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {myNotifs.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <div className="w-14 h-14 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-ink-muted" />
          </div>
          <p className="font-semibold text-ink">No notifications yet</p>
          <p className="text-sm text-ink-muted mt-1">You'll be notified about walks, payments, and more.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myNotifs.map(notif => {
            const meta = TYPE_META[notif.type] || TYPE_META['walk_booked'];
            const isAchievement = notif.type === 'achievement';
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  notif.read
                    ? 'bg-white border-surface-border'
                    : 'bg-white border-primary/30 shadow-sm'
                } ${isAchievement ? 'border-amber-200' : ''}`}
                style={isAchievement ? { background: '#FFFDF5' } : undefined}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: meta.bg, color: meta.color }}>
                  {isAchievement
                    ? <span style={{ fontSize: 18 }}>{notif.data?.achievementIcon || '🏆'}</span>
                    : meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.read ? 'text-ink' : 'text-ink'}`}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.read && (
                        <span className="w-2 h-2 bg-primary rounded-full mt-1.5" />
                      )}
                      {isNavigable(notif) && (
                        <ChevronRight className="w-4 h-4 text-ink-muted mt-0.5" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{notif.body}</p>
                  <p className="text-[11px] text-ink-muted/60 mt-1.5">
                    {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-ink-muted mt-8">
        Made by <span className="font-semibold text-primary">Pegasus AI</span>
      </p>

      {badgeNotif && (
        <AchievementBadgeModal notif={badgeNotif} onClose={() => setBadgeNotif(null)} />
      )}
    </div>
  );
}
