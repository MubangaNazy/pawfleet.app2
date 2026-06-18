import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Stethoscope, Camera, Upload, Check, X, Pencil, MapPin, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

async function resizePhoto(file: File, maxDim = 512, q = 0.78): Promise<string> {
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

function EditModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateUser } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name,    setName]    = useState(currentUser?.name    || '');
  const [email,   setEmail]   = useState(currentUser?.email   || '');
  const [preview, setPreview] = useState<string | null>(currentUser?.imageUrl || null);
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    await updateUser(currentUser.id, { name: name.trim() || currentUser.name, email: email.trim() || undefined, imageUrl: preview || undefined });
    await new Promise(r => setTimeout(r, 300));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-surface-border" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
          <h2 className="text-lg font-bold text-ink">Edit Clinic Profile</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5 pb-10">
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-3xl overflow-hidden border-2 border-dashed border-teal-400/40 hover:border-teal-400 transition-colors group"
              style={preview ? { border: 'none' } : {}}>
              {preview
                ? <><img src={preview} alt="Logo" className="w-24 h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" /></div></>
                : <div className="w-24 h-24 flex flex-col items-center justify-center gap-1 text-teal-400/60">
                    <Camera className="w-6 h-6" /></div>}
            </button>
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={async e => { const f = e.target.files?.[0]; if (f) setPreview(await resizePhoto(f)); }} />
          </div>
          {[
            { label: 'Clinic Name', value: name,  set: setName,  type: 'text'  },
            { label: 'Email',       value: email, set: setEmail, type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:border-teal-500" />
            </div>
          ))}
          <button type="button" disabled={saving} onClick={handleSave}
            className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
            {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VetProfile() {
  const { currentUser, data, logout } = useApp();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);

  const initials = currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'VC';

  const vetWalks     = data.walks.filter(w => w.notes?.startsWith('VET BOOKING:'));
  const totalRev     = vetWalks.filter(w => w.status === 'completed').reduce((s, w) => s + w.price, 0);
  const pendingCount = vetWalks.filter(w => w.status === 'pending').length;

  return (
    <div className="max-w-xl mx-auto pb-16">

      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-10 pb-0"
        style={{ background: 'linear-gradient(135deg,#0F766E 0%,#0891B2 60%,#0EA5E9 100%)' }}>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-extrabold text-white shadow-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
              {currentUser?.imageUrl
                ? <img src={currentUser.imageUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                : <span>{initials}</span>}
            </div>
            <button type="button" onClick={() => setShowEdit(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md hover:bg-surface-hover">
              <Pencil className="w-3.5 h-3.5 text-teal-700" />
            </button>
          </div>
          <h1 className="text-xl font-extrabold text-white">{currentUser?.name}</h1>
          <p className="text-white/75 text-sm mt-0.5">{currentUser?.phone}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1.5">
              <Stethoscope className="w-3 h-3" /> Vet Partner
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Lusaka
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          {[
            { label: 'Bookings',  value: vetWalks.length },
            { label: 'Pending',   value: pendingCount    },
            { label: 'Revenue K', value: totalRev        },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/15 backdrop-blur rounded-2xl px-2 py-3 text-center">
              <p className="text-base font-extrabold text-white">{value}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="h-6" />
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Clinic info */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          {[
            { icon: '🏥', label: 'Clinic Type',      value: 'Veterinary Partner' },
            { icon: '📍', label: 'Location',          value: 'Lusaka, Zambia' },
            { icon: '⏰', label: 'Operating Hours',   value: 'Mon–Sat 8am–6pm' },
            { icon: '📞', label: 'Contact',           value: currentUser?.phone ?? '' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-lg w-8 text-center">{item.icon}</span>
              <div className="flex-1">
                <p className="text-xs text-ink-muted">{item.label}</p>
                <p className="text-sm font-semibold text-ink">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button type="button" onClick={() => setShowLogout(true)}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-red-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-danger" />
          </div>
          <span className="flex-1 text-sm font-medium text-danger">Sign out</span>
        </button>
      </div>

      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-danger" />
            </div>
            <h3 className="font-bold text-ink mb-2">Sign out?</h3>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">Cancel</button>
              <button type="button" onClick={() => { logout(); navigate('/login'); }}
                className="flex-1 py-3 rounded-2xl bg-danger text-white text-sm font-bold">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && <EditModal onClose={() => setShowEdit(false)} />}
    </div>
  );
}
