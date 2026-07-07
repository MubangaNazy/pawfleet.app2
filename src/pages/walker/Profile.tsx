import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, ChevronRight, Settings, LogOut, Star, DollarSign, Activity, Camera, Upload, X, Check, Pencil, MapPin } from 'lucide-react';
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

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateUser } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName]       = useState(currentUser?.name || '');
  const [phone, setPhone]     = useState(currentUser?.phone || '');
  const [email, setEmail]     = useState(currentUser?.email || '');
  const [preview, setPreview] = useState<string | null>(currentUser?.imageUrl || null);
  const [saving, setSaving]   = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(await resizePhoto(file));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    await updateUser(currentUser.id, {
      name: name.trim() || currentUser.name,
      phone: phone.trim() || currentUser.phone,
      email: email.trim() || undefined,
      imageUrl: preview || undefined,
    });
    await new Promise(r => setTimeout(r, 300));
    onClose();
  };

  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-surface-border" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
          <h2 className="text-lg font-bold text-ink">Edit Profile</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5 pb-10">
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-3xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors group"
              style={preview ? { border: 'none' } : {}}>
              {preview
                ? <><img src={preview} alt="Profile" className="w-24 h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" /></div></>
                : <div className="w-24 h-24 flex flex-col items-center justify-center text-primary/60 gap-1"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-2xl font-bold text-white">{initials}</span>
                    <Camera className="w-5 h-5 text-white" />
                  </div>}
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {[
            { label: 'Full Name', value: name, setValue: setName, type: 'text' },
            { label: 'Phone',     value: phone, setValue: setPhone, type: 'tel' },
            { label: 'Email',     value: email, setValue: setEmail, type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setValue(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink focus:outline-none focus:border-primary transition-all" />
            </div>
          ))}

          <button type="button" disabled={saving} onClick={handleSave}
            className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WalkerProfile() {
  const { currentUser, data, getWalkerStats, logout, updateUser } = useApp();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationSet, setLocationSet] = useState(false);

  const myWalks    = data.walks.filter(w => w.walkerId === currentUser?.id && w.status === 'completed');
  const myPayments = data.payments.filter(p => p.walkerId === currentUser?.id);
  const totalEarned = myPayments.reduce((s, p) => s + p.amount, 0);
  const gamStats = getWalkerStats(currentUser?.id || '');

  const initials = currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSetLocation = async () => {
    if (!currentUser || !navigator.geolocation) return;
    setLocationSaving(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await updateUser(currentUser.id, { serviceLat: pos.coords.latitude, serviceLng: pos.coords.longitude } as any);
        setLocationSaving(false);
        setLocationSet(true);
        setTimeout(() => setLocationSet(false), 3000);
      },
      () => setLocationSaving(false),
      { timeout: 10000 }
    );
  };

  const menuItems = [
    { icon: Bell,     label: 'Notifications',    onClick: () => navigate('/walker/notifications') },
    { icon: Shield,   label: 'Privacy & safety', onClick: () => navigate('/walker/privacy') },
    { icon: Settings, label: 'App settings',     onClick: () => navigate('/walker/settings') },
  ];

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-10 pb-0"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="flex flex-col items-center text-center">
          {/* Avatar with edit button */}
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
              {currentUser?.imageUrl
                ? <img src={currentUser.imageUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                : <span>{initials}</span>}
            </div>
            <button type="button" onClick={() => setShowEdit(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md hover:bg-surface-hover transition-colors">
              <Pencil className="w-3.5 h-3.5" style={{ color: '#1B4332' }} />
            </button>
          </div>

          <h1 className="text-xl font-extrabold text-white">{currentUser?.name}</h1>
          <p className="text-white/75 text-sm mt-1">{currentUser?.phone}</p>
          {currentUser?.email && <p className="text-white/60 text-xs mt-0.5">{currentUser.email}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">Walker</span>
            {gamStats.streak > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">🔥 {gamStats.streak}-day streak</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {[
            { icon: Activity,   label: 'Walks',   value: myWalks.length },
            { icon: DollarSign, label: 'Earned',  value: `K${totalEarned}` },
            { icon: Star,       label: 'Points',  value: gamStats.points },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3 text-center">
              <p className="text-lg font-extrabold text-white">{value}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Badges preview */}
        {(() => {
          const WALK_BADGE_DEFS = [
            { id: 'first_walk',        label: 'First Steps', icon: '🐾', minWalks: 1  },
            { id: 'five_walks',        label: '5 Walker',    icon: '⭐', minWalks: 5  },
            { id: 'ten_walks',         label: 'Pro Walker',  icon: '🏆', minWalks: 10 },
            { id: 'twenty_five_walks', label: 'Walk Master', icon: '🥇', minWalks: 25 },
          ];
          const claimedIds: string[] = JSON.parse(localStorage.getItem(`pawfleet_walker_claimed_${currentUser?.id}`) || '[]');
          const badges = WALK_BADGE_DEFS.filter(b => myWalks.length >= b.minWalks && claimedIds.includes(b.id));
          const allBadges = [...badges, ...gamStats.badges.filter(b => !badges.find(x => x.id === b.id))];
          return allBadges.length > 0 ? (
            <div className="mt-3 mb-2">
              <div className="flex gap-1.5 flex-wrap justify-center">
                {allBadges.slice(0, 5).map(badge => (
                  <span key={badge.id} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/20 text-white text-[11px] font-semibold">
                    {badge.icon} {badge.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null;
        })()}
        <div className="h-6" />
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Set service area */}
        <button type="button" onClick={handleSetLocation} disabled={locationSaving}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-secondary transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
            <MapPin className="w-4 h-4" style={{ color: '#2B8A50' }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-ink">
              {locationSaving ? 'Getting GPS…' : locationSet ? '✓ Service area updated!' : 'Set My Service Area'}
            </p>
            <p className="text-xs text-ink-muted">
              {currentUser?.serviceLat ? `Location saved · owners nearby will find you` : 'Let owners in your area find you'}
            </p>
          </div>
          {!locationSaving && !locationSet && <ChevronRight className="w-4 h-4 text-ink-muted" />}
        </button>

        {/* Settings menu */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          {menuItems.map((item, i) => (
            <button key={item.label} type="button" onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-secondary transition-colors text-left ${i > 0 ? 'border-t border-surface-border' : ''}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
                <item.icon className="w-4 h-4" style={{ color: '#2B8A50' }} />
              </div>
              <span className="flex-1 text-sm font-medium text-ink">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button type="button" onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-red-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-danger" />
          </div>
          <span className="flex-1 text-sm font-medium text-danger">Sign out</span>
        </button>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-danger" />
            </div>
            <h3 className="font-bold text-ink mb-2">Sign out?</h3>
            <p className="text-sm text-ink-muted mb-6">You'll need to sign back in.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">Cancel</button>
              <button type="button" onClick={handleLogout}
                className="flex-1 py-3 rounded-2xl bg-danger text-white text-sm font-bold">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </div>
  );
}
