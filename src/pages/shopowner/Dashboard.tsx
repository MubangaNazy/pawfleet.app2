import { Link } from 'react-router-dom';
import { ShoppingBag, Bell, TrendingUp, Package, ChevronRight, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useShop } from '../../context/ShopContext';
import { format } from 'date-fns';

export default function ShopOwnerDashboard() {
  const { currentUser } = useApp();
  const { products, purchases, notifications, unreadCount } = useShop();

  const myProducts  = products.filter(p => p.shopOwnerId === currentUser?.id);
  const myPurchases = purchases.filter(p => p.shopOwnerId === currentUser?.id);
  const unread      = currentUser ? unreadCount(currentUser.id) : 0;

  const todayStr    = new Date().toISOString().split('T')[0];
  const todaySales  = myPurchases.filter(p => p.purchasedAt.startsWith(todayStr));
  const todayRev    = todaySales.reduce((s, p) => s + p.total, 0);
  const totalRev    = myPurchases.reduce((s, p) => s + p.total, 0);
  const totalOrders = myPurchases.length;

  const recentOrders = [...myPurchases].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const firstName = currentUser?.name.split(' ')[0] || 'there';

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Hero */}
      <div className="px-5 pt-8 pb-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 70%, #52B788 100%)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%,-30%)' }} />
        <p className="text-white/70 text-sm">{greeting}</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{firstName}'s Shop</h1>
        <p className="text-white/70 text-xs mt-1">{myProducts.length} products listed</p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Today's Revenue", value: `K${todayRev}` },
            { label: 'Total Orders',    value: totalOrders },
            { label: 'All-time Rev.',   value: `K${totalRev}` },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <p className="text-lg font-extrabold text-white">{s.value}</p>
              <p className="text-[10px] text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/shopowner/products"
            className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <Package className="w-5 h-5" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">My Products</p>
              <p className="text-xs text-ink-muted">{myProducts.length} listed</p>
            </div>
          </Link>
          <Link to="/shopowner/notifications"
            className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <Bell className="w-5 h-5" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">Notifications</p>
              <p className="text-xs text-ink-muted">{unread} unread</p>
            </div>
            {unread > 0 && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </Link>
          <Link to="/shopowner/orders"
            className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <ShoppingBag className="w-5 h-5" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">Orders</p>
              <p className="text-xs text-ink-muted">{totalOrders} total</p>
            </div>
          </Link>
          <Link to="/shopowner/analytics"
            className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">Analytics</p>
              <p className="text-xs text-ink-muted">Revenue trends</p>
            </div>
          </Link>
        </div>

        {/* My top products */}
        {myProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">My Products</h2>
              <Link to="/shopowner/products" className="text-xs text-ink-secondary font-medium hover:text-primary">
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {myProducts.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 bg-white border border-surface-border rounded-2xl">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{p.name}</p>
                    <p className="text-xs text-ink-muted">{p.category}</p>
                  </div>
                  <p className="font-bold text-ink text-sm shrink-0">K{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {myProducts.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed border-surface-border text-center">
            <Package className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <p className="font-semibold text-ink mb-1">No products yet</p>
            <p className="text-sm text-ink-muted mb-4">Add your first product to start selling</p>
            <Link to="/shopowner/products"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Add Product
            </Link>
          </div>
        )}

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">Recent Orders</h2>
              <Link to="/shopowner/orders" className="text-xs text-ink-secondary font-medium hover:text-primary">
                See all →
              </Link>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                    <img src={order.productImg} alt={order.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{order.productName}</p>
                    <p className="text-xs text-ink-muted">by {order.buyerName} · qty {order.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ink text-sm">K{order.total}</p>
                    <p className="text-[10px] text-ink-muted">{format(new Date(order.purchasedAt), 'MMM d')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
