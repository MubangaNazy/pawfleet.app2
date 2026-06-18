import { useRef, useState } from 'react';
import { Camera, Upload, Check, LogOut, Store, MapPin, Tag, ChevronRight, Pencil, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const SHOP_TYPES = ['Pet Supplies', 'Dog Food & Treats', 'Dog Accessories', 'Grooming Products', 'Veterinary Supplies', 'Mixed / General'];

async function resizePhoto(file: File, maxDim = 512, q = 0.82): Promise<string> {
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

export default function ShopOwnerProfile() {
  const { currentUser, updateUser, logout } = useApp();
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [businessName,    setBusinessName]    = useState(currentUser?.businessName    || '');
  const [businessType,    setBusinessType]    = useState(currentUser?.businessType    || '');
  const [businessAddress, setBusinessAddress] = useState(currentUser?.businessAddress || '');
  const [ownerName,       setOwnerName]       = useState(currentUser?.name            || '');
  const [phone,           setPhone]           = useState(currentUser?.phone           || '');
  const [logo,            setLogo]            = useState<string>(currentUser?.imageUrl || '');
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [showLogout,      setShowLogout]      = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(await resizePhoto(file));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    await updateUser(currentUser.id, {
      name: ownerName.trim() || currentUser.name,
      phone: phone.trim() || currentUser.phone,
      imageUrl: logo || undefined,
      businessName: businessName.trim() || undefined,
      businessType: businessType || undefined,
      businessAddress: businessAddress.trim() || undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = (currentUser?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* Header */}
      <div className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)' }}>
        <h1 className="text-xl font-extrabold text-white">Shop Profile</h1>
        <p className="text-white/70 text-sm">Customise how your shop appears to buyers</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors group relative"
              style={logo ? { border: 'none' } : {}}>
              {logo
                ? <><img src={logo} alt="Logo" className="w-24 h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div></>
                : <div className="w-24 h-24 flex flex-col items-center justify-center gap-1"
                    style={{ background: '#EBF5EF' }}>
                    <span className="text-2xl font-bold" style={{ color: '#1B4332' }}>{initials}</span>
                    <Camera className="w-4 h-4" style={{ color: '#1B4332' }} />
                  </div>}
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo('')}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-surface-border flex items-center justify-center shadow">
                <X className="w-3 h-3 text-ink-muted" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover">
              <Upload className="w-3 h-3" /> Gallery
            </button>
            <button type="button" onClick={() => { fileRef.current?.setAttribute('capture','environment'); fileRef.current?.click(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover">
              <Camera className="w-3 h-3" /> Camera
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <p className="text-xs text-ink-muted">Upload your business logo (optional)</p>
        </div>

        {/* Business info */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Store className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Business Details</p>
          </div>

          <div className="px-4 py-3 space-y-1">
            <label className="text-xs text-ink-muted">Business Name</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Barks & Bites Pet Store"
              className="w-full h-10 px-3 rounded-xl border border-surface-border text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
          </div>

          <div className="px-4 py-3 space-y-1">
            <label className="text-xs text-ink-muted flex items-center gap-1"><Tag className="w-3 h-3" /> Shop Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SHOP_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setBusinessType(t)}
                  className="py-2 px-3 rounded-xl text-xs font-medium border text-left transition-all"
                  style={{
                    background: businessType === t ? '#1B4332' : 'white',
                    color: businessType === t ? 'white' : '#6B7280',
                    borderColor: businessType === t ? '#1B4332' : '#E5E7EB',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-1">
            <label className="text-xs text-ink-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> Business Address</label>
            <textarea rows={2} value={businessAddress} onChange={e => setBusinessAddress(e.target.value)}
              placeholder="e.g. Shop 4, Manda Hill Mall, Lusaka"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-border text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all resize-none" />
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Pencil className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Account Info</p>
          </div>
          {[
            { label: 'Your Name', value: ownerName, set: setOwnerName, type: 'text', placeholder: 'Full name' },
            { label: 'Phone',     value: phone,     set: setPhone,     type: 'tel',  placeholder: '+260 xxx xxx xxx' },
          ].map(f => (
            <div key={f.label} className="px-4 py-3 space-y-1">
              <label className="text-xs text-ink-muted">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                className="w-full h-10 px-3 rounded-xl border border-surface-border text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
            </div>
          ))}
        </div>

        {/* Save */}
        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {saving ? 'Saving…' : saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Check className="w-4 h-4" /> Save Profile</>}
        </button>

        {/* Preview card */}
        {(businessName || businessType || businessAddress) && (
          <div className="rounded-2xl border border-surface-border p-4 bg-white space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">How buyers see your shop</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold text-white"
                style={{ background: logo ? undefined : 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : initials}
              </div>
              <div>
                <p className="font-bold text-ink">{businessName || ownerName}'s Shop</p>
                {businessType && <p className="text-xs text-primary font-semibold">{businessType}</p>}
                {businessAddress && (
                  <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{businessAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        {showLogout ? (
          <div className="bg-white border border-surface-border rounded-3xl p-5 text-center">
            <p className="font-semibold text-ink mb-1 text-sm">Log out?</p>
            <div className="flex gap-3 mt-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-2.5 rounded-2xl border border-surface-border text-sm font-semibold">Cancel</button>
              <button onClick={() => { logout(); navigate('/login'); }} className="flex-1 py-2.5 rounded-2xl bg-danger text-white text-sm font-semibold">Log Out</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLogout(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-danger hover:bg-danger/5 rounded-2xl transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        )}

        <p className="text-center text-xs text-ink-muted">PawFleet v1.0.0 · Made with 🐾 in Zambia</p>
      </div>
    </div>
  );
}
