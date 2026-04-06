import React, { useState } from 'react';
import { ShoppingCart, Plus, Star, Leaf, Zap } from 'lucide-react';

/* ── Data ── */
const categories = [
  { id: 'meals',      label: 'Meal Plans',   emoji: '🍱' },
  { id: 'food',       label: 'Dog Food',     emoji: '🐾' },
  { id: 'treats',     label: 'Treats',       emoji: '🍪' },
  { id: 'accessories',label: 'Accessories',  emoji: '🎽' },
  { id: 'hygiene',    label: 'Hygiene',      emoji: '✨' },
];

const products: Record<string, Array<{
  id: string; name: string; subtitle: string; price: number;
  oldPrice?: number; tag?: string; tagColor?: string;
  benefits: string[]; emoji: string;
}>> = {
  meals: [
    {
      id: 'm1', emoji: '🍗', name: 'Chonky Chimken', subtitle: 'Chicken, sweet potato & pumpkin · 500g',
      price: 1200, oldPrice: 1450, tag: 'High Protein', tagColor: 'bg-orange-100 text-orange-700',
      benefits: ['Healthy Skin & Fur', 'Rich in Omega-3', 'Joint Support'],
    },
    {
      id: 'm2', emoji: '🥩', name: 'Meaty Mutton', subtitle: 'Lamb, rice & carrots · 500g',
      price: 1350, tag: 'High Protein', tagColor: 'bg-red-100 text-red-700',
      benefits: ['Muscle Growth', 'Gut Health', 'Shiny Coat'],
    },
    {
      id: 'm3', emoji: '🌾', name: 'Grain Free Gobble', subtitle: 'Chicken, pumpkin & sweet potato · 500g',
      price: 1100, tag: 'Grain Free', tagColor: 'bg-amber-100 text-amber-700',
      benefits: ['Allergy Friendly', 'High Fibre', 'Digestive Health'],
    },
    {
      id: 'm4', emoji: '🧀', name: 'Punchy Paneer', subtitle: 'Cottage cheese, lentils & potato · 500g',
      price: 990, tag: 'Vegetarian', tagColor: 'bg-green-100 text-green-700',
      benefits: ['Muscle Growth', 'Digestion & Gut Health', 'Detox & Liver Support'],
    },
  ],
  food: [
    {
      id: 'f1', emoji: '🥣', name: 'Daily Kibble Pro', subtitle: 'Balanced nutrition · 2kg bag',
      price: 850, tag: 'Vet Approved', tagColor: 'bg-blue-100 text-blue-700',
      benefits: ['All Life Stages', 'No Fillers', 'Fortified with Vitamins'],
    },
    {
      id: 'f2', emoji: '🍖', name: 'Bone Broth Topper', subtitle: 'Pour over any dry food · 500ml',
      price: 450,
      benefits: ['Boosts Hydration', 'Palatability', 'Joint Support'],
    },
    {
      id: 'f3', emoji: '🐟', name: 'Salmon Bites', subtitle: 'Air-dried fish treat · 200g',
      price: 650, tag: 'Omega Rich', tagColor: 'bg-sky-100 text-sky-700',
      benefits: ['Skin & Coat', 'Brain Health', 'Natural Protein'],
    },
  ],
  treats: [
    {
      id: 't1', emoji: '🦴', name: 'Peanut Butter Biscuits', subtitle: 'Oven-baked · 250g',
      price: 320,
      benefits: ['Grain-free', 'No Artificial Colours', 'Crunchy Dental Treat'],
    },
    {
      id: 't2', emoji: '🍠', name: 'Sweet Potato Chews', subtitle: 'Dehydrated · 150g',
      price: 280, tag: 'Natural', tagColor: 'bg-orange-100 text-orange-700',
      benefits: ['Single Ingredient', 'High Fibre', 'Digestive Health'],
    },
    {
      id: 't3', emoji: '🧁', name: 'Birthday Cake Bites', subtitle: 'Carob & vanilla · 200g',
      price: 380, tag: 'Grain Free', tagColor: 'bg-pink-100 text-pink-700',
      benefits: ['Dog-safe chocolate', 'Soft & Chewy', 'Special Occasions'],
    },
  ],
  accessories: [
    {
      id: 'a1', emoji: '🎽', name: 'Reflective Harness', subtitle: 'Adjustable, escape-proof · S/M/L',
      price: 1800,
      benefits: ['Night Visibility', 'No-pull Design', 'Padded Chest Plate'],
    },
    {
      id: 'a2', emoji: '🦺', name: 'Cooling Vest', subtitle: 'Evaporative cooling · for hot days',
      price: 1200, tag: 'Summer Essential', tagColor: 'bg-sky-100 text-sky-700',
      benefits: ['Keeps Dog Cool', 'Machine Washable', 'Lightweight'],
    },
    {
      id: 'a3', emoji: '🎒', name: 'Travel Water Bottle', subtitle: 'Leak-proof · 750ml',
      price: 550,
      benefits: ['One-handed Use', 'BPA Free', 'Clip to Leash'],
    },
  ],
  hygiene: [
    {
      id: 'h1', emoji: '🛁', name: 'Oatmeal Shampoo', subtitle: 'Gentle, hypoallergenic · 400ml',
      price: 480,
      benefits: ['Soothes Dry Skin', 'Safe for Puppies', 'Vet Formulated'],
    },
    {
      id: 'h2', emoji: '🦷', name: 'Enzymatic Toothpaste', subtitle: 'Chicken flavour · 90g',
      price: 320, tag: 'Vet Recommended', tagColor: 'bg-teal-100 text-teal-700',
      benefits: ['Reduces Plaque', 'Fresh Breath', 'No Fluoride'],
    },
    {
      id: 'h3', emoji: '👃', name: 'Ear Cleaning Drops', subtitle: 'Gentle formula · 50ml',
      price: 290,
      benefits: ['Anti-bacterial', 'Prevents Infections', 'Easy applicator'],
    },
  ],
};

