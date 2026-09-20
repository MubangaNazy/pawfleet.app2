import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Commands',
    price: 3500,
    icon: '🐕',
    days: 14,
    skills: ['Sit, Stay, Come, Heel', 'Leash manners', 'No jumping', 'Socialisation', 'Potty training'],
  },
  {
    id: 'security',
    name: 'Aggression & Security',
    price: 3500,
    icon: '🛡️',
    days: 14,
    skills: ['Guard dog training', 'Property protection', 'Controlled aggression', 'Attack on command', 'Search & locate'],
  },
];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function DogTraining() {
  const navigate = useNavigate();
  const { currentUser, data } = useApp();

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  // Only walkers approved as trainers (trainerStatus: 'approved' in pricing JSONB)
  const trainers = data.users.filter(
    u => u.role === 'walker' && (u.pricing as any)?.trainerStatus === 'approved'
  );

  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [dogSize, setDogSize] = useState<'small' | 'large'>('small');
  const [selectedDog, setSelectedDog] = useState<string>(myDogs[0]?.id ?? '');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [chatTrainer, setChatTrainer] = useState<typeof trainers[0] | null>(null);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const togglePkg = (id: string) =>
    setSelectedPackages(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

  const sessionMin = dogSize === 'small' ? 35 : 60;
  const basePrice = selectedPackages.length === 2 ? 6000 : selectedPackages.length === 1 ? 3500 : 0;

  const handleBook = async () => {
    if (!currentUser) return;
    if (selectedPackages.length === 0) { setError('Please select at least one training package.'); return; }
    if (!selectedDog) { setError('Please select a dog.'); return; }
    if (trainers.length > 0 && !selectedTrainer) { setError('Please select a trainer.'); return; }
    setBooking(true);
    setError('');
    const dog = myDogs.find(d => d.id === selectedDog);
    const trainer = trainers.find(t => t.id === selectedTrainer);
    const pkgNames = selectedPackages.map(p => PACKAGES.find(pk => pk.id === p)?.name).join(' + ');
    const { error: dbErr } = await supabase.from('walks').insert({
      id: crypto.randomUUID(),
      owner_id: currentUser.id,
      dog_id: selectedDog || null,
      walker_id: trainer?.id || null,
      status: 'pending',
      scheduled_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      price: basePrice,
      walker_earning: Math.round(basePrice * 0.8),
      duration: sessionMin * 14,
      notes: `TRAINING: ${pkgNames} | Dog: ${dog?.name ?? 'N/A'} | Size: ${dogSize} | Session: ${sessionMin} min/day | Trainer: ${trainer?.name ?? 'TBC'} | Price: K${basePrice}`,
      created_at: new Date().toISOString(),
    });
    setBooking(false);
    if (dbErr) setError('Booking failed. Please try again.');
    else setSuccess(true);
  };

  return (
    <div className="max-w-lg mx-auto pb-28 bg-white min-h-screen">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink flex-1">Dog Training</h1>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 210 }}>
        <img src="/images/pf-walk-man.png" alt="Dog Training"
          className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.38)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(7,26,14,0.3) 0%, rgba(7,26,14,0.88) 100%)' }} />
        <div className="relative px-5 pt-7 pb-8 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-white/80 text-[11px] uppercase tracking-widest font-bold">Professional Training</p>
          </div>
          <h2 className="text-white text-2xl font-extrabold leading-tight mb-1">
            Train your dog<br />the right way 🐕
          </h2>
          <p className="text-white/55 text-sm mb-3">14-day certified program · From <span className="text-white font-bold">K3,500</span></p>
          <div className="flex flex-wrap gap-2">
            {[`${sessionMin} min/day`, '14-day program', 'Certified trainers', 'Guaranteed results'].map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/85"
                style={{ background: 'rgba(255,255,255,0.13)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-7">

        {/* ── Dog size ── */}
        <section>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2.5">Your dog's size</p>
          <div className="grid grid-cols-2 gap-2.5">
            {(['small', 'large'] as const).map(size => (
              <button key={size} onClick={() => setDogSize(size)}
                className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${dogSize === size ? 'border-primary bg-primary/10' : 'border-surface-border hover:bg-surface-hover'}`}>
                <span className="text-3xl">{size === 'small' ? '🐩' : '🐕‍🦺'}</span>
                <div className="text-center">
                  <p className={`text-sm font-extrabold ${dogSize === size ? 'text-primary' : 'text-ink'}`}>
                    {size === 'small' ? 'Small dog' : 'Large dog'}
                  </p>
                  <p className={`text-xs mt-0.5 ${dogSize === size ? 'text-primary/70' : 'text-ink-muted'}`}>
                    {size === 'small' ? 'Max 35 min / day' : 'Max 60 min / day'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Packages ── */}
        <section>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2.5">Choose package</p>
          {selectedPackages.length === 2 && (
            <div className="mb-3 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2"
              style={{ background: '#FEF3C7', color: '#92400E' }}>
              🎉 Bundle deal — both packages for K6,000 (save K1,000)
            </div>
          )}
          <div className="space-y-3">
            {PACKAGES.map(pkg => {
              const on = selectedPackages.includes(pkg.id);
              return (
                <button key={pkg.id} onClick={() => togglePkg(pkg.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${on ? 'border-primary bg-primary/5' : 'border-surface-border hover:border-primary/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: on ? '#EBF5EF' : '#F3F4F6' }}>
                      {pkg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-extrabold text-ink">{pkg.name}</p>
                        <p className="font-extrabold text-ink shrink-0 ml-2 text-xs">from K{pkg.price.toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-ink-muted mb-2">{pkg.days} days · {sessionMin} min/day</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.skills.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ background: on ? '#D1FAE5' : '#F3F4F6', color: on ? '#065F46' : '#6B7280' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${on ? 'bg-primary border-primary' : 'border-ink-muted'}`}>
                      {on && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Dog selector ── */}
        {myDogs.length > 0 && (
          <section>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2.5">Which dog?</p>
            <div className="flex flex-wrap gap-2">
              {myDogs.map(dog => (
                <button key={dog.id} onClick={() => setSelectedDog(dog.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all ${selectedDog === dog.id ? 'border-primary bg-primary/10 text-primary' : 'border-surface-border text-ink'}`}>
                  <span>{dog.animalType === 'cat' ? '🐱' : '🐶'}</span>
                  {dog.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Trainers ── */}
        <section>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2.5">Choose a trainer</p>

          {trainers.length === 0 ? (
            <div className="rounded-2xl border border-surface-border p-6 text-center">
              <p className="text-3xl mb-2">🐕</p>
              <p className="font-semibold text-ink text-sm">No trainers available yet</p>
              <p className="text-xs text-ink-muted mt-1">
                We're onboarding certified trainers. Your request will be matched automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainers.map(trainer => {
                const on = selectedTrainer === trainer.id;
                return (
                  <div key={trainer.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${on ? 'border-primary bg-primary/5' : 'border-surface-border'}`}>
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                      {trainer.imageUrl
                        ? <img src={trainer.imageUrl} alt={trainer.name} className="w-full h-full object-cover" />
                        : initials(trainer.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm leading-tight">{trainer.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">Certified Dog Trainer · PawFleet Verified</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setChatTrainer(trainer)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center border border-surface-border hover:bg-surface-hover">
                        <MessageCircle className="w-4 h-4 text-ink-muted" />
                      </button>
                      <button
                        onClick={() => setSelectedTrainer(on ? '' : trainer.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${on ? 'text-white' : 'border border-surface-border text-ink-secondary hover:bg-surface-hover'}`}
                        style={on ? { background: 'linear-gradient(135deg, #1B4332, #2B8A50)' } : {}}>
                        {on ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Price summary ── */}
        {basePrice > 0 && (
          <section className="rounded-2xl overflow-hidden border border-surface-border">
            <div className="px-4 py-3" style={{ background: '#F9FAFB' }}>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Price Summary</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              {selectedPackages.length === 2 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-secondary">Bundle (both packages)</span>
                    <span className="font-semibold text-ink">K6,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Bundle saving</span>
                    <span className="font-semibold text-green-600">−K1,000</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-secondary">Package</span>
                  <span className="font-semibold text-ink">K{basePrice.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-surface-border">
                <span className="font-bold text-ink">Total</span>
                <span className="font-extrabold text-ink text-lg">K{basePrice.toLocaleString()}</span>
              </div>
              <p className="text-xs text-ink-muted">14 days · {sessionMin} min/day sessions</p>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-2xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Book button */}
        <button onClick={handleBook} disabled={booking}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          {booking ? 'Booking…' : `Book Training${basePrice > 0 ? ` · K${basePrice.toLocaleString()}` : ''}`}
          {!booking && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Chat modal ── */}
      {chatTrainer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setChatTrainer(null)}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-surface-border rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                {chatTrainer.imageUrl
                  ? <img src={chatTrainer.imageUrl} alt={chatTrainer.name} className="w-full h-full object-cover" />
                  : initials(chatTrainer.name)}
              </div>
              <div>
                <p className="font-extrabold text-ink text-lg">{chatTrainer.name}</p>
                <p className="text-sm text-ink-muted">Certified Dog Trainer</p>
                <p className="text-xs text-green-600 font-semibold mt-0.5">🟢 Available</p>
              </div>
            </div>
            <p className="text-sm text-ink-secondary mb-5">
              Have questions about training packages or schedules? Reach out directly.
            </p>
            <div className="space-y-3">
              <a href={`https://wa.me/${chatTrainer.phone.replace(/[\s+]/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-white text-sm"
                style={{ background: '#25D366' }}>
                <span className="text-lg">💬</span>
                Chat on WhatsApp
              </a>
              <a href={`tel:${chatTrainer.phone}`}
                className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-sm border-2 border-surface-border text-ink">
                <Phone className="w-4 h-4 text-ink-secondary" />
                Call Trainer
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Success modal ── */}
      {success && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-extrabold text-ink text-xl mb-2">Training Booked!</p>
            <p className="text-sm text-ink-secondary mb-6">
              Your request has been sent. Your trainer will contact you within 24 hours to confirm the schedule.
            </p>
            <button onClick={() => { setSuccess(false); navigate('/owner'); }}
              className="w-full py-3.5 rounded-2xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
