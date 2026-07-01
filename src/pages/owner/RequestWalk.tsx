import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, MapPin, Zap, Calendar, Scissors, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);
const DURATIONS = [15, 30, 45, 60];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function OwnerRequestWalk() {
  const { data, currentUser, createWalk } = useApp();
  const navigate = useNavigate();
  const walkersRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const liveWalkIdRef = useRef<string | null>(null);

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

  // Pickup location state
  const [pickupMode, setPickupMode] = useState<'live' | 'manual' | null>(null);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [liveWalkId, setLiveWalkId] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const selectedDog = myDogs.find(d => d.id === dogId);
  const pickupReady = pickupMode === 'live'
    ? pickupLat !== null && pickupAddress !== ''
    : pickupMode === 'manual'
    ? pickupAddress.trim().length > 3
    : false;

  // Auto-select dog when data loads
  useEffect(() => {
    if (myDogs.length === 1 && !dogId) setDogId(myDogs[0].id);
  }, [myDogs.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError('');
    setPickupMode('live');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, enableHighAccuracy: true });
      });
      const { latitude, longitude } = pos.coords;
      setPickupLat(latitude);
      setPickupLng(longitude);
      const addr = await reverseGeocode(latitude, longitude);
      setPickupAddress(addr);
    } catch {
      setPickupMode(null);
      setGpsError('Could not get GPS. Please enable location access or type your address.');
    } finally {
      setGpsLoading(false);
    }
  };

  const startLiveBroadcast = async (walkId: string) => {
    const channel = supabase.channel(`pickup-live-${walkId}`);
    channelRef.current = channel;
    liveWalkIdRef.current = walkId;

    await channel.subscribe();

    const broadcastPosition = (pos: GeolocationPosition) => {
      channel.send({
        type: 'broadcast',
        event: 'owner-position',
        payload: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
    };

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(broadcastPosition, undefined, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      });
      setIsBroadcasting(true);
    }
  };

  const stopBroadcast = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setIsBroadcasting(false);
  };

  const resetPickup = () => {
    setPickupMode(null);
    setPickupLat(null);
    setPickupLng(null);
    setPickupAddress('');
    setGpsError('');
  };

  const handleFindWalker = () => {
    if (!dogId || !pickupReady) return;
    setShowWalkers(true);
    setTimeout(() => walkersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = (walkerId?: string) => {
    if (!dogId || !pickupReady) return;
    confirmBooking(walkerId);
  };

  const confirmBooking = (walkerId?: string) => {
    const scheduledDate = isInstant
      ? new Date().toISOString()
      : new Date(`${schedDate}T${schedTime}:00`).toISOString();

    const pickupTag = pickupMode === 'live' ? 'PICKUP:live|' : 'PICKUP:manual|';
    const notes = addGrooming
      ? `${pickupTag}Add-on: Grooming requested | Payment: after_service`
      : `${pickupTag}Payment: after_service`;

    const newWalk = createWalk({
      dogId,
      ownerId: currentUser!.id,
      walkerId: walkerId || undefined,
      status: 'pending',
      scheduledDate,
      price: addGrooming ? 399 : 150,
      walkerEarning: addGrooming ? 280 : 100,
      notes,
      startLocation: {
        lat: pickupLat ?? undefined,
        lng: pickupLng ?? undefined,
        address: pickupAddress || undefined,
      },
    });

    if (pickupMode === 'live' && newWalk?.id) {
      setLiveWalkId(newWalk.id);
      startLiveBroadcast(newWalk.id);
    }

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
        <p className="text-ink-secondary text-sm text-center mb-4 max-w-xs">
          We'll assign {selectedWalkerId ? data.users.find(u => u.id === selectedWalkerId)?.name?.split(' ')[0] : 'a trusted walker'} and confirm your walk for <strong>{selectedDog?.name}</strong> shortly.
        </p>
        {addGrooming && (
          <p className="text-xs text-primary font-semibold mb-4 bg-primary-50 px-4 py-2 rounded-xl">
            ✂️ Grooming add-on included
          </p>
        )}

        {/* Live location broadcasting banner */}
        {liveWalkId && (
          <div className="w-full max-w-xs mb-5 px-4 py-3.5 rounded-2xl border-2 border-primary/30 bg-[#EBF5EF]">
            <div className="flex items-center gap-3">
              <span className={`text-xl ${isBroadcasting ? 'animate-pulse' : ''}`}>📍</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">
                  {isBroadcasting ? 'Sharing live location…' : 'Location shared'}
                </p>
                <p className="text-[10px] text-ink-muted font-normal">Walker can track where to find you</p>
              </div>
              {isBroadcasting && (
                <button
                  type="button"
                  onClick={stopBroadcast}
                  className="text-[10px] text-danger font-semibold shrink-0"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-xs mt-2">
          <button onClick={() => navigate('/owner')}
            className="flex-1 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink hover:bg-surface-hover transition-colors">
            Home
          </button>
          <button onClick={() => {
            setSubmitted(false); setShowWalkers(false);
            setSelectedWalkerId(''); setAddGrooming(false);
            resetPickup(); stopBroadcast(); setLiveWalkId(null);
          }}
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

  const step = !pickupReady ? 1 : !dogId ? 2 : 3;

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Book a Walk</h1>
          <p className="text-ink-secondary text-sm mt-1">Find a trusted walker near you</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Location' },
            { n: 2, label: 'Dog' },
            { n: 3, label: 'Schedule' },
          ].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > n ? 'text-white' : step === n ? 'text-white' : 'text-ink-muted bg-surface-secondary border border-surface-border'
                }`} style={step >= n ? { background: step > n ? '#52B788' : '#1B4332' } : {}}>
                  {step > n ? '✓' : n}
                </div>
                <span className={`text-xs font-semibold ${step >= n ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px rounded-full transition-all" style={{ background: step > n ? '#52B788' : '#E5E7EB' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Pickup location ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Where to pick up your dog</p>
            {pickupMode && !gpsLoading && (
              <button type="button" onClick={resetPickup}
                className="text-xs text-primary font-semibold hover:underline">
                Change
              </button>
            )}
          </div>

          {gpsError && (
            <p className="text-xs text-danger font-medium px-1">{gpsError}</p>
          )}

          {/* Mode selector */}
          {!pickupMode && !gpsLoading && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleUseCurrentLocation}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-surface-border bg-white hover:border-primary/40 hover:bg-primary-50/30 transition-all active:scale-95">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <span className="text-2xl">📍</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink">Live Location</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">Use my GPS</p>
                </div>
              </button>
              <button type="button" onClick={() => setPickupMode('manual')}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-surface-border bg-white hover:border-primary/40 hover:bg-primary-50/30 transition-all active:scale-95">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <span className="text-2xl">✏️</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink">Type Address</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">Enter manually</p>
                </div>
              </button>
            </div>
          )}

          {/* GPS loading spinner */}
          {gpsLoading && (
            <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-primary/30 rounded-2xl bg-primary-50/20">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-sm font-semibold text-primary">Getting your location…</p>
              <p className="text-xs text-ink-muted">Please allow GPS access if prompted</p>
            </div>
          )}

          {/* Live mode — location captured */}
          {pickupMode === 'live' && !gpsLoading && pickupLat && (
            <div className="p-4 rounded-2xl border-2 border-primary/30 bg-[#EBF5EF] flex items-start gap-3">
              <div className="text-2xl shrink-0 mt-0.5">📍</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-bold text-primary">Live location captured</p>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-sm text-ink font-medium leading-relaxed">{pickupAddress}</p>
                <p className="text-[10px] text-ink-muted mt-1">Walker will track your real-time position</p>
              </div>
            </div>
          )}

          {/* Manual address input */}
          {pickupMode === 'manual' && (
            <div className="space-y-2">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  placeholder="e.g. 14 Addis Ababa Drive, Roma, Lusaka"
                  autoFocus
                  className="w-full border-2 border-surface-border rounded-xl pl-10 pr-4 py-3.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {pickupAddress.trim().length > 3 && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary/20">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary font-semibold leading-relaxed">{pickupAddress}</p>
                </div>
              )}
            </div>
          )}
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

        {/* Grooming Add-on */}
        <button type="button" onClick={() => setAddGrooming(g => !g)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
            addGrooming ? 'border-primary bg-primary-50/50' : 'border-surface-border bg-white hover:border-primary/30'
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
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-surface-border bg-surface-secondary">
          <div>
            <p className="text-xs text-ink-muted font-medium">Estimated total</p>
            {addGrooming && <p className="text-[10px] text-ink-muted mt-0.5">Walk K150 + Grooming K249</p>}
          </div>
          <span className="text-2xl font-extrabold" style={{ color: '#1B4332' }}>
            K{addGrooming ? 150 + 249 : 150}
          </span>
        </div>

        {/* Find walker button */}
        <div>
          <button onClick={handleFindWalker} disabled={!dogId || !pickupReady}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl text-base font-extrabold text-white disabled:opacity-40 transition-all shadow-lg active:scale-[0.98]"
            style={{ background: '#1B4332' }}>
            🐕 Find a walker nearby
          </button>
          {!pickupReady && dogId && (
            <p className="text-center text-xs text-ink-muted mt-2">
              ↑ Set a pickup location first
            </p>
          )}
        </div>

        {/* Walkers list */}
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
              <div className="grid grid-cols-2 gap-3">
                {walkers.map((walker, i) => {
                  const BADGE_DEFS = [
                    { id: 'first_walk', icon: '🐾', minWalks: 1 },
                    { id: 'five_walks', icon: '⭐', minWalks: 5 },
                    { id: 'ten_walks', icon: '🏆', minWalks: 10 },
                    { id: 'twenty_five_walks', icon: '🥇', minWalks: 25 },
                  ];
                  const completedCount = data.walks.filter(w => w.walkerId === walker.id && w.status === 'completed').length;
                  const earnedBadges  = BADGE_DEFS.filter(b => completedCount >= b.minWalks);

                  return (
                    <div key={walker.id}
                      className={`relative overflow-hidden rounded-2xl flex flex-col transition-all active:scale-95 ${
                        selectedWalkerId === walker.id ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.09)' }}>
                      {/* Image area */}
                      <div className="relative h-32 w-full bg-surface-secondary">
                        {walker.imageUrl
                          ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
                          : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                              <span className="text-4xl font-bold text-white">{walker.name[0]}</span>
                            </div>
                          )}
                        {/* Price pill — top right */}
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[11px] font-bold text-white"
                          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          K{walkerPrices[i] || 150}
                        </div>
                        {/* Rating — bottom left */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold text-white">{walkerRatings[i] || '4.8'}</span>
                        </div>
                      </div>

                      {/* Info area */}
                      <div className="bg-white p-3 flex-1 flex flex-col gap-2">
                        <div>
                          <p className="font-bold text-ink text-sm truncate">{walker.name}</p>
                          <p className="text-[11px] text-ink-muted mt-0.5 leading-snug line-clamp-2">{walkerBios[i] || 'Experienced dog walker.'}</p>
                        </div>
                        {earnedBadges.length > 0 && (
                          <div className="flex gap-0.5">
                            {earnedBadges.map(b => <span key={b.id} className="text-sm leading-none">{b.icon}</span>)}
                          </div>
                        )}
                        <button
                          onClick={() => { setSelectedWalkerId(walker.id); handleSubmit(walker.id); }}
                          disabled={!dogId || !pickupReady}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40 active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                          Book Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => handleSubmit()} disabled={!dogId || !pickupReady}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-semibold text-ink-secondary border border-surface-border hover:bg-surface-hover disabled:opacity-40 transition-colors">
              Book with any available walker
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