/* ── Cart state (demo) ── */
export default function Shop() {
  const [category, setCategory] = useState('meals');
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const cartTotal = Object.values(cart).reduce((a, b) => a + b, 0);

  const items = products[category] || [];

  return (
    <div className="max-w-2xl mx-auto pb-28 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-surface-border">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="text-lg font-bold text-ink">PawFleet Shop</h1>
            <p className="text-xs text-ink-muted">Fresh food & accessories for your dog</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 bg-surface-secondary rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-ink-secondary" />
            </div>
            {cartTotal > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartTotal}
              </span>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                category === cat.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-secondary text-ink-secondary hover:text-ink'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Banner for meals */}
        {category === 'meals' && (
          <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4" />
              <span className="text-xs font-semibold">From Our Kitchen to Their Bowl</span>
            </div>
            <h2 className="text-lg font-bold mb-1">Meal plans for your dog</h2>
            <p className="text-white/80 text-xs leading-relaxed">
              Fresh, gently cooked meals — portioned, balanced, and ready to serve. Zero fillers. 100% real ingredients.
            </p>
            <div className="flex gap-4 mt-4">
              {[
                { icon: Zap, text: 'Freshly cooked' },
                { icon: Leaf, text: 'No preservatives' },
                { icon: Star, text: 'Vet approved' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1 text-white/80 text-xs">
                  <Icon className="w-3 h-3" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How meal plans work */}
        {category === 'meals' && (
          <div>
            <h3 className="text-sm font-bold text-ink mb-3">How Meal Plans Work?</h3>
            <div className="space-y-3">
              {[
                { n: 1, t: 'Tell us what you need', d: 'Pick a meal — all are grain-free, clean-label recipes made with fresh, real food.' },
                { n: 2, t: 'Customize your plan', d: 'Select portion size and how many packs you want.' },
                { n: 3, t: 'Fresh food, delivered', d: 'We gently cook, seal, and deliver your dog\'s plan — all in one go.' },
              ].map(({ n, t, d }) => (
                <div key={n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {n}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t}</p>
                    <p className="text-xs text-ink-secondary">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">
              {category === 'meals' ? 'A Peek Into Our Bowls' : categories.find(c => c.id === category)?.label}
            </h3>
            <span className="text-xs text-ink-muted">{items.length} items</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {items.map(item => {
              const inCart = cart[item.id] || 0;
              return (
                <div key={item.id} className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-secondary flex items-center justify-center text-3xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.tag && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.tagColor} mr-1`}>
                        {item.tag}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-ink mt-0.5">{item.name}</p>
                    <p className="text-xs text-ink-muted">{item.subtitle}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.benefits.map(b => (
                        <span key={b} className="text-[10px] bg-surface-secondary text-ink-secondary px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-ink">ZMW {item.price.toLocaleString()}</span>
                        {item.oldPrice && (
                          <span className="text-xs text-ink-muted line-through">ZMW {item.oldPrice.toLocaleString()}</span>
                        )}
                      </div>
                      {inCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCart(prev => { const n = { ...prev }; n[item.id]--; if (!n[item.id]) delete n[item.id]; return n; })}
                            className="w-7 h-7 rounded-lg bg-surface-secondary text-ink font-bold flex items-center justify-center hover:bg-surface-hover"
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold text-ink w-4 text-center">{inCart}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-7 h-7 rounded-lg bg-primary text-white font-bold flex items-center justify-center hover:bg-primary/90"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="flex items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real food vs Kibble (meals tab only) */}
        {category === 'meals' && (
          <div>
            <h3 className="text-sm font-bold text-ink mb-4 text-center">Real Food vs. Kibble: What's the Difference?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  title: 'PawFleet Meals',
                  color: 'border-emerald-300 bg-emerald-50',
                  headColor: 'text-emerald-700',
                  items: ['Made with real meat and vegetables', 'Gently cooked in small batches', '0% preservatives, fillers or colorants', 'Frozen to stay fresh longer'],
                  check: true,
                },
                {
                  title: 'Typical Kibble',
                  color: 'border-red-200 bg-red-50',
                  headColor: 'text-red-600',
                  items: ['Meat by-products and additives', 'Mass-produced under high heat', 'Contains artificial additives', 'Preserved for shelf life'],
                  check: false,
                },
              ].map(col => (
                <div key={col.title} className={`rounded-2xl border ${col.color} p-4`}>
                  <p className={`text-xs font-bold ${col.headColor} mb-3 text-center`}>{col.title}</p>
                  {col.items.map(item => (
                    <div key={item} className="flex items-start gap-1.5 mb-2">
                      <span className={`text-xs font-bold ${col.check ? 'text-emerald-600' : 'text-red-500'} shrink-0 mt-0.5`}>
                        {col.check ? '✓' : '✗'}
                      </span>
                      <p className="text-[11px] text-ink-secondary leading-tight">{item}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {cartTotal > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 z-20">
          <button className="w-full max-w-2xl mx-auto flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-xl hover:bg-primary/90 transition-colors">
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
