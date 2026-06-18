import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Bell, Heart, Shield, ChevronRight, LogOut, Dog, Camera, Upload, X, Check, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isThisMonth } from 'date-fns';

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

const ACHIEVEMENT_DEFS = [
  { id: 'first_walk', label: 'First Walk!',  icon: '🐾', description: 'Book your first walk',    target: 1,  metric: 'walks'   },
  { id: 'five_walks', label: 'Committed',    icon: '🌿', description: '5 completed walks',       target: 5,  metric: 'walks'   },
  { id: 'ten_walks',  label: 'Loyal Owner',  icon: '💚', description: '10 completed walks',      target: 10, metric: 'walks'   },
  { id: 'multi_dog',  label: 'Pack Leader',  icon: '🐕', description: '2 or more dogs added',    target: 2,  metric: 'dogs'    },
  { id: 'active',     label: 'Active Month', icon: '🔥', description: '3 walks this month',      target: 3,  metric: 'monthly' },
];

function getAchievementProgress(id: string, completedWalks: number, dogs: number, monthly: number) {
  if (id === 'first_walk') return { current: Math.min(completedWalks, 1),  target: 1  };
  if (id === 'five_walks') return { current: Math.min(completedWalks, 5),  target: 5  };
  if (id === 'ten_walks')  return { current: Math.min(completedWalks, 10), target: 10 };
  if (id === 'multi_dog')  return { current: Math.min(dogs, 2),            target: 2  };
  if (id === 'active')     return { current: Math.min(monthly, 3),         target: 3  };
  return { current: 0, target: 1 };
}

