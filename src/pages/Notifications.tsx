import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowLeft, Megaphone, MapPin, CreditCard, UserPlus, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';
import { format } from 'date-fns';

const TYPE_META: Record<AppNotification['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  walk_booked:     { icon: <MapPin className="w-4 h-4" />,      color: '#2B8A50', bg: '#EBF5EF' },
  walk_accepted:   { icon: <CheckCircle className="w-4 h-4" />, color: '#2B8A50', bg: '#EBF5EF' },
  walk_started:    { icon: <MapPin className="w-4 h-4" />,      color: '#3B82F6', bg: '#EFF6FF' },
  walk_completed:  { icon: <CheckCircle className="w-4 h-4" />, color: '#059669', bg: '#ECFDF5' },
  payment_marked:  { icon: <CreditCard className="w-4 h-4" />,  color: '#7C3AED', bg: '#F5F3FF' },
  walker_signup:   { icon: <UserPlus className="w-4 h-4" />,    color: '#F59E0B', bg: '#FFFBEB' },
  shop_promo:      { icon: <ShoppingBag className="w-4 h-4" />, color: '#EC4899', bg: '#FDF2F8' },
  walker_approved: { icon: <CheckCircle className="w-4 h-4" />, color: '#059669', bg: '#ECFDF5' },
  walker_rejected: { icon: <XCircle className="w-4 h-4" />,     color: '#EF4444', bg: '#FEF2F2' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { currentUser, data, markNotificationRead, markAllNotificationsRead } = useApp();

  const myNotifs = data.notifications
    .filter(n => n.userId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = myNotifs.filter(n => !n.read).length;

  const handleClick = (notif: AppNotification) => {
    if (!notif.read) markNotificationRead(notif.id);
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
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  notif.read
                    ? 'bg-white border-surface-border'
                    : 'bg-white border-primary/30 shadow-sm'
                }`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.read ? 'text-ink' : 'text-ink'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                    )}
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
    </div>
  );
}
