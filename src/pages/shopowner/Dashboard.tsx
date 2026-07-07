import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Bell, ShoppingBag, TrendingUp, Clock, Truck, CheckCircle2, ChevronRight, MessageCircle } from 'lucide-react';
import SubscriptionBanner from '../../components/ui/SubscriptionBanner';
import { useApp } from '../../context/AppContext';
import Onboarding from '../../components/ui/Onboarding';
import { useShop } from '../../context/ShopContext';
import { isToday, isThisWeek } from 'date-fns';

function parseItems(itemSummary: string): Array<{ name: string; qty: number }> {
  return itemSummary.split(',').map(s => {
    const m = s.trim().match(/^(.+?)\s*[×x](\d+)$/);
    if (m) return { name: m[1].trim(), qty: Number(m[2]) };
    return { name: s.trim(), qty: 1 };
  }).filter(i => i.name);
}

export default function ShopOwnerDashboard() {
  const { currentUser, data } = useApp();
  const { products } = useShop();
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('today');

  const myProducts = products.filter(p => p.shopOwnerId === currentUser?.id);

  const orders = data.notifications
    .filter(n => n.userId === currentUser?.id && n.type === 'shop_order')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const inPeriod = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'today') return isToday(d);
    if (period === 'week')  return isThisWeek(d);
    return true;
  };

  const periodOrders = orders.filter(o => inPeriod(o.createdAt));
  const revenue      = periodOrders.reduce((s, o) => s + Number(o.data?.earned || 0), 0);
  const pendingCount   = orders.filter(o => (o.data?.deliveryStatus || 'pending') === 'pending').length;
  const confirmedCount = orders.filter(o => (o.data?.deliveryStatus || 'pending') === 'confirmed').length;
  const deliveredCount = orders.filter(o => o.data?.deliveryStatus === 'delivered').length;

  // Aggregate top sellers from all-time orders
  const salesMap: Record<string, { qty: number; revenue: number }> = {};
  orders.forEach(o => {
    if (!o.data?.itemSummary) return;
    const earned = Number(o.data.earned || 0);
    const items  = parseItems(o.data.itemSummary);
    const total  = items.reduce((s, i) => s + i.qty, 0);
    items.forEach(item => {
      if (!salesMap[item.name]) salesMap[item.name] = { qty: 0, revenue: 0 };
      salesMap[item.name].qty     += item.qty;
      salesMap[item.name].revenue += total > 0 ? Math.round((item.qty / total) * earned) : 0;
    });
  });
  const topProducts = Object.entries(salesMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name.split(' ')[0] || 'there';
  const unread    = data.notifications.filter(n => n.userId === currentUser?.id && !n.read).length;
  const recent    = orders.slice(0, 3);

  return (
    <div className="max-w-xl mx-auto pb-24">
      {currentUser && <Onboarding userId={currentUser.id} role="shopowner" />}
      <SubscriptionBanner />
      {/* Hero */}
      <div className="px-5 pt-8 pb-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 70%, #52B788 100%)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%,-30%)' }} />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm">{greeting},</p>
            <h1 className="text-2xl font-black italic tracking-tight mt-0.5">{firstName}'s Shop</h1>
            <p className="text-white/60 text-xs mt-1">{myProducts.length} product{myProducts.length !== 1 ? 's' : ''} listed</p>
          </div>
          {unread > 0 && (
            <Link to="/shopowner/notifications"
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-xl px-3 py-2">
              <Bell className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold">{unread} new</span>
            </Link>
          )}
        </div>

        {/* Period toggle */}
        <div className="flex gap-1.5 mt-4 mb-4">
          {(['today', 'week', 'all'] as const).map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: period === p ? 'white' : 'rgba(255,255,255,0.2)',
                color: period === p ? '#1B4332' : 'rgba(255,255,255,0.85)',
              }}>
              {p === 'all' ? 'All time' : p === 'week' ? 'This week' : 'Today'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
            <p className="text-white/70 text-xs mb-1">Revenue</p>
            <p className="text-3xl font-extrabold text-white">K{revenue.toLocaleString()}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
            <p className="text-white/70 text-xs mb-1">Orders</p>
            <p className="text-3xl font-extrabold text-white">{periodOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Status strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pending',   count: pendingCount,   color: '#E67E22', bg: '#FEF3CD', icon: Clock        },
            { label: 'On Way',    count: confirmedCount, color: '#2B8A50', bg: '#EBF5EF', icon: Truck        },
            { label: 'Delivered', count: deliveredCount, color: '#52B788', bg: '#D1FAE5', icon: CheckCircle2 },
          ].map(({ label, count, color, bg, icon: Icon }) => (
            <Link key={label} to="/shopowner/orders"
              className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border border-surface-border bg-white hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-xl font-extrabold text-ink">{count}</p>
              <p className="text-[10px] text-ink-muted">{label}</p>
            </Link>
          ))}
        </div>

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
          <Link to="/shopowner/orders"
            className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <ShoppingBag className="w-5 h-5" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">All Orders</p>
              <p className="text-xs text-ink-muted">{orders.length} total · {pendingCount} pending</p>
            </div>
          </Link>
        </div>

        {/* Top sellers */}
        {topProducts.length > 0 && (
          <div>
            <h2 className="font-bold text-ink flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" /> Top Sellers
            </h2>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
              {topProducts.map(([name, stats], i) => (
                <div key={name} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#CD7F32' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{name}</p>
                    <p className="text-xs text-ink-muted">{stats.qty} unit{stats.qty !== 1 ? 's' : ''} sold</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: '#1B4332' }}>K{stats.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products list when no sales yet */}
        {topProducts.length === 0 && myProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">My Products</h2>
              <Link to="/shopowner/products" className="text-xs text-primary font-medium">Manage →</Link>
            </div>
            <div className="space-y-2">
              {myProducts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 bg-white border border-surface-border rounded-2xl">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{p.name}</p>
                    <p className="text-xs text-ink-muted capitalize">{p.category}</p>
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
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">Recent Orders</h2>
              <Link to="/shopowner/orders" className="text-xs text-primary font-medium">See all →</Link>
            </div>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
              {recent.map(order => {
                const status = (order.data?.deliveryStatus || 'pending') as string;
                const c = status === 'delivered' ? '#52B788' : status === 'confirmed' ? '#2B8A50' : '#E67E22';
                const lbl = status === 'delivered' ? 'Delivered' : status === 'confirmed' ? 'On the Way' : 'Pending';
                return (
                  <Link key={order.id} to={`/shopowner/orders?orderId=${order.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors">
                    <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-base font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                      {(order.data?.buyerName || 'C')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{order.data?.buyerName || 'Customer'}</p>
                      <p className="text-xs text-ink-muted truncate">{order.data?.itemSummary || ''}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="font-bold text-sm" style={{ color: '#1B4332' }}>K{order.data?.earned || 0}</p>
                      <span className="block text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${c}20`, color: c }}>{lbl}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="font-semibold text-ink mb-1">No orders yet</p>
            <p className="text-sm text-ink-muted">Orders will appear here once customers buy your products</p>
          </div>
        )}

        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#EBF5EF' }}>
          <MessageCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#1B4332' }} />
          <div>
            <p className="text-xs font-bold text-ink">Message buyers from Orders</p>
            <p className="text-xs text-ink-muted mt-0.5">Open any order and tap "Message Buyer" to send updates like "On the way!" directly to your customer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
