import { useRef, useState } from 'react';
import { Plus, X, Pencil, Trash2, Camera, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useShop } from '../../context/ShopContext';
import type { ShopProduct } from '../../context/ShopContext';

async function resizePhoto(file: File, maxDim = 800, q = 0.82): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim; }
          else { w = Math.round((w / h) * maxDim); h = maxDim; }
        }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const CATEGORIES: ShopProduct['category'][] = ['treats', 'accessories', 'meals', 'hygiene'];

const CAT_EMOJIS: Record<string, string> = {
  all: '🛍️',
  treats: '🦴',
  accessories: '🎀',
  meals: '🍖',
  hygiene: '🧴',
};

function ProductModal({
  product,
  shopOwnerId,
  onClose,
}: {
  product?: ShopProduct;
  shopOwnerId: string;
  onClose: () => void;
}) {
  const { addProduct, updateProduct } = useShop();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName]         = useState(product?.name || '');
  const [price, setPrice]       = useState(product ? String(product.price) : '');
  const [badge, setBadge]       = useState(product?.badge || '');
  const [category, setCategory] = useState<ShopProduct['category']>(product?.category || 'treats');
  const [description, setDesc]  = useState(product?.description || '');
  const [brand, setBrand]       = useState(product?.brand || '');
  const [specs, setSpecs]       = useState(product?.specs || '');
  const [img, setImg]           = useState<string>(product?.img || '');
  const [saving, setSaving]     = useState(false);
  const isEdit = !!product;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImg(await resizePhoto(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    const payload: Omit<ShopProduct, 'id'> = {
      name: name.trim(),
      price: Number(price),
      badge: badge.trim() || null,
      category,
      description: description.trim() || undefined,
      brand: brand.trim() || undefined,
      specs: specs.trim() || undefined,
      img: img || 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&q=80',
      shopOwnerId,
    };
    if (isEdit) updateProduct(product.id, payload);
    else addProduct(payload);
    await new Promise(r => setTimeout(r, 300));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '92vh' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-surface-border" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
          <h2 className="text-lg font-bold text-ink">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 pb-10">
          {/* Image picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-primary/30 bg-surface-secondary cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}>
              {img
                ? <img src={img} alt="Product" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-ink-muted">
                    <Camera className="w-8 h-8" />
                    <span className="text-xs">Add photo</span>
                  </div>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover">
                <Upload className="w-3 h-3" /> Gallery / PC
              </button>
              <button type="button" onClick={() => { fileRef.current?.setAttribute('capture','environment'); fileRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover">
                <Camera className="w-3 h-3" /> Camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Product Name <span className="text-danger">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Chicken Treats 250g"
              className="w-full h-11 px-4 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Price (ZMW) <span className="text-danger">*</span></label>
            <input type="number" min="1" value={price} onChange={e => setPrice(e.target.value)} required placeholder="e.g. 150"
              className="w-full h-11 px-4 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className="py-2 rounded-xl text-xs font-medium border transition-all capitalize"
                  style={{
                    background: category === c ? '#1B4332' : 'white',
                    color: category === c ? 'white' : '#6B7280',
                    borderColor: category === c ? '#1B4332' : '#E5E7EB',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Badge <span className="text-ink-muted text-xs">(optional)</span></label>
            <input type="text" value={badge} onChange={e => setBadge(e.target.value)} placeholder="e.g. New, Sale, Bestseller"
              className="w-full h-11 px-4 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Description</label>
            <textarea rows={2} value={description} onChange={e => setDesc(e.target.value)} placeholder="What makes this product great?"
              className="w-full px-4 py-3 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all resize-none" />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Brand <span className="text-ink-muted text-xs">(optional)</span></label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Royal Canin, Pedigree"
              className="w-full h-11 px-4 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Specs */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Specifications <span className="text-ink-muted text-xs">(optional)</span></label>
            <textarea rows={3} value={specs} onChange={e => setSpecs(e.target.value)}
              placeholder={"e.g.\nWeight: 250g\nFlavour: Chicken\nSuitable for: All breeds"}
              className="w-full px-4 py-3 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all resize-none font-mono" />
            <p className="text-[11px] text-ink-muted mt-1">Each line becomes a spec bullet. Buyers will see this when they tap on your product.</p>
          </div>

          <button type="submit" disabled={saving || !name.trim() || !price}
            className="w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

type FilterCat = 'all' | ShopProduct['category'];

export default function MyProducts() {
  const { currentUser } = useApp();
  const { products, removeProduct } = useShop();
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<ShopProduct | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<FilterCat>('all');

  const myProducts = products.filter(p => p.shopOwnerId === currentUser?.id);
  const displayed  = filterCat === 'all' ? myProducts : myProducts.filter(p => p.category === filterCat);

  const catCount = (cat: FilterCat) =>
    cat === 'all' ? myProducts.length : myProducts.filter(p => p.category === cat).length;

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-white">My Products</h1>
          <p className="text-white/70 text-sm">{myProducts.length} listed</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold"
          style={{ color: '#1B4332' }}>
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Category filter tabs */}
      {myProducts.length > 0 && (
        <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(['all', ...CATEGORIES] as FilterCat[]).map(cat => {
            const count = catCount(cat);
            if (cat !== 'all' && count === 0) return null;
            return (
              <button key={cat} type="button" onClick={() => setFilterCat(cat)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 capitalize transition-all border"
                style={{
                  background: filterCat === cat ? '#1B4332' : 'white',
                  color: filterCat === cat ? 'white' : '#6B7280',
                  borderColor: filterCat === cat ? '#1B4332' : '#E5E7EB',
                }}>
                <span>{CAT_EMOJIS[cat] || ''}</span>
                {cat === 'all' ? 'All' : cat}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {myProducts.length === 0 && (
        <div className="py-16 text-center px-4">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-semibold text-ink mb-1">No products yet</p>
          <p className="text-sm text-ink-muted mb-4">Add your first product for owners to discover</p>
          <button type="button" onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      )}

      {/* 2×2 Product grid */}
      {displayed.length > 0 && (
        <div className="px-4 pt-3 pb-4 grid grid-cols-2 gap-3">
          {displayed.map(p => (
            <div key={p.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
              {/* Square image */}
              <div className="relative aspect-square">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                {p.badge && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ background: '#2B8A50' }}>{p.badge}</span>
                )}
                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                  <button type="button" onClick={() => setEditing(p)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                    style={{ background: 'rgba(255,255,255,0.92)' }}>
                    <Pencil className="w-3.5 h-3.5 text-ink-secondary" />
                  </button>
                  <button type="button" onClick={() => setDeleting(p.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                    style={{ background: 'rgba(255,255,255,0.92)' }}>
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="font-bold text-ink text-xs leading-tight truncate">{p.name}</p>
                <p className="text-[10px] text-ink-muted capitalize mt-0.5">{p.category}</p>
                <p className="font-bold text-sm mt-1.5" style={{ color: '#1B4332' }}>K{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty filter state */}
      {myProducts.length > 0 && displayed.length === 0 && (
        <div className="py-12 text-center px-4">
          <p className="text-3xl mb-2">{CAT_EMOJIS[filterCat]}</p>
          <p className="font-semibold text-ink mb-1 capitalize">No {filterCat} products yet</p>
          <button type="button" onClick={() => setShowAdd(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold"
            style={{ background: '#2B8A50' }}>
            <Plus className="w-3.5 h-3.5" /> Add one
          </button>
        </div>
      )}

      {(showAdd || editing) && (
        <ProductModal
          product={editing || undefined}
          shopOwnerId={currentUser?.id || ''}
          onClose={() => { setShowAdd(false); setEditing(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-xl mb-2">🗑️</p>
            <p className="font-bold text-ink mb-1">Remove product?</p>
            <p className="text-sm text-ink-muted mb-5">This will remove it from the shop.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleting(null)}
                className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">Cancel</button>
              <button type="button" onClick={() => { removeProduct(deleting); setDeleting(null); }}
                className="flex-1 py-3 rounded-2xl bg-danger text-white text-sm font-bold">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
