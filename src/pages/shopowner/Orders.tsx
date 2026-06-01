import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useShop } from '../../context/ShopContext';
import { format } from 'date-fns';
import { ShoppingBag } from 'lucide-react';
import type { Purchase } from '../../types';

const STATUS_COLORS: Record<Purchase['status'], string> = {
  pending: '#E67E22',
  confirmed: '#2B8A50',
  delivered: '#52B788',
};

export default function ShopOwnerOrders() {
  const { currentUser } = useApp();
  const { purchases } = useShop();
  const [filter, setFilter] = useState<Purchase['status'] | 'all'>('all');

  const myOrders = purchases
    .filter(p => p.shopOwnerId === currentUser?.id)
    .filter(p => filter === 'all' || p.status === filter)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

  const totalRev = myOrders.reduce((s, p) => s + p.total, 0);

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Orders</h1>
        <p className="text-white/70 text-sm">
          {myOrders.length} order{myOrders.length !== 1 ? 's' : ''} · K{totalRev} total
        </p>
        <div className="flex gap-2 mt-4">
          {(['all', 'pending', 'confirmed', 'delivered'] as const).map(s => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === s ? 'white' : 'rgba(255,255,255,0.15)',
                color: filter === s ? '#1B4332' : 'rgba(255,255,255,0.8)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {myOrders.length === 0 && (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-ink mb-1">No orders yet</p>
            <p className="text-sm text-ink-muted">Orders will appear here when owners buy from your shop</p>
          </div>
        )}

        {myOrders.map(order => (
          <div key={order.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                <img src={order.productImg} alt={order.productName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm truncate">{order.productName}</p>
                <p className="text-xs text-ink-muted">
                  {order.buyerName} · qty {order.quantity}
                </p>
                <p className="text-xs text-ink-muted">
                  {format(new Date(order.purchasedAt), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-ink">K{order.total}</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white mt-1 capitalize"
                  style={{ background: STATUS_COLORS[order.status] }}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
