import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Search, Star, MapPin, Zap, Calendar, Scissors } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PaymentModal from '../../components/ui/PaymentModal';

const todayStr = () => new Date().toISOString().slice(0, 10);
const DURATIONS = [15, 30, 45, 60];

export default function OwnerRequestWalk() {
  const { data, currentUser, createWalk } = useApp();
  const navigate = useNavigate();
  const walkersRef = useRef<HTMLDivElement>(null);

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const walkers = data.users.filter(u => u.role === 'walker');

  const [dogId, setDogId] = useState('');
  const [schedDate, setSchedDate] = useState(todayStr());
  const [schedTime, setSchedTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [isInstant, setIsInstant] = useState(true);
  const [addGrooming, setAddGrooming] = useState(false);
  const [selectedWalkerId, setSelectedWalkerId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showWalkers, setShowWalkers] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingWalkerId, setPendingWalkerId] = useState<string | undefined>(undefined);

  const selectedDog = myDogs.find(d => d.id === dogId);

  // Auto-select dog when data loads
  useEffect(() => {
    if (myDogs.length === 1 && !dogId) setDogId(myDogs[0].id);
  }, [myDogs.length]);

  const handleFindWalker = () => {
    if (!dogId) return;
    setShowWalkers(true);
    setTimeout(() => {
      walkersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = (walkerId?: string) => {
    if (!dogId) return;
    setPendingWalkerId(walkerId);
    setShowPayment(true);
  };

  const confirmBooking = (paymentMethod: string, reference?: string) => {
    const scheduledDate = isInstant
      ? new Date().toISOString()
      : new Date(`${schedDate}T${schedTime}:00`).toISOString();
    const notes = addGrooming
      ? `Add-on: Grooming requested | Payment: ${paymentMethod}${reference ? ` | Ref: ${reference}` : ''}`
      : `Payment: ${paymentMethod}${reference ? ` | Ref: ${reference}` : ''}`;
    createWalk({
      dogId,
      ownerId: currentUser!.id,
      walkerId: pendingWalkerId || undefined,
      status: 'pending',
      scheduledDate,
      price: addGrooming ? 399 : 150,
      walkerEarning: addGrooming ? 280 : 100,
      notes,
    });
    setShowPayment(false);
    setSubmitted(true);
  };

  const walkerRatings: Record<number, string> = { 0: '4.9', 1: '5.0', 2: '4.8', 3: '4.7' };
  const walkerPrices: Record<number, number> = { 0: 150, 1: 180, 2: 130, 3: 160 };
  const walkerBios: Record<number, string> = {
    0: '5+ years experience, loves big dogs.',
    1: 'Certified trainer & walker.',
    2: 'Available evenings & weekends.',
    3: 'Gentle with anxious dogs.',
  };

  if (submitted) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-extrabold text-ink mb-2 text-center">Booking sent!</h2>
        <p className="text-ink-secondary text-sm text-center mb-2 max-w-xs">
          We'll assign {selectedWalkerId ? data.users.find(u => u.id === selectedWalkerId)?.name?.split(' ')[0] : 'a trusted walker'} and confirm your walk for <strong>{selectedDog?.name}</strong> shortly.
        </p>
        {addGrooming && (
          <p className="text-xs text-primary font-semibold mb-6 bg-primary-50 px-4 py-2 rounded-xl">
            ✂️ Grooming add-on included
          </p>
        )}
        <div className="flex gap-3 w-full max-w-xs mt-4">
          <button onClick={() => navigate('/owner')}
            className="flex-1 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink hover:bg-surface-hover transition-colors">
            Home
          </button>
          <button onClick={() => { setSubmitted(false); setShowWalkers(false); setSelectedWalkerId(''); setAddGrooming(false); }}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
            style={{ background: '#1B4332' }}>
            Book another
          </button>
        </div>
      </div>
    );
  }

  if (myDogs.length === 0) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-5 text-5xl">🐕</div>
        <h2 className="text-xl font-bold text-ink mb-2">Add your dog first</h2>
        <p className="text-ink-secondary text-sm text-center mb-7 max-w-xs">
          You need to register your dog before booking a walk. It only takes a minute!
        </p>
        <button onClick={() => navigate('/owner/dogs')}
          className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white shadow-sm mb-3"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          + Add My Dog
        </button>
        <button onClick={() => navigate('/owner')}
          className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-ink-secondary hover:bg-surface-hover transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        <div>
          <h1 className="text-2xl font-extrabold text-ink">Book a walk</h1>
          <p className="text-ink-secondary text-sm mt-1">Find a trusted walker near you</p>
        </div>

        {/* Pickup location */}
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-surface-border bg-white shadow-sm">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#1B4332' }}>
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">Pickup location</p>
            <p className="text-sm font-semibold text-ink">{currentUser?.name || 'My Address'}</p>
          </div>
        </div>

        {/* Dog selector */}
        {myDogs.length > 1 && (
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Which dog?</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {myDogs.map(dog => (
                <button key={dog.id} onClick={() => setDogId(dog.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all shrink-0 ${
                    dogId === dog.id ? 'text-white border-transparent' : 'text-ink border-surface-border hover:border-primary/30'
                  }`}
                  style={dogId === dog.id ? { background: '#1B4332', borderColor: '#1B4332' } : {}}>
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-secondary shrink-0">
                    {dog.imageUrl
                      ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                      : <span className="text-xs flex items-center justify-center h-full">🐕</span>}
                  </div>
                  {dog.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Instant / Scheduled */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-secondary border border-surface-border">
          <button onClick={() => setIsInstant(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isInstant ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}>
            <Zap className={`w-4 h-4 ${isInstant ? 'text-amber-500' : ''}`} /> Instant
          </button>
          <button onClick={() => setIsInstant(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              !isInstant ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}>
            <Calendar className="w-4 h-4" /> Scheduled
          </button>
        </div>

        {/* Date/time */}
        {!isInstant && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={schedDate} min={todayStr()} onChange={e => setSchedDate(e.target.value)}
                className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Time</label>
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary" />
            </div>
          </div>
        )}

        {/* Duration */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Duration</p>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                  duration === d ? 'text-white shadow-sm' : 'text-ink bg-surface-secondary hover:bg-surface-hover border border-surface-border'
                }`}
                style={duration === d ? { background: '#1B4332' } : {}}>
                {d}m
              </button>
            ))}
          </div>
        </div>

        {/* ── Grooming Add-on ── */}
        <button type="button" onClick={() => setAddGrooming(g => !g)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
            addGrooming
              ? 'border-primary bg-primary-50/50'
              : 'border-surface-border bg-white hover:border-primary/30'
          }`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            addGrooming ? 'text-white' : 'bg-surface-secondary text-primary'
          }`} style={addGrooming ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
            <Scissors className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink text-sm">Add Grooming  <span className="text-xs font-normal text-ink-muted ml-1">optional</span></p>
            <p className="text-xs text-ink-muted mt-0.5">Bath, trim, nail clip & ear clean — done after the walk</p>
          </div>
          <div className="flex flex-col items-end shrink-0 gap-1">
            <span className="text-sm font-bold" style={{ color: '#2B8A50' }}>+K249</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              addGrooming ? 'bg-primary border-primary' : 'border-surface-border'
            }`}>
              {addGrooming && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
        </button>

        {/* Price summary */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-ink-muted">Total estimate</span>
          <span className="text-lg font-extrabold text-ink">
            K{addGrooming ? 150 + 249 : 150}
            {addGrooming && <span className="text-xs font-normal text-ink-muted ml-1">(walk + groom)</span>}
          </span>
        </div>

        {/* Find walker button */}
        <button onClick={handleFindWalker} disabled={!dogId}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl text-base font-extrabold text-white disabled:opacity-40 transition-all shadow-lg active:scale-[0.98]"
          style={{ background: '#1B4332' }}>
          🐕 Find a walker nearby
        </button>

        {/* Walkers list — shown after clicking Find */}
        {showWalkers && (
          <div ref={walkersRef} className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-ink">
                {walkers.length > 0 ? 'Available walkers' : 'No walkers available yet'}
              </h2>
            </div>

            {walkers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-surface-border rounded-2xl">
                <p className="text-3xl mb-2">🦮</p>
                <p className="text-sm font-semibold text-ink">No walkers registered yet</p>
                <p className="text-xs text-ink-muted mt-1">Book anyway and we'll assign one shortly</p>
              </div>
            ) : (
              <div className="space-y-3">
                {walkers.map((walker, i) => (
                  <div key={walker.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      selectedWalkerId === walker.id
                        ? 'border-primary bg-primary-50/40'
                        : 'border-surface-border bg-white hover:border-primary/30'
                    }`}>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-secondary shrink-0 border-2 border-surface-border">
                      {walker.imageUrl
                        ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white" style={{ background: '#1B4332' }}>
                            {walker.name[0]}
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm">{walker.name}</p>
                      <div className="flex items-center gap-1 text-xs text-ink-secondary">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{walkerRatings[i] || '4.8'} · 0.{i + 4} mi</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5 truncate">{walkerBios[i] || 'Experienced dog walker.'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold text-ink">K{walkerPrices[i] || 150}</span>
                      <button
                        onClick={() => { setSelectedWalkerId(walker.id); handleSubmit(walker.id); }}
                        disabled={!dogId}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40"
                        style={{ background: '#1B4332' }}>
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => handleSubmit()} disabled={!dogId}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-semibold text-ink-secondary border border-surface-border hover:bg-surface-hover disabled:opacity-40 transition-colors">
              Book with any available walker
            </button>
          </div>
        )}

      </div>

      {showPayment && (
        <PaymentModal
          amount={addGrooming ? 399 : 150}
          description={`Dog walk${addGrooming ? ' + grooming' : ''} for ${selectedDog?.name || 'your dog'}`}
          customerName={currentUser?.name || ''}
          customerPhone={currentUser?.phone}
          onConfirm={confirmBooking}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
