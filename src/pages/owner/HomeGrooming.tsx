import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const todayStr = () => new Date().toISOString().slice(0, 10);

const PACKAGES = [
  { id: 'bath_brush', label: 'Bath & Brush', desc: 'Shampoo, blow-dry, brush-out', price: 249, icon: '🛁' },
  { id: 'full_groom', label: 'Full Groom', desc: 'Bath, trim, nail clip, ear clean', price: 399, icon: '💅' },
  { id: 'nail_trim',  label: 'Nail Trim Only', desc: 'Quick nail clip & file',        price: 99,  icon: '✂️' },
  { id: 'spa',        label: 'Pamper Spa',  desc: 'Full groom + teeth clean + paw massage', price: 599, icon: '✨' },
];

export default function HomeGrooming() {
  const { currentUser, data, createWalk } = useApp();
  const navigate = useNavigate();

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  const [dogId, setDogId]       = useState(myDogs[0]?.id ?? '');
  const [pkg, setPkg]           = useState('full_groom');
  const [date, setDate]         = useState(todayStr());
  const [time, setTime]         = useState('10:00');
  const [address, setAddress]   = useState('');
  const [notes, setNotes]       = useState('');
  const [temperament, setTemperament] = useState<'calm' | 'nervous' | 'aggressive' | ''>('');
  const [submitted, setSubmitted] = useState(false);

  const selectedPkg = PACKAGES.find(p => p.id === pkg)!;
  const canSubmit = dogId && pkg && date && time && address.trim().length > 3 && temperament !== '';

  const handleBook = () => {
    if (!canSubmit || !currentUser) return;
    const dog = data.dogs.find(d => d.id === dogId);
    const scheduledDate = new Date(`${date}T${time}:00`).toISOString();
    createWalk({
      dogId,
      ownerId: currentUser.id,
      status: 'pending',
      scheduledDate,
      duration: 60,
      price: selectedPkg.price,
      walkerEarning: Math.round(selectedPkg.price * 0.75),
      notes: `HOME_GROOMING: ${selectedPkg.label} — ${dog?.name ?? 'Dog'}\nAddress: ${address}\nTemperament: ${temperament}${notes ? `\nNotes: ${notes}` : ''}`,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'linear-gradient(160deg,#1B4332,#2B8A50)' }}>
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Booking Confirmed!</h2>
        <p className="text-white/70 text-sm mb-2">Your home grooming for <strong className="text-white">{selectedPkg.label}</strong> is booked.</p>
        <p className="text-white/60 text-xs mb-8">A groomer will be assigned and contact you before arrival.</p>
        <button type="button"
          onClick={() => navigate('/owner')}
          className="px-8 py-3.5 rounded-2xl bg-white font-bold text-sm active:scale-95 transition-transform"
          style={{ color: '#1B4332' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: '#F3F4F6' }}>
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div>
          <p className="font-extrabold text-ink text-sm">Home Grooming</p>
          <p className="text-xs text-ink-muted">Professional groomer at your door</p>
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 py-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#FFF3E0,#FFE0B2)' }}>
        <div className="absolute right-0 top-0 text-8xl opacity-20 leading-none select-none pointer-events-none">✂️</div>
        <p className="text-lg font-extrabold text-ink mb-1">Pamper Your Pet</p>
        <p className="text-sm text-ink-muted">A certified groomer comes to your home — no stress, no travel.</p>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Dog selector */}
        <div>
          <p className="text-sm font-bold text-ink mb-3">Which dog?</p>
          {myDogs.length === 0 ? (
            <p className="text-sm text-ink-muted">No dogs added yet. <button type="button" onClick={() => navigate('/owner/dogs')} className="text-primary font-semibold">Add a dog →</button></p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myDogs.map(dog => (
                <button key={dog.id} type="button" onClick={() => setDogId(dog.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                    dogId === dog.id ? 'border-primary bg-primary/5' : 'border-surface-border bg-white hover:bg-surface-hover'
                  }`}>
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-secondary shrink-0">
                    {dog.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🐕</div>}
                  </div>
                  <div className="text-left min-w-0">
                    <p className={`font-bold text-sm truncate ${dogId === dog.id ? 'text-primary' : 'text-ink'}`}>{dog.name}</p>
                    <p className="text-xs text-ink-muted truncate">{dog.breed}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dog temperament */}
        <div>
          <p className="text-sm font-bold text-ink mb-1">Dog temperament <span className="text-red-500">*</span></p>
          <p className="text-xs text-ink-muted mb-3">This helps the groomer prepare the right approach and safety equipment.</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'calm',       label: 'Calm',       emoji: '😊', desc: 'Relaxed, easy-going',      color: '#10B981', bg: '#F0FDF4', border: '#86EFAC' },
              { id: 'nervous',    label: 'Nervous',    emoji: '😟', desc: 'Anxious, needs patience',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              { id: 'aggressive', label: 'Aggressive', emoji: '⚠️', desc: 'Bites or acts aggressively', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            ] as const).map(opt => (
              <button key={opt.id} type="button"
                onClick={() => setTemperament(opt.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center"
                style={{
                  borderColor: temperament === opt.id ? opt.color : '#E5E7EB',
                  background: temperament === opt.id ? opt.bg : 'white',
                }}>
                <span className="text-2xl">{opt.emoji}</span>
                <p className="text-xs font-bold" style={{ color: temperament === opt.id ? opt.color : '#374151' }}>{opt.label}</p>
                <p className="text-[10px] leading-tight" style={{ color: temperament === opt.id ? opt.color : '#9CA3AF' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
          {temperament === 'aggressive' && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <span className="text-lg mt-0.5">⚠️</span>
              <p className="text-xs text-red-700 leading-relaxed">
                <strong>Important:</strong> Our groomer will bring a muzzle and use extra caution. Please have the dog on a leash at arrival. Additional handling fee may apply.
              </p>
            </div>
          )}
        </div>

        {/* Grooming package */}
        <div>
          <p className="text-sm font-bold text-ink mb-3">Choose a package</p>
          <div className="space-y-2">
            {PACKAGES.map(p => (
              <button key={p.id} type="button" onClick={() => setPkg(p.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  pkg === p.id ? 'border-primary bg-primary/5' : 'border-surface-border bg-white hover:bg-surface-hover'
                }`}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: pkg === p.id ? '#EBF5EF' : '#F9FAFB' }}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${pkg === p.id ? 'text-primary' : 'text-ink'}`}>{p.label}</p>
                  <p className="text-xs text-ink-muted">{p.desc}</p>
                </div>
                <p className="font-extrabold text-sm shrink-0" style={{ color: pkg === p.id ? '#1B4332' : '#374151' }}>
                  K{p.price}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Date & time */}
        <div>
          <p className="text-sm font-bold text-ink mb-3">When?</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Date</label>
              <input type="date" value={date} min={todayStr()}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-surface-border text-sm font-medium text-ink focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted mb-1 block">Time</label>
              <input type="time" value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-surface-border text-sm font-medium text-ink focus:outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        {/* Home address */}
        <div>
          <label className="text-sm font-bold text-ink mb-2 block">Home address</label>
          <input type="text" value={address} placeholder="e.g. Plot 15, Kabulonga, Lusaka"
            onChange={e => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary" />
          <p className="text-xs text-ink-muted mt-1.5">The groomer will come to this address.</p>
        </div>

        {/* Extra notes */}
        <div>
          <label className="text-sm font-bold text-ink mb-2 block">Any special notes? <span className="text-ink-muted font-normal">(optional)</span></label>
          <textarea value={notes} placeholder="e.g. Dog is nervous around clippers, has sensitive ears…"
            onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary resize-none" />
        </div>

        {/* Price summary */}
        <div className="rounded-2xl p-4 border border-surface-border bg-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-ink">Total</p>
            <p className="text-xl font-extrabold" style={{ color: '#1B4332' }}>K{selectedPkg.price}</p>
          </div>
          <p className="text-xs text-ink-muted">Pay the groomer directly on the day. Cash or mobile money accepted.</p>
        </div>

        {/* Book button */}
        <button type="button" onClick={handleBook} disabled={!canSubmit}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-40 active:scale-95 transition-all shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          Book Home Grooming · K{selectedPkg.price}
        </button>
      </div>
    </div>
  );
}
