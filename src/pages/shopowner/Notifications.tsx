import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { Bell, Check, ShoppingBag } from 'lucide-react';

export default function ShopOwnerNotifications() {
  const { currentUser, data, markNotificationRead } = useApp();

  // Use Supabase-backed notifications so orders from other users' sessions are visible
  const myNotifs = data.notifications
    .filter(n => n.userId === currentUser?.id && n.type === 'shop_order')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = myNotifs.filter(n => !n.read).length;

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <div>
          <h1 className="text-xl font-extrabold text-white">Order Notifications</h1>
          <p className="text-white/70 text-sm">
            {unreadCount > 0 ? `${unreadCount} new order${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="p-4 space-y-2">
        {myNotifs.length === 0 && (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-ink mb-1">No orders yet</p>
            <p className="text-sm text-ink-muted">You'll be notified here when someone buys from your shop</p>
          </div>
        )}

        {myNotifs.map(notif => {
          const earned = notif.data?.earned ? `K${notif.data.earned}` : '';
          const buyer = notif.data?.buyerName || 'A customer';
          const items = notif.data?.itemSummary || '';
          const deliverTo = notif.data?.address || '';

          return (
            <div key={notif.id}
              className="bg-white border rounded-2xl overflow-hidden transition-all"
              style={{ borderColor: notif.read ? '#F3F4F6' : '#52B788' }}>
              <div className="flex items-start gap-3 p-4">
                <div className="w-12 h-12 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0 text-2xl">
                  🛍️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink text-sm">New Order! 🎉</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        <span className="font-semibold">{buyer}</span> ordered {items}
                      </p>
                      {earned && (
                        <p className="text-xs font-bold mt-1" style={{ color: '#2B8A50' }}>
                          {earned} earned
                        </p>
                      )}
                      {deliverTo && (
                        <p className="text-xs text-ink-muted mt-0.5">📍 Deliver to: {deliverTo}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-ink-muted">
                        {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                      </p>
                      {!notif.read && (
                        <span className="inline-block w-2 h-2 rounded-full mt-1" style={{ background: '#2B8A50' }} />
                      )}
                    </div>
                  </div>
                  {!notif.read && (
                    <button type="button" onClick={() => markNotificationRead(notif.id)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary hover:text-primary transition-colors">
                      <Check className="w-3 h-3" /> Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
