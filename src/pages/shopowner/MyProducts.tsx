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
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="What makes this product great?"
              className="w-full px-4 py-3 rounded-xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary transition-all resize-none" />
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

export default function MyProducts() {
  const { currentUser } = useApp();
  const { products, removeProduct } = useShop();
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<ShopProduct | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const myProducts = products.filter(p => p.shopOwnerId === currentUser?.id);

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <div>
          <h1 className="text-xl font-extrabold text-white">My Products</h1>
          <p className="text-white/70 text-sm">{myProducts.length} listed</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold"
          style={{ color: '#1B4332' }}>
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="p-4 space-y-3">
        {myProducts.length === 0 && (
          <div className="py-16 text-center">
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

        {myProducts.map(p => (
          <div key={p.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink text-sm truncate">{p.name}</p>
                  {p.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ background: '#2B8A50' }}>{p.badge}</span>
                  )}
                </div>
                <p className="text-xs text-ink-muted capitalize">{p.category}</p>
                <p className="font-bold text-ink mt-0.5">K{p.price}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setEditing(p)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-surface-border hover:bg-surface-hover transition-colors">
                  <Pencil className="w-4 h-4 text-ink-secondary" />
                </button>
                <button type="button" onClick={() => setDeleting(p.id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-danger/20 hover:bg-danger/5 transition-colors">
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
