import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, ShoppingBag, Camera, Upload } from 'lucide-react';

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
import { useShop, ShopProduct } from '../../context/ShopContext';
import { useCart } from '../../context/CartContext';

const CATEGORIES: ShopProduct['category'][] = ['treats', 'accessories', 'meals', 'hygiene'];
const BADGES = ['Bestseller', 'New', 'Popular', 'Sale', ''];

interface FormState {
  name: string;
  price: string;
  badge: string;
  img: string;
  category: ShopProduct['category'];
  description: string;
}

const BLANK: FormState = { name: '', price: '', badge: '', img: '', category: 'treats', description: '' };

export default function AdminShopManager() {
  const { products, addProduct, updateProduct, removeProduct } = useShop();
  const { count: cartTotal } = useCart();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ShopProduct['category'] | 'all'>('all');
  const [modal, setModal] = useState<'add' | string | null>(null); // 'add' or product id to edit
  const [form, setForm] = useState<FormState>(BLANK);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await resizePhoto(file);
    setForm(f => ({ ...f, img: url }));
  };

  const filtered = products.filter(p => {
    const matchCat = filterCat === 'all' || p.category === filterCat;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => { setForm(BLANK); setError(''); setModal('add'); };
  const openEdit = (p: ShopProduct) => {
    setForm({ name: p.name, price: String(p.price), badge: p.badge || '', img: p.img, category: p.category, description: p.description || '' });
    setError('');
    setModal(p.id);
  };
  const closeModal = () => setModal(null);

  const handleSave = () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    const price = Number(form.price);
    if (!price || price <= 0) { setError('Valid price is required'); return; }
    if (!form.img.trim()) { setError('Product image is required'); return; }

    const payload = {
      name: form.name.trim(),
      price,
      badge: form.badge || null,
      img: form.img.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
    };

    if (modal === 'add') {
      addProduct(payload);
    } else if (modal) {
      updateProduct(modal, payload);
    }
    closeModal();
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-8 pb-7 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-white">
            <p className="text-white/70 text-xs font-medium mb-1">Admin · Shop Management</p>
            <h1 className="text-2xl font-extrabold">Shop Manager</h1>
            <p className="text-white/75 text-sm mt-1">{products.length} products in store</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform shrink-0"
            style={{ color: '#1B4332' }}
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Search + filter */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white border border-surface-border rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-ink-muted shrink-0" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {(['all', ...CATEGORIES] as const).map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  filterCat === cat ? 'text-white shadow-sm' : 'bg-surface-secondary text-ink-secondary hover:text-ink'
                }`}
                style={filterCat === cat ? { background: '#1B4332' } : {}}>
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <ShoppingBag className="w-12 h-12 text-ink-muted" />
            <p className="font-semibold text-ink">No products found</p>
            <button onClick={openAdd} className="text-sm text-primary font-semibold hover:underline">
              + Add the first product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} className="rounded-2xl overflow-hidden bg-white border border-surface-border">
                {/* Image */}
                <div className="relative aspect-square">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  {item.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full"
                      style={{ background: '#1B4332' }}>
                      {item.badge}
                    </span>
                  )}
                  {/* Admin action buttons overlay */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => openEdit(item)}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-ink" />
                    </button>
                    <button onClick={() => setDeleteConfirm(item.id)}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </button>
                  </div>
                  {/* Category pill */}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] font-bold text-white/90 rounded-full bg-black/40">
                    {item.category}
                  </span>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink mb-0.5 truncate">{item.name}</p>
                  {item.description && <p className="text-[10px] text-ink-muted mb-1 line-clamp-1">{item.description}</p>}
                  <p className="text-sm font-bold text-primary">K{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-border">
              <h2 className="font-bold text-ink">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover">
                <X className="w-4 h-4 text-ink-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && <p className="text-xs text-danger font-medium bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              {/* Image picker */}
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-2">Product Image</label>
                {form.img && (
                  <div className="w-full h-36 rounded-2xl overflow-hidden bg-surface-secondary mb-2">
                    <img src={form.img} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  <button type="button"
                    onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border text-sm font-medium text-ink-secondary hover:bg-surface-hover transition-colors">
                    <Upload className="w-4 h-4" /> Gallery / PC
                  </button>
                  <button type="button"
                    onClick={() => { fileRef.current?.setAttribute('capture','environment'); fileRef.current?.click(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border text-sm font-medium text-ink-secondary hover:bg-surface-hover transition-colors">
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
                <p className="text-[11px] text-ink-muted mb-1">Or paste a URL instead</p>
                <input value={form.img.startsWith('data:') ? '' : form.img}
                  onChange={e => setForm(f => ({ ...f, img: e.target.value }))}
                  className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Product Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Chicken Chews" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Price (K) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="e.g. 120" min="1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-secondary block mb-1">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ShopProduct['category'] }))}
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-secondary block mb-1">Badge</label>
                    <select value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                      {BADGES.map(b => <option key={b} value={b}>{b || 'None'}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="Short description (optional)" />
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary hover:bg-surface-hover transition-colors">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
                style={{ background: '#1B4332' }}>
                {modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-danger" />
            </div>
            <h3 className="font-bold text-ink mb-2">Delete Product?</h3>
            <p className="text-sm text-ink-muted mb-6">This will remove the product from the store permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">
                Cancel
              </button>
              <button onClick={() => { removeProduct(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 py-3 rounded-2xl bg-danger text-white text-sm font-bold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
