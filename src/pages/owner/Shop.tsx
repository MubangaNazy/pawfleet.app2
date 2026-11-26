import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Plus, X, ShieldCheck, ExternalLink, PawPrint, ArrowUpDown, SlidersHorizontal, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useShop, ShopProduct } from '../../context/ShopContext';
import { useApp } from '../../context/AppContext';
import LiveRouteMap, { MapMarker } from '../../components/map/LiveRouteMap';
import { useMyLocation } from '../../hooks/useMyLocation';
import { formatKm, haversineKm, isValidCoord } from '../../lib/geo';

const CATEGORIES: { value: ShopProduct['category'] | 'all'; label: string; title: string }[] = [
  { value: 'all',         label: 'All',         title: 'All products' },
  { value: 'meals',       label: 'Pet food',    title: 'Pet foods' },
  { value: 'treats',      label: 'Treats',      title: 'Treats' },
  { value: 'accessories', label: 'Accessories', title: 'Accessories' },
  { value: 'hygiene',     label: 'Hygiene',     title: 'Hygiene' },
];

const CATEGORY_LABEL: Record<ShopProduct['category'], string> = {
  meals: 'Dog food', treats: 'Treats', accessories: 'Accessories', hygiene: 'Hygiene',
};

type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'name';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured',   label: 'Featured' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name',       label: 'Name: A to Z' },
];

function ProductImage({ src, alt, className = 'w-full h-full object-contain' }: { src: string; alt: string; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <PawPrint className="w-10 h-10 text-primary/30" />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} className={className} />;
}

