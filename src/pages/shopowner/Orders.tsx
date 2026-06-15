import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import {
  ShoppingBag, MapPin, Phone, CreditCard, Package, Truck,
  CheckCircle2, ChevronDown, ChevronUp, Clock, DollarSign,
} from 'lucide-react';

type DeliveryStatus = 'pending' | 'confirmed' | 'delivered';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: '#E67E22', bg: '#FEF3CD', icon: Clock        },
  confirmed: { label: 'Confirmed', color: '#2B8A50', bg: '#EBF5EF', icon: Package      },
  delivered: { label: 'Delivered', color: '#52B788', bg: '#D1FAE5', icon: CheckCircle2 },
};

const METHOD_LABELS: Record<string, string> = {
  pay_on_delivery: '💵 Pay on Delivery',
  mobile_money:    '📱 Mobile Money',
  cash:            '💵 Cash',
  bank:            '🏦 Bank Transfer',
  online:          '💳 Online / Card',
};

export default function ShopOwnerOrders() {
  const { currentUser, data, updateOrderStatus } = useApp();
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use Supabase-backed notifications as order source (cross-session)
  const orders = data.notifications
    .filter(n => n.userId === currentUser?.id && n.type === 'shop_order')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtered = filter === 'all'
    ? orders
    : orders.filter(n => (n.data?.deliveryStatus || 'pending') === filter);

  const totalRevenue = orders.reduce((s, n) => s + Number(n.data?.earned || 0), 0);

  const pendingCount   = orders.filter(n => (n.data?.deliveryStatus || 'pending') === 'pending').length;
  const confirmedCount = orders.filter(n => (n.data?.deliveryStatus || 'pending') === 'confirmed').length;
  const deliveredCount = orders.filter(n => n.data?.deliveryStatus === 'delivered').length;

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Orders</h1>
        <p className="text-white/70 text-sm mb-4">
          {orders.length} order{orders.length !== 1 ? 's' : ''} · K{totalRevenue.toLocaleString()} total revenue
        </p>

        {/* Status summary pills */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Pending',   count: pendingCount,   status: 'pending'   },
            { label: 'Confirmed', count: confirmedCount, status: 'confirmed' },
            { label: 'Delivered', count: deliveredCount, status: 'delivered' },
          ].map(({ label, count, status }) => (
            <div key={status} className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="text-white font-extrabold text-lg leading-none">{count}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'confirmed', 'delivered'] as const).map(s => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all"
              style={{
                background: filter === s ? 'white' : 'rgba(255,255,255,0.15)',
                color: filter === s ? '#1B4332' : 'rgba(255,255,255,0.8)',
              }}>
              {s === 'all' ? `All (${orders.length})` : `${s} (${
                s === 'pending' ? pendingCount : s === 'confirmed' ? confirmedCount : deliveredCount
              })`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-ink mb-1">No {filter === 'all' ? '' : filter} orders yet</p>
            <p className="text-sm text-ink-muted">Orders will appear here when owners buy from your shop</p>
          </div>
        )}

        {filtered.map(order => {
          const status = (order.data?.deliveryStatus || 'pending') as DeliveryStatus;
          const cfg = STATUS_CONFIG[status];
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === order.id;
          const payOnDelivery = order.data?.payOnDelivery === 'true';
          const methodLabel = METHOD_LABELS[order.data?.paymentMethod || ''] || (payOnDelivery ? '💵 Pay on Delivery' : '📱 Paid online');
          const items = (order.data?.itemSummary || '').split(', ').filter(Boolean);
          const earned = Number(order.data?.earned || 0);
          const buyerPhone = order.data?.phone || '';
          const deliveryAddr = order.data?.address || '';
          const buyerName = order.data?.buyerName || 'Customer';

          return (
            <div key={order.id}
              className="bg-white border rounded-2xl overflow-hidden shadow-sm"
              style={{ borderColor: !order.read ? '#52B788' : '#E5E7EB' }}>

              {/* Order header — always visible */}
              <div
                className="p-4 cursor-pointer hover:bg-surface-hover/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Buyer avatar */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {buyerName[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-ink text-sm">{buyerName}</p>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>K{earned.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                        <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded order details */}
              {isExpanded && (
                <div className="border-t border-surface-border">
                  {/* Items ordered */}
                  <div className="px-4 py-3 bg-surface-secondary/30">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Items Ordered</p>
                    <div className="space-y-1.5">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                          <span className="text-ink">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-surface-border">
                      <span className="text-xs text-ink-muted">Order Total</span>
                      <span className="text-base font-extrabold" style={{ color: '#1B4332' }}>K{earned.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Delivery Info</p>

                    {deliveryAddr ? (
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EBF5EF] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" style={{ color: '#2B8A50' }} />
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-muted">Delivery Address</p>
                          <p className="text-sm text-ink font-medium leading-relaxed">{deliveryAddr}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddr)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-primary font-semibold mt-0.5 inline-block hover:underline"
                          >
                            Open in Maps →
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted italic">No address provided</p>
                    )}

                    {buyerPhone && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EBF5EF] flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" style={{ color: '#2B8A50' }} />
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-muted">Customer Phone</p>
                          <a href={`tel:${buyerPhone}`} className="text-sm text-primary font-semibold">{buyerPhone}</a>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF5EF] flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" style={{ color: '#2B8A50' }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-muted">Payment</p>
                        <p className="text-sm font-semibold text-ink">{methodLabel}</p>
                        {payOnDelivery && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            Collect payment on arrival
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF5EF] flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" style={{ color: '#2B8A50' }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-muted">Your Earnings</p>
                        <p className="text-base font-extrabold" style={{ color: '#1B4332' }}>K{earned.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status action buttons */}
                  <div className="px-4 pb-4 space-y-2">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Update Status</p>
                    <div className="flex gap-2">
                      {status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
                        >
                          <Package className="w-4 h-4" />
                          Confirm Order
                        </button>
                      )}
                      {status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #0D9488, #0F766E)' }}
                        >
                          <Truck className="w-4 h-4" />
                          Mark Delivered
                        </button>
                      )}
                      {status === 'delivered' && (
                        <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                          style={{ background: '#D1FAE5', color: '#065F46' }}>
                          <CheckCircle2 className="w-4 h-4" />
                          Order Delivered ✓
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
