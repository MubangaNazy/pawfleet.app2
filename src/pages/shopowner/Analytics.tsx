import { useState } from 'react';
import { TrendingUp, ShoppingBag, Users, Package, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';

function parseItems(itemSummary: string): Array<{ name: string; qty: number }> {
  return itemSummary.split(',').map(s => {
    const m = s.trim().match(/^(.+?)\s*[×x](\d+)$/);
    if (m) return { name: m[1].trim(), qty: Number(m[2]) };
    return { name: s.trim(), qty: 1 };
  }).filter(i => i.name);
}

type Period = 'today' | 'week' | 'month' | 'all';

export default function ShopOwnerAnalytics() {
  const { currentUser, data } = useApp();
  const [period, setPeriod] = useState<Period>('week');

  const orders = data.notifications
    .filter(n => n.userId === currentUser?.id && n.type === 'shop_order')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const inPeriod = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'today') return isToday(d);
    if (period === 'week')  return isThisWeek(d);
    if (period === 'month') return isThisMonth(d);
    return true;
  };

  const filtered  = orders.filter(o => inPeriod(o.createdAt));
  const revenue   = filtered.reduce((s, o) => s + Number(o.data?.earned || 0), 0);
  const customers = new Set(filtered.map(o => o.data?.buyerId).filter(Boolean)).size;

  const pendingCount   = filtered.filter(o => (o.data?.deliveryStatus || 'pending') === 'pending').length;
  const confirmedCount = filtered.filter(o => (o.data?.deliveryStatus || 'pending') === 'confirmed').length;
  const deliveredCount = filtered.filter(o => o.data?.deliveryStatus === 'delivered').length;

  // Product performance from all-time orders (not just period, so rankings stay stable)
  const salesMap: Record<string, { qty: number; revenue: number; orders: number }> = {};
  orders.forEach(o => {
    if (!o.data?.itemSummary) return;
    const earned = Number(o.data.earned || 0);
    const items  = parseItems(o.data.itemSummary);
    const total  = items.reduce((s, i) => s + i.qty, 0);
    items.forEach(item => {
      if (!salesMap[item.name]) salesMap[item.name] = { qty: 0, revenue: 0, orders: 0 };
      salesMap[item.name].qty     += item.qty;
      salesMap[item.name].revenue += total > 0 ? Math.round((item.qty / total) * earned) : 0;
      salesMap[item.name].orders  += 1;
    });
  });
  const products = Object.entries(salesMap).sort((a, b) => b[1].qty - a[1].qty);
  const maxQty   = products[0]?.[1].qty || 1;

  // Repeat customers
  const buyerMap: Record<string, { name: string; orders: number; spent: number }> = {};
  orders.forEach(o => {
    const id = o.data?.buyerId || '';
    if (!id) return;
    if (!buyerMap[id]) buyerMap[id] = { name: o.data?.buyerName || 'Customer', orders: 0, spent: 0 };
    buyerMap[id].orders += 1;
    buyerMap[id].spent  += Number(o.data?.earned || 0);
  });
  const topBuyers = Object.values(buyerMap).sort((a, b) => b.orders - a.orders).slice(0, 5);

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all',   label: 'All Time' },
  ];

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="px-5 pt-8 pb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Analytics</h1>
        <p className="text-white/70 text-sm mb-4">Track your shop performance</p>

        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: period === p.key ? 'white' : 'rgba(255,255,255,0.2)',
                color: period === p.key ? '#1B4332' : 'rgba(255,255,255,0.85)',
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Revenue',   value: `K${revenue.toLocaleString()}`, color: '#1B4332', bg: '#EBF5EF' },
            { icon: ShoppingBag, label: 'Orders',   value: String(filtered.length),         color: '#2B8A50', bg: '#EBF5EF' },
            { icon: Users,      label: 'Customers', value: String(customers),               color: '#52B788', bg: '#EBF5EF' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white border border-surface-border rounded-2xl p-3.5 text-center">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-xl font-extrabold text-ink">{value}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Order funnel */}
        <div>
          <h2 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Order Status
          </h2>
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
            {[
              { label: 'Pending',    count: pendingCount,   icon: Clock,         color: '#E67E22', bg: '#FEF3CD' },
              { label: 'On the Way', count: confirmedCount, icon: Truck,         color: '#2B8A50', bg: '#EBF5EF' },
              { label: 'Delivered',  count: deliveredCount, icon: CheckCircle2,  color: '#52B788', bg: '#D1FAE5' },
            ].map(({ label, count, icon: Icon, color, bg }) => {
              const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-ink">{label}</span>
                      <span className="text-xs font-bold text-ink-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-surface-secondary">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product performance */}
        {products.length > 0 && (
          <div>
            <h2 className="font-bold text-ink mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Product Performance
            </h2>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 px-4 py-2.5 border-b border-surface-border bg-surface-secondary/40">
                <span className="col-span-5 text-[10px] font-bold text-ink-muted uppercase tracking-wide">Product</span>
                <span className="col-span-3 text-[10px] font-bold text-ink-muted uppercase tracking-wide text-center">Units</span>
                <span className="col-span-4 text-[10px] font-bold text-ink-muted uppercase tracking-wide text-right">Revenue</span>
              </div>
              {products.map(([name, stats], i) => {
                const barPct = Math.round((stats.qty / maxQty) * 100);
                return (
                  <div key={name} className="px-4 py-3 border-b border-surface-border last:border-0">
                    <div className="grid grid-cols-12 items-center mb-1.5">
                      <div className="col-span-5 flex items-center gap-2">
                        <span className="text-[10px] font-bold w-4 shrink-0"
                          style={{ color: i < 3 ? ['#F59E0B','#9CA3AF','#CD7F32'][i] : '#D1D5DB' }}>
                          #{i+1}
                        </span>
                        <span className="text-xs font-semibold text-ink truncate">{name}</span>
                      </div>
                      <span className="col-span-3 text-xs font-bold text-ink text-center">{stats.qty}</span>
                      <span className="col-span-4 text-xs font-bold text-right" style={{ color: '#1B4332' }}>K{stats.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-surface-secondary">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, background: 'linear-gradient(90deg, #1B4332, #2B8A50)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top customers */}
        {topBuyers.length > 0 && (
          <div>
            <h2 className="font-bold text-ink mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Top Customers
            </h2>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
              {topBuyers.map((buyer, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {buyer.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{buyer.name}</p>
                    <p className="text-xs text-ink-muted">{buyer.orders} order{buyer.orders !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: '#1B4332' }}>K{buyer.spent.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders list */}
        {filtered.length > 0 && (
          <div>
            <h2 className="font-bold text-ink mb-3">Recent Orders</h2>
            <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
              {filtered.slice(0, 8).map(order => {
                const status = order.data?.deliveryStatus || 'pending';
                const color  = status === 'delivered' ? '#52B788' : status === 'confirmed' ? '#2B8A50' : '#E67E22';
                return (
                  <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                      {(order.data?.buyerName || 'C')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{order.data?.buyerName || 'Customer'}</p>
                      <p className="text-[10px] text-ink-muted truncate">{order.data?.itemSummary || ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold" style={{ color: '#1B4332' }}>K{order.data?.earned || 0}</p>
                      <p className="text-[10px]" style={{ color }}>{status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="py-16 text-center">
            <TrendingUp className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-ink mb-1">No data yet</p>
            <p className="text-sm text-ink-muted">Analytics will appear here once you start getting orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