function ProductDetailModal({ item, onClose, onAdd }: { item: ShopProduct; onClose: () => void; onAdd: () => void }) {
  const specLines = item.specs ? item.specs.split('\n').filter(Boolean) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow z-10">
          <X className="w-4 h-4 text-ink-muted" />
        </button>

        <div className="relative mx-5 mt-2 rounded-3xl bg-[#F6F7F6] flex items-center justify-center p-6" style={{ height: 260 }}>
          <ProductImage src={item.img} alt={item.name} />
          {item.badge && (
            <span className="absolute top-3 left-3 px-3 py-1 text-[11px] font-bold text-white rounded-full" style={{ background: '#1B4332' }}>
              {item.badge}
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4 pb-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-ink">{item.name}</h2>
              <p className="text-xs text-ink-muted mt-0.5">{item.brand || CATEGORY_LABEL[item.category]}</p>
            </div>
            <p className="text-2xl font-extrabold shrink-0" style={{ color: '#1B4332' }}>K{item.price.toLocaleString()}</p>
          </div>

          {item.description && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-ink leading-relaxed">{item.description}</p>
            </div>
          )}

          {specLines.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Specifications</p>
              <div className="space-y-1.5 rounded-2xl bg-surface-secondary p-4">
                {specLines.map((line, i) => {
                  const [key, ...rest] = line.split(':');
                  const val = rest.join(':').trim();
                  return val ? (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-ink-muted shrink-0">{key.trim()}</span>
                      <span className="text-xs font-semibold text-ink text-right">{val}</span>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-xs text-ink">{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-ink-muted">Sold through PawFleet · delivered in Lusaka</p>
          </div>

          <button
            type="button"
            onClick={() => { onAdd(); onClose(); }}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
          >
            <Plus className="w-5 h-5" /> Add to Cart — K{item.price.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ShopProduct['category'] | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'sort' | 'filter' | null>(null);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [selectedShopPin, setSelectedShopPin] = useState<string>('');
  const [added, setAdded] = useState('');
  const { addItem, count: cartTotal } = useCart();
  const { products } = useShop();
  const { data } = useApp();
  const navigate = useNavigate();
  const loc = useMyLocation(true);

  // Registered shops that have a pinned location, so owners can find them on the map.
  const shopsOnMap = useMemo(() => data.users
    .filter(u => u.role === 'shopowner' && isValidCoord(u.serviceLat, u.serviceLng))
    .map(u => ({
      id: u.id, name: u.businessName || u.name, address: u.businessAddress || null, phone: u.phone,
      lat: u.serviceLat!, lng: u.serviceLng!,
      distKm: loc.pos ? haversineKm(loc.pos, [u.serviceLat!, u.serviceLng!]) : null,
    }))
    .sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity)),
  [data.users, loc.pos]);

  const shopMarkers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (loc.pos) m.push({ id: 'me', lat: loc.pos[0], lng: loc.pos[1], kind: 'me', title: 'You' });
    shopsOnMap.forEach(s => m.push({ id: s.id, lat: s.lat, lng: s.lng, kind: 'shop', selected: s.id === selectedShopPin, title: s.name }));
    return m;
  }, [shopsOnMap, loc.pos, selectedShopPin]);

  const priceCeiling = useMemo(() => Math.max(0, ...products.map(p => p.price)), [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter(p =>
      (category === 'all' || p.category === category) &&
      (maxPrice == null || p.price <= maxPrice) &&
      (!q || [p.name, p.brand, p.description].filter(Boolean).join(' ').toLowerCase().includes(q)));
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, maxPrice, search, sort]);

  const filterCount = (category !== 'all' ? 1 : 0) + (maxPrice != null ? 1 : 0);
  const sectionTitle = search.trim() ? 'Results' : CATEGORIES.find(c => c.value === category)?.title ?? 'All products';

  const handleAdd = (item: ShopProduct) => {
    addItem({ id: item.id, name: item.name, subtitle: item.brand || CATEGORY_LABEL[item.category] || '', price: item.price, emoji: '🐾', img: item.img });
    setAdded(item.id);
    window.setTimeout(() => setAdded(a => (a === item.id ? '' : a)), 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <h1 className="text-2xl font-extrabold text-ink">Shop</h1>
        <button type="button" onClick={() => navigate('/owner/cart')} aria-label="Cart"
          className="relative w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-sm border border-black/[0.04]">
          <ShoppingCart className="w-5 h-5 text-ink" />
          {cartTotal > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 h-12 shadow-sm border border-black/[0.04]">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search food, treats, toys…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear"><X className="w-4 h-4 text-ink-muted" /></button>}
        </div>
      </div>

      {/* Section header with Sort and Filter */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{sectionTitle}</h2>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setSheet('sort')} className="flex items-center gap-1 text-xs font-semibold text-ink-secondary">
            Sort <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setSheet('filter')} className="flex items-center gap-1 text-xs font-semibold text-ink-secondary">
            Filter <SlidersHorizontal className="w-3.5 h-3.5" />
            {filterCount > 0 && <span className="ml-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{filterCount}</span>}
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="px-4 pb-6 grid grid-cols-2 gap-3">
        {visible.map(item => (
          <ProductCard key={item.id} item={item} justAdded={added === item.id}
            onView={() => setSelected(item)} onAdd={() => handleAdd(item)} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="flex flex-col items-center py-14 gap-2 text-center px-4">
          <PawPrint className="w-10 h-10 text-primary/40" />
          <p className="font-semibold text-ink">
            {products.length === 0 ? 'The shop is restocking' : search ? `No results for "${search}"` : 'Nothing matches these filters'}
          </p>
          <p className="text-sm text-ink-muted">{products.length === 0 ? 'Check back soon' : 'Try another search or clear the filters'}</p>
          {filterCount > 0 && (
            <button type="button" onClick={() => { setCategory('all'); setMaxPrice(null); }} className="mt-2 text-sm font-bold text-primary">Clear filters</button>
          )}
        </div>
      )}

      {/* Shops near you, on a real map */}
      {!search && shopsOnMap.length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="text-base font-bold text-ink mb-3">Shops near you</h2>
          <div className="rounded-2xl overflow-hidden border border-surface-border mb-3" style={{ height: 200 }}>
            <LiveRouteMap
              markers={shopMarkers}
              center={loc.pos ?? [shopsOnMap[0].lat, shopsOnMap[0].lng]}
              zoom={12}
              fitKey={`${shopsOnMap.length}|${loc.source}`}
              onSelect={id => { if (id !== 'me') setSelectedShopPin(id); }}
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
            {shopsOnMap.map(s => (
              <button key={s.id} type="button" onClick={() => setSelectedShopPin(s.id)}
                className="shrink-0 w-56 snap-start text-left rounded-2xl border p-3 bg-white transition-colors"
                style={{ borderColor: s.id === selectedShopPin ? '#F59E0B' : 'var(--surface-border, #E5E7EB)' }}>
                <p className="text-sm font-bold text-ink truncate">{s.name}</p>
                {s.address && <p className="text-xs text-ink-muted truncate mt-0.5">{s.address}</p>}
                <div className="flex items-center justify-between mt-2">
                  {s.distKm != null && <span className="text-xs font-semibold" style={{ color: '#B45309' }}>{formatKm(s.distKm)} away</span>}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] font-bold ml-auto" style={{ color: '#B45309' }}>
                    <ExternalLink className="w-3 h-3" /> Directions
                  </a>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticky cart bar */}
      {cartTotal > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 z-20">
          <button type="button" onClick={() => navigate('/owner/cart')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between text-white rounded-2xl px-5 py-4 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartTotal} item{cartTotal > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="font-bold">View Cart →</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setSheet(null); }}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 space-y-4">
            <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-ink">{sheet === 'sort' ? 'Sort by' : 'Filter'}</h3>
              <button type="button" onClick={() => setSheet(null)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover"><X className="w-4 h-4" /></button>
            </div>
            {sheet === 'sort' ? (
              <div className="space-y-1">
                {SORTS.map(o => (
                  <button key={o.value} type="button" onClick={() => { setSort(o.value); setSheet(null); }}
                    className={`w-full flex items-center justify-between px-4 h-12 rounded-xl text-sm ${sort === o.value ? 'bg-[#EBF5EF] font-bold text-primary' : 'text-ink hover:bg-surface-secondary'}`}>
                    {o.label} {sort === o.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                        className={`px-4 h-9 rounded-full text-sm font-semibold ${category === c.value ? 'text-white' : 'bg-surface-secondary text-ink'}`}
                        style={category === c.value ? { background: '#2B8A50' } : undefined}>{c.label}</button>
                    ))}
                  </div>
                </div>
                {priceCeiling > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Max price</p>
                      <p className="text-sm font-bold text-ink">{maxPrice == null ? 'Any' : `K${maxPrice}`}</p>
                    </div>
                    <input type="range" min={0} max={priceCeiling} step={Math.max(1, Math.round(priceCeiling / 50))}
                      value={maxPrice ?? priceCeiling}
                      onChange={e => { const v = Number(e.target.value); setMaxPrice(v >= priceCeiling ? null : v); }}
                      className="w-full accent-[#2B8A50]" />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setCategory('all'); setMaxPrice(null); }}
                    className="flex-1 h-12 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink">Reset</button>
                  <button type="button" onClick={() => setSheet(null)}
                    className="flex-1 h-12 rounded-2xl text-sm font-bold text-white" style={{ background: '#2B8A50' }}>
                    Show {visible.length} item{visible.length === 1 ? '' : 's'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selected && (
        <ProductDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onAdd={() => handleAdd(selected)}
        />
      )}
    </div>
  );
}

function ProductCard({ item, onView, onAdd, justAdded }: { item: ShopProduct; onView: () => void; onAdd: () => void; justAdded: boolean }) {
  return (
    <div className="relative rounded-3xl bg-white p-3 shadow-[0_2px_14px_rgba(0,0,0,0.06)] border border-black/[0.03] flex flex-col">
      <button type="button" onClick={onView} className="relative w-full aspect-[4/5] rounded-2xl bg-[#F6F7F6] flex items-center justify-center overflow-hidden p-3">
        <ProductImage src={item.img} alt={item.name} />
        {item.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full" style={{ background: '#1B4332' }}>
            {item.badge}
          </span>
        )}
      </button>
      <div className="flex items-end justify-between gap-2 mt-3">
        <button type="button" onClick={onView} className="min-w-0 text-left">
          <p className="text-sm font-bold text-ink truncate">{item.name}</p>
          <p className="text-[11px] text-ink-muted truncate">{item.brand || CATEGORY_LABEL[item.category] || ''}</p>
        </button>
        <p className="text-sm font-extrabold text-ink shrink-0">K{item.price.toLocaleString()}</p>
      </div>
      <button type="button" onClick={onAdd} aria-label={`Add ${item.name} to cart`}
        className="absolute top-5 right-5 w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md active:scale-90 transition-all"
        style={{ background: justAdded ? '#52B788' : '#2B8A50' }}>
        {justAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}
