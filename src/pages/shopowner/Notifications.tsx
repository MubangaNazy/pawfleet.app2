import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { Bell, ShoppingBag, ChevronRight } from 'lucide-react';

export default function ShopOwnerNotifications() {
  const { currentUser, data, markNotificationRead } = useApp();
  const navigate = useNavigate();

  const myNotifs = data.notifications
    .filter(n => n.userId === currentUser?.id && n.type === 'shop_order')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = myNotifs.filter(n => !n.read).length;

  const handleClick = (notifId: string) => {
    markNotificationRead(notifId);
    navigate(`/shopowner/orders?orderId=${notifId}`);
  };

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
          const earned    = notif.data?.earned    ? `K${notif.data.earned}` : '';
          const buyer     = notif.data?.buyerName || 'A customer';
          const items     = notif.data?.itemSummary || '';
          const deliverTo = notif.data?.address  || '';
          const phone     = notif.data?.phone    || '';
          const payMethod = notif.data?.paymentMethod || '';
          const payOnDel  = notif.data?.payOnDelivery === 'true';
          const status    = notif.data?.deliveryStatus || 'pending';

          const statusColor = status === 'delivered' ? '#52B788' : status === 'confirmed' ? '#2B8A50' : '#E67E22';
          const statusLabel = status === 'delivered' ? '✅ Delivered' : status === 'confirmed' ? '🚚 On the Way' : '⏳ Pending';

          return (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleClick(notif.id)}
              className="w-full text-left bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-md active:scale-[0.99]"
              style={{ borderColor: !notif.read ? '#52B788' : '#E5E7EB' }}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="w-12 h-12 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0 text-2xl">
                  🛍️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink text-sm">New Order!</p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#2B8A50' }} />
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary mt-0.5 truncate">
                        <span className="font-semibold">{buyer}</span>
                        {items ? ` — ${items}` : ''}
                      </p>
                      {earned && (
                        <p className="text-xs font-bold mt-1" style={{ color: '#2B8A50' }}>{earned} earned</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {deliverTo && (
                          <span className="text-[10px] text-ink-muted truncate max-w-[160px]">📍 {deliverTo}</span>
                        )}
                        {phone && (
                          <span className="text-[10px] text-ink-muted">📞 {phone}</span>
                        )}
                      </div>
                      {payOnDel && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          💵 Pay on Delivery
                        </span>
                      )}
                      <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${statusColor}18`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className="text-[10px] text-ink-muted whitespace-nowrap">
                        {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                      </p>
                      <ChevronRight className="w-4 h-4 text-ink-muted" />
                    </div>
                  </div>
                  <p className="text-[10px] text-primary font-semibold mt-2">
                    Tap to view full order details →
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
