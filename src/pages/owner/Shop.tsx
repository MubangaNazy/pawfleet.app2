import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Plus, X, Star, ShieldCheck, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useShop, ShopProduct } from '../../context/ShopContext';
import { useApp } from '../../context/AppContext';

const GROOM_IMG = 'https://images.unsplash.com/photo-1597633544156-0a5e9d7a1285?w=400&q=80';

function ProductDetailModal({ item, onClose, onAdd }: { item: ShopProduct; onClose: () => void; onAdd: () => void }) {
  const specLines = item.specs ? item.specs.split('\n').filter(Boolean) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow z-10">
          <X className="w-4 h-4 text-ink-muted" />
        </button>

        {/* Image */}
        <div className="relative w-full" style={{ height: 240 }}>
          <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
          {item.badge && (
            <span className="absolute top-3 left-3 px-3 py-1 text-[11px] font-bold text-white rounded-full"
              style={{ background: '#1B4332' }}>
              {item.badge}
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4 pb-10">
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-ink">{item.name}</h2>
              {item.brand && <p className="text-xs text-ink-muted mt-0.5">{item.brand}</p>}
            </div>
            <p className="text-2xl font-extrabold shrink-0" style={{ color: '#1B4332' }}>K{item.price}</p>
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-xs text-ink-muted ml-1">In stock</span>
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-ink leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Specs */}
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

          {/* Trust badge */}
          <div className="flex items-center gap-2 py-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-ink-muted">Sold through PawFleet · Lusaka verified seller</p>
          </div>

          {/* Add to cart */}
          <button
            type="button"
            onClick={() => { onAdd(); onClose(); }}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
          >
            <Plus className="w-5 h-5" /> Add to Cart — K{item.price}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const { addItem, count: cartTotal } = useCart();
  const { products } = useShop();
  const { data } = useApp();
  const navigate = useNavigate();

  // Group custom products by shop owner, showing shop header
  const shopOwnerIds = [...new Set(products.filter(p => p.shopOwnerId).map(p => p.shopOwnerId!))];
  const getShopInfo = (ownerId: string) => data.users.find(u => u.id === ownerId);

  const treats      = products.filter(p => p.category === 'treats');
  const accessories = products.filter(p => p.category === 'accessories');
  const meals       = products.filter(p => p.category === 'meals');
  const hygiene     = products.filter(p => p.category === 'hygiene');

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const sections: { title: string; items: ShopProduct[] }[] = filtered
    ? [{ title: 'Results', items: filtered }]
    : [
        ...(treats.length      ? [{ title: 'Treats for your pup', items: treats }]      : []),
        ...(accessories.length ? [{ title: 'Accessories',          items: accessories }] : []),
        ...(meals.length       ? [{ title: 'Meal Plans',           items: meals }]       : []),
        ...(hygiene.length     ? [{ title: 'Hygiene',              items: hygiene }]     : []),
      ];

  const handleAdd = (item: ShopProduct) =>
    addItem({ id: item.id, name: item.name, subtitle: item.description || '', price: item.price, emoji: '🐾' });

  return (
    <div className="max-w-2xl mx-auto pb-28 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Shop</h1>
          <p className="text-xs text-ink-muted">For your furry best friend</p>
        </div>
        <button type="button" onClick={() => navigate('/owner/cart')}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-surface-secondary">
          <ShoppingCart className="w-5 h-5 text-ink-secondary" />
          {cartTotal > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-surface-secondary rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none" />
        </div>
      </div>

      {/* Hero cards */}
      {!search && (
        <div className="px-4 pb-5 grid grid-cols-2 gap-3">
          <div className="relative rounded-2xl overflow-hidden h-36">
            <img src={GROOM_IMG} alt="Grooming" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <p className="text-white font-bold text-sm">Grooming</p>
              <p className="text-white/80 text-xs">Book now</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/owner/request')}
            className="rounded-2xl h-36 flex flex-col items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <span className="text-4xl">🦮</span>
            <p className="font-bold text-sm">Book a walk</p>
            <p className="text-white/70 text-xs">Find a walker</p>
          </button>
        </div>
      )}

      {/* Shop banners for custom shop owners */}
      {!search && shopOwnerIds.length > 0 && shopOwnerIds.map(ownerId => {
        const shop = getShopInfo(ownerId);
        if (!shop?.businessName && !shop?.businessType) return null;
        return (
          <div key={ownerId} className="mx-4 mb-4 rounded-2xl border border-surface-border bg-white p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold text-white"
              style={{ background: shop.imageUrl ? undefined : 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {shop.imageUrl
                ? <img src={shop.imageUrl} alt={shop.businessName} className="w-full h-full object-cover" />
                : (shop.businessName || shop.name)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-sm">{shop.businessName || shop.name}</p>
              {shop.businessType && <p className="text-xs text-primary font-semibold">{shop.businessType}</p>}
              {shop.businessAddress && (
                <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />{shop.businessAddress}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Product sections */}
      {sections.map(section => (
        <div key={section.title} className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-ink">{section.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map(item => (
              <ProductCard key={item.id} item={item}
                onView={() => setSelected(item)}
                onAdd={() => handleAdd(item)} />
            ))}
          </div>
        </div>
      ))}

      {search && sections[0]?.items.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
          <span className="text-4xl">🔍</span>
          <p className="font-semibold text-ink">No results for "{search}"</p>
          <p className="text-sm text-ink-muted">Try a different search term</p>
        </div>
      )}

      {/* Sticky cart bar */}
      {cartTotal > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
          <button type="button" onClick={() => navigate('/owner/cart')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartTotal} item{cartTotal > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="font-bold">View Cart →</span>
          </button>
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

function ProductCard({ item, onView, onAdd }: { item: ShopProduct; onView: () => void; onAdd: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-surface-border">
      <button type="button" onClick={onView} className="relative aspect-square w-full block">
        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
        {item.badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full"
            style={{ background: '#1B4332' }}>
            {item.badge}
          </span>
        )}
        {(item.description || item.specs || item.brand) && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] font-bold text-white rounded-full bg-black/40 backdrop-blur-sm">
            Details →
          </span>
        )}
      </button>
      <div className="px-3 py-2.5">
        <button type="button" onClick={onView} className="w-full text-left">
          <p className="text-xs font-semibold text-ink mb-0.5 truncate">{item.name}</p>
          {item.brand && <p className="text-[10px] text-ink-muted truncate">{item.brand}</p>}
        </button>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold text-primary">K{item.price}</span>
          <button type="button" onClick={onAdd}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            style={{ background: '#2B8A50' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