function computeStreak(walks: { scheduledDate: string; status: string }[]): number {
  const completedDates = [...new Set(
    walks.filter(w => w.status === 'completed').map(w => w.scheduledDate.split('T')[0])
  )].sort().reverse();
  if (!completedDates.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < completedDates.length; i++) {
    const dayDiff = Math.floor((today.getTime() - new Date(completedDates[i]).getTime()) / 86400000);
    if (dayDiff <= i + 2) streak++;
    else break;
  }
  return streak;
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

  const initials = (name || currentUser?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-3xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors group"
              style={preview ? { border: 'none' } : {}}>
              {preview
                ? <><img src={preview} alt="Profile" className="w-24 h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div></>
                : <div className="w-24 h-24 flex flex-col items-center justify-center text-primary/60 gap-1"
                    style={{ background: '#EBF5EF' }}>
                    <span className="text-2xl font-bold">{initials}</span>
                    <Camera className="w-5 h-5" />
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
            { label: 'Full Name', value: name, setValue: setName, type: 'text', placeholder: 'Your name' },
            { label: 'Phone',     value: phone, setValue: setPhone, type: 'tel', placeholder: '+260 xxx xxx xxx' },
            { label: 'Email',     value: email, setValue: setEmail, type: 'email', placeholder: 'you@email.com' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setValue(e.target.value)} placeholder={f.placeholder}
                className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
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

export default function Profile() {
  const { currentUser, data, logout, sendNotification } = useApp();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const myDogs         = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const myWalks        = data.walks.filter(w => w.ownerId === currentUser?.id);
  const completedWalks = myWalks.filter(w => w.status === 'completed');
  const thisMonthWalks = completedWalks.filter(w => isThisMonth(new Date(w.scheduledDate)));
  const totalSpent     = thisMonthWalks.reduce((s, w) => s + ((w as any).ownerCost || w.price || 0), 0);
  const streak         = computeStreak(myWalks);

  const achievementProgress = ACHIEVEMENT_DEFS.map(def => {
    const { current, target } = getAchievementProgress(def.id, completedWalks.length, myDogs.length, thisMonthWalks.length);
    return { ...def, current, target, earned: current >= target };
  });

  // Fire a notification the first time each achievement is earned
  const notifKeyRef = `pawfleet_achiev_notified_${currentUser?.id}`;
  useEffect(() => {
    if (!currentUser) return;
    const notified: string[] = JSON.parse(localStorage.getItem(notifKeyRef) || '[]');
    const newlyEarned = achievementProgress.filter(a => a.earned && !notified.includes(a.id));
    if (newlyEarned.length === 0) return;
    newlyEarned.forEach(a => {
      sendNotification(currentUser.id, 'achievement',
        `Achievement Unlocked! ${a.icon}`, `You earned "${a.label}" — ${a.description}`, {
          achievementId: a.id, achievementIcon: a.icon,
          achievementLabel: a.label, achievementDescription: a.description,
        });
    });
    localStorage.setItem(notifKeyRef, JSON.stringify([...notified, ...newlyEarned.map(a => a.id)]));
  }, [completedWalks.length, myDogs.length, thisMonthWalks.length]);

  const earnedCount = achievementProgress.filter(a => a.earned).length;
  const initials    = currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const handleLogout = () => { logout(); navigate('/login'); };

  const claimKey = `pawfleet_achiev_claimed_${currentUser?.id}`;
  const [claimed, setClaimed] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(claimKey) || '[]')
  );
  const handleClaim = (id: string) => {
    const next = [...claimed, id];
    setClaimed(next);
    localStorage.setItem(claimKey, JSON.stringify(next));
  };
  const claimedAchievements = achievementProgress.filter(a => a.earned && claimed.includes(a.id));

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* User info row */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0" style={{ background: '#1B4332' }}>
            {currentUser?.imageUrl
              ? <img src={currentUser.imageUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl font-extrabold text-white">{initials}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-ink text-lg leading-tight">{currentUser?.name}</p>
            <p className="text-sm text-ink-secondary truncate">{currentUser?.email || currentUser?.phone}</p>
            {streak > 0 && (
              <p className="text-xs font-bold mt-0.5" style={{ color: '#E67E22' }}>🔥 {streak}-day streak</p>
            )}
            {claimedAchievements.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {claimedAchievements.map(a => (
                  <span key={a.id} title={a.label}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-base border-2 border-white shadow-sm"
                    style={{ background: '#EBF5EF' }}>
                    {a.icon}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setShowEdit(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-surface-border hover:bg-surface-hover text-ink-secondary">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Monthly spending card */}
        <div className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">↗ This month</p>
          <p className="text-4xl font-extrabold mb-1">K{totalSpent.toLocaleString() || '0'}</p>
          <p className="text-sm text-white/70">
            {thisMonthWalks.length} walk{thisMonthWalks.length !== 1 ? 's' : ''}
            {myDogs.length > 0 ? ` · ${myDogs.length} dog${myDogs.length !== 1 ? 's' : ''}` : ''}
          </p>
          <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white/70 transition-all"
              style={{ width: `${Math.min((totalSpent / 500) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-white/60 mt-1.5">K{Math.max(500 - totalSpent, 0)} left in monthly budget</p>
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-ink">Achievements</p>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#EBF5EF', color: '#1B4332' }}>{earnedCount}/{ACHIEVEMENT_DEFS.length} earned</span>
          </div>
          <div className="space-y-2.5">
            {achievementProgress.map(a => {
              const pct = Math.round((a.current / a.target) * 100);
              return (
                <div key={a.id}
                  className="flex items-center gap-3 p-4 rounded-2xl border bg-white transition-all"
                  style={{ borderColor: a.earned ? '#52B788' : '#E5E7EB', boxShadow: a.earned ? '0 0 0 1px #52B78840' : 'none' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: a.earned ? '#EBF5EF' : '#F9FAFB' }}>
                    {a.earned ? a.icon : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-bold ${a.earned ? 'text-ink' : 'text-ink-muted'}`}>{a.label}</p>
                      <span className="text-xs font-semibold shrink-0 ml-2"
                        style={{ color: a.earned ? '#2B8A50' : '#9CA3AF' }}>{a.current}/{a.target}</span>
                    </div>
                    <p className="text-[11px] text-ink-muted mb-2">{a.description}</p>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: a.earned
                            ? 'linear-gradient(90deg, #1B4332, #2B8A50)'
                            : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
                        }} />
                    </div>
                  </div>
                  {a.earned && !claimed.includes(a.id) && (
                    <button type="button" onClick={() => handleClaim(a.id)}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                      Claim 🎁
                    </button>
                  )}
                  {a.earned && claimed.includes(a.id) && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg"
                      style={{ background: '#EBF5EF' }}>
                      {a.icon}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* My dogs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-ink">My dog{myDogs.length !== 1 ? 's' : ''}</p>
            <button onClick={() => navigate('/owner/dogs')} className="text-xs text-ink-secondary font-medium hover:text-primary">Manage →</button>
          </div>
          {myDogs.length === 0 ? (
            <p className="text-sm text-ink-muted">No dogs registered yet</p>
          ) : (
            <div className="space-y-2">
              {myDogs.map(dog => (
                <button key={dog.id} onClick={() => navigate(`/owner/dogs/${dog.id}`)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-surface-border bg-white hover:bg-surface-hover transition-colors text-left">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-secondary flex items-center justify-center shrink-0">
                    {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" /> : <Dog className="w-6 h-6 text-ink-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink">{dog.name}</p>
                    <p className="text-xs text-ink-muted">{dog.breed || 'Mixed'}{dog.age ? ` · ${dog.age} yrs` : ''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu items */}
        {(() => {
          const menuItems = [
            { icon: CreditCard, label: 'Payment methods',  onClick: () => navigate('/owner/profile/payment') },
            { icon: Bell,       label: 'Notifications',     onClick: () => navigate('/owner/notifications') },
            { icon: Heart,      label: 'Favourite walkers', onClick: () => navigate('/owner/favourites') },
            { icon: Shield,     label: 'Privacy & safety',  onClick: () => navigate('/owner/privacy') },
          ];
          return (
            <div className="bg-white border border-surface-border rounded-3xl overflow-hidden divide-y divide-surface-border">
              {menuItems.map(item => (
                <button key={item.label} onClick={item.onClick} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors text-left">
                  <item.icon className="w-5 h-5 text-ink-secondary shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-ink">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </button>
              ))}
            </div>
          );
        })()}

        {/* Sign out */}
        {showLogoutConfirm ? (
          <div className="bg-white border border-surface-border rounded-3xl p-5 text-center">
            <p className="font-semibold text-ink mb-1 text-sm">Log out of PawFleet?</p>
            <p className="text-xs text-ink-muted mb-4">You'll need to sign in again.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-2xl border border-surface-border text-sm font-semibold text-ink hover:bg-surface-hover">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-2.5 rounded-2xl bg-danger text-white text-sm font-semibold hover:bg-danger/90">Log Out</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-danger hover:bg-danger/5 rounded-2xl transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        )}

        <p className="text-center text-xs text-ink-muted">PawFleet v1.0.0 · Made with 🐾 in Zambia</p>
      </div>

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </div>
  );
}
