import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useShop, ShopProduct } from '../../context/ShopContext';

const GROOM_IMG = 'https://images.unsplash.com/photo-1597633544156-0a5e9d7a1285?w=400&q=80';

export default function Shop() {
  const [search, setSearch] = useState('');
  const { addItem, count: cartTotal } = useCart();
  const { products } = useShop();
  const navigate = useNavigate();

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

  return (
    <div className="max-w-2xl mx-auto pb-28 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Shop</h1>
          <p className="text-xs text-ink-muted">For your furry best friend</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner/cart')}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-surface-secondary"
        >
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
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
          />
        </div>
      </div>

      {/* Hero cards (only when not searching) */}
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
          <button
            type="button"
            onClick={() => navigate('/owner/request')}
            className="rounded-2xl h-36 flex flex-col items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
          >
            <span className="text-4xl">🐾</span>
            <p className="font-bold text-sm">Book a walk</p>
            <p className="text-white/70 text-xs">Find a walker</p>
          </button>
        </div>
      )}

      {/* Product sections */}
      {sections.map(section => (
        <div key={section.title} className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-ink">{section.title}</h2>
            <button type="button" className="text-xs text-primary font-semibold">See all</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                onAdd={() => addItem({ id: item.id, name: item.name, subtitle: item.description || '', price: item.price, emoji: '🐾' })}
              />
            ))}
          </div>
        </div>
      ))}

      {/* No results */}
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
          <button
            type="button"
            onClick={() => navigate('/owner/cart')}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartTotal} item{cartTotal > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="font-bold">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ item, onAdd }: { item: ShopProduct; onAdd: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-surface-border">
      <div className="relative aspect-square">
        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
        {item.badge && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full"
            style={{ background: '#1B4332' }}
          >
            {item.badge}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-ink mb-1.5 truncate">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">K{item.price}</span>
          <button
            type="button"
            onClick={onAdd}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            style={{ background: '#2B8A50' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
