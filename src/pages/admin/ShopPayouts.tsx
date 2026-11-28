import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Store, Phone, MapPin, ChevronDown, ChevronUp, Loader2, Wallet, AlertTriangle, ExternalLink, Search } from 'lucide-react';
import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { useShop } from '../../context/ShopContext';
import LiveRouteMap, { type MapMarker } from '../../components/map/LiveRouteMap';
import { isValidCoord } from '../../lib/geo';

// Online payments land in PawFleet's Lenco account; PawFleet pays each shop weekly.
// Owed to a shop = its online sales - what has been paid out. Pay-on-delivery money goes straight to the shop.
const ONLINE = new Set(['mobile_money', 'online', 'card']);

interface OrderRow {
  id: string; shop_owner_id: string | null; product_name: string; quantity: number; total: number;
  payment_method: string | null; payment_reference: string | null; purchased_at: string; buyer_name: string | null;
}
interface PayoutRow {
  id: string; shop_owner_id: string; amount: number; method: string | null; reference: string | null;
  note: string | null; period_end: string | null; paid_at: string;
}

const K = (n: number) => `K${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ShopPayouts() {
  const { data, currentUser, sendNotification } = useApp();
  const { products } = useShop();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    const [o, p] = await Promise.all([
      supabase.from('shop_orders')
        .select('id,shop_owner_id,product_name,quantity,total,payment_method,payment_reference,purchased_at,buyer_name')
        .order('purchased_at', { ascending: false }).limit(5000),
      supabase.from('shop_payouts').select('*').order('paid_at', { ascending: false }).limit(2000),
    ]);
    if (o.error) setLoadError(`Could not load orders: ${o.error.message}`);
    else setOrders((o.data ?? []) as OrderRow[]);
    if (p.error) setLoadError(prev => prev || (/relation|does not exist|schema cache/i.test(p.error.message)
      ? 'The payouts table is not set up yet. Run supabase/migrations/20261128_admin_sections.sql in the Supabase SQL Editor.'
      : `Could not load payouts: ${p.error.message}`));
    else setPayouts((p.data ?? []) as PayoutRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const shops = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    return data.users.filter(u => u.role === 'shopowner').map(u => {
      const mine = orders.filter(o => o.shop_owner_id === u.id);
      const online = mine.filter(o => ONLINE.has(o.payment_method || ''));
      const pod = mine.filter(o => !ONLINE.has(o.payment_method || ''));
      const paid = payouts.filter(p => p.shop_owner_id === u.id);
      const onlineTotal = online.reduce((s, o) => s + Number(o.total || 0), 0);
      const paidTotal = paid.reduce((s, p) => s + Number(p.amount || 0), 0);
      const lastPayout = paid[0];
      const coveredUntil = lastPayout?.period_end || lastPayout?.paid_at || '';
      return {
        user: u,
        name: u.businessName || u.name,
        products: products.filter(p => p.shopOwnerId === u.id),
        onlineTotal,
        onlineThisWeek: online.filter(o => o.purchased_at >= weekStart).reduce((s, o) => s + Number(o.total || 0), 0),
        podTotal: pod.reduce((s, o) => s + Number(o.total || 0), 0),
        paidTotal,
        owed: Math.max(0, Math.round((onlineTotal - paidTotal) * 100) / 100),
        overpaid: paidTotal - onlineTotal > 0.009 ? paidTotal - onlineTotal : 0,
        unpaidOrders: online.filter(o => !coveredUntil || o.purchased_at > coveredUntil),
        payouts: paid,
        lastPayout,
        orderCount: mine.length,
      };
    }).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
  }, [data.users, orders, payouts, products]);

  const visible = shops.filter(s => !q.trim() || [s.name, s.user.name, s.user.businessAddress, s.user.phone].filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  const totalOwed = shops.reduce((s, x) => s + x.owed, 0);
  const monthStart = startOfMonth(new Date()).toISOString();
  const paidThisMonth = payouts.filter(p => p.paid_at >= monthStart).reduce((s, p) => s + Number(p.amount), 0);
  const onlineWeek = shops.reduce((s, x) => s + x.onlineThisWeek, 0);
  const unassignedOnline = orders.filter(o => !o.shop_owner_id && ONLINE.has(o.payment_method || '')).reduce((s, o) => s + Number(o.total || 0), 0);

  const markers: MapMarker[] = shops
    .filter(s => isValidCoord(s.user.serviceLat, s.user.serviceLng))
    .map(s => ({ id: s.user.id, lat: s.user.serviceLat!, lng: s.user.serviceLng!, kind: 'shop' as const, title: s.name, selected: open === s.user.id }));

  const recordPayout = async (shopId: string, shopName: string, amount: number, method: string, reference: string, note: string) => {
    const { error } = await supabase.from('shop_payouts').insert({
      shop_owner_id: shopId, amount, method: method || null, reference: reference || null, note: note || null,
      period_end: new Date().toISOString(), created_by: currentUser?.id ?? null,
    });
    if (error) return error.message;
    sendNotification(shopId, 'shop_message', 'Payout sent 💸',
      `PawFleet sent ${shopName} ${K(amount)} for online orders${method ? ` by ${method}` : ''}${reference ? ` (ref ${reference})` : ''}.`, { amount: String(amount) });
    await load();
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="You owe shops now" value={K(totalOwed)} tone={totalOwed > 0 ? 'amber' : 'green'} />
        <Stat label="Paid online this week" value={K(onlineWeek)} />
        <Stat label="Paid out this month" value={K(paidThisMonth)} />
        <Stat label="Shops" value={String(shops.length)} />
      </div>

      {loadError && (
        <p className="text-sm rounded-xl px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {loadError}
        </p>
      )}
      {unassignedOnline > 0 && (
        <p className="text-xs rounded-xl px-3 py-2 bg-surface-secondary text-ink-muted">
          {K(unassignedOnline)} of online sales are for products not linked to any shop (PawFleet's own listings), so they are not owed to anyone.
        </p>
      )}

      {markers.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-surface-border h-56">
          <LiveRouteMap markers={markers} fitKey={markers.length} onSelect={id => setOpen(id)} />
        </div>
      )}

      <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-white border border-surface-border">
        <Search className="w-4 h-4 text-ink-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search shops" className="flex-1 text-sm bg-transparent focus:outline-none" />
      </div>

      {loading && <p className="text-sm text-ink-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading sales and payouts…</p>}
      {!loading && shops.length === 0 && <p className="text-sm text-ink-muted text-center py-10">No shops yet. Add them in Vets &amp; Shop Owners.</p>}

      <div className="space-y-3">
        {visible.map(s => (
          <div key={s.user.id} className="bg-white rounded-2xl border border-surface-border overflow-hidden">
            <button type="button" onClick={() => setOpen(open === s.user.id ? '' : s.user.id)} className="w-full p-4 flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-xl bg-[#EBF5EF] flex items-center justify-center overflow-hidden shrink-0">
                {s.user.imageUrl ? <img src={s.user.imageUrl} alt="" className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-ink truncate">{s.name}</p>
                <p className="text-[11px] text-ink-muted truncate">
                  {s.user.businessAddress || 'No area set'} · {s.products.length} product{s.products.length === 1 ? '' : 's'} · {s.orderCount} order{s.orderCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-extrabold ${s.owed > 0 ? 'text-amber-600' : 'text-primary'}`}>{K(s.owed)}</p>
                <p className="text-[10px] text-ink-muted">{s.owed > 0 ? 'owed' : 'all paid'}</p>
              </div>
              {open === s.user.id ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
            </button>

            {open === s.user.id && (
              <div className="border-t border-surface-border p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Mini label="Sold online (all time)" value={K(s.onlineTotal)} />
                  <Mini label="Paid out (all time)" value={K(s.paidTotal)} />
                  <Mini label="Pay on delivery (shop kept)" value={K(s.podTotal)} />
                  <Mini label="Last payout" value={s.lastPayout ? format(parseISO(s.lastPayout.paid_at), 'd MMM yyyy') : 'Never'} />
                </div>
                {s.overpaid > 0 && <p className="text-xs text-amber-700">Paid {K(s.overpaid)} more than this shop's online sales. Check the payout history.</p>}

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-ink">Contact: <b>{s.user.name}</b></span>
                  {s.user.phone && <a href={`tel:${s.user.phone}`} className="flex items-center gap-1 text-primary font-semibold"><Phone className="w-3 h-3" />{s.user.phone}</a>}
                  {isValidCoord(s.user.serviceLat, s.user.serviceLng) && (
                    <a href={`https://www.google.com/maps?q=${s.user.serviceLat},${s.user.serviceLng}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary font-semibold"><MapPin className="w-3 h-3" />Open on map <ExternalLink className="w-3 h-3" /></a>
                  )}
                </div>

                {s.owed > 0 && <PayoutForm owed={s.owed} onSave={(a, m, r, n) => recordPayout(s.user.id, s.name, a, m, r, n)} />}

                <Section title={`Online orders since the last payout (${s.unpaidOrders.length})`}>
                  {s.unpaidOrders.length === 0 ? <Empty text="None." /> : s.unpaidOrders.slice(0, 60).map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-surface-border last:border-0">
                      <span className="min-w-0 truncate">{format(parseISO(o.purchased_at), 'd MMM')} · {o.product_name} ×{o.quantity}{o.buyer_name ? ` · ${o.buyer_name}` : ''}</span>
                      <span className="font-bold shrink-0">{K(Number(o.total))}</span>
                    </div>
                  ))}
                </Section>

                <Section title={`Payout history (${s.payouts.length})`}>
                  {s.payouts.length === 0 ? <Empty text="No payouts yet." /> : s.payouts.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-surface-border last:border-0">
                      <span className="min-w-0 truncate">{format(parseISO(p.paid_at), 'd MMM yyyy')}{p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ref ${p.reference}` : ''}{p.note ? ` · ${p.note}` : ''}</span>
                      <span className="font-bold text-primary shrink-0">{K(Number(p.amount))}</span>
                    </div>
                  ))}
                </Section>

                <Section title={`Products (${s.products.length})`}>
                  {s.products.length === 0 ? <Empty text="No products listed yet." /> : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {s.products.slice(0, 12).map(p => (
                        <div key={p.id} className="text-center">
                          <div className="aspect-square rounded-xl bg-[#F6F7F6] overflow-hidden flex items-center justify-center">
                            {p.img ? <img src={p.img} alt="" loading="lazy" className="w-full h-full object-contain p-1" /> : <Store className="w-5 h-5 text-primary/40" />}
                          </div>
                          <p className="text-[10px] text-ink truncate mt-1">{p.name}</p>
                          <p className="text-[10px] font-bold text-ink-muted">{K(p.price)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PayoutForm({ owed, onSave }: { owed: number; onSave: (amount: number, method: string, reference: string, note: string) => Promise<string | null> }) {
  const [amount, setAmount] = useState(String(owed));
  const [method, setMethod] = useState('Airtel Money');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const input = 'h-10 px-3 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:border-primary';

  const save = async () => {
    const a = Number(amount);
    if (!(a > 0)) return setErr('Enter the amount you sent.');
    if (a > owed + 0.009 && !confirm(`That is more than the K${owed} owed. Record it anyway?`)) return;
    setSaving(true);
    setErr('');
    const e = await onSave(a, method, reference.trim(), note.trim());
    setSaving(false);
    if (e) setErr(e);
  };

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Record a payout after you send the money</p>
      <div className="grid grid-cols-2 gap-2">
        <input className={input} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (K)" />
        <select className={input} value={method} onChange={e => setMethod(e.target.value)}>
          {['Airtel Money', 'MTN Money', 'Zamtel Kwacha', 'Bank transfer', 'Cash'].map(m => <option key={m}>{m}</option>)}
        </select>
        <input className={input} value={reference} onChange={e => setReference(e.target.value)} placeholder="Transaction ref" />
        <input className={input} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" />
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button type="button" onClick={save} disabled={saving}
        className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#2B8A50' }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Mark as paid
      </button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'green' }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-4">
      <p className={`text-xl font-extrabold ${tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-primary' : 'text-ink'}`}>{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-surface-secondary px-3 py-2"><p className="text-sm font-extrabold text-ink">{value}</p><p className="text-[10px] text-ink-muted">{label}</p></div>
);
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div><p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">{title}</p>{children}</div>
);
const Empty = ({ text }: { text: string }) => <p className="text-xs text-ink-muted">{text}</p>;
