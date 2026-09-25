import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Star, MapPin, Zap, Calendar, Scissors, Loader2, CreditCard, ChevronDown } from 'lucide-react';

const LUSAKA_AREAS = [
  'Libala', 'Chelstone', 'Kabulonga', 'Woodlands', 'Ibex Hill',
  'Rhodespark', 'Northmead', 'Handsworth Park', 'Roma', 'Olympia',
  'Avondale', 'Matero', 'Chilenje', 'Chaisa', 'Kabwata',
  'Emmasdale', 'Mtendere', 'Foxdale', 'Garden', 'Longacres',
];
import { ScalePop, FadeIn, StaggerList, StaggerItem } from '../../components/ui/Anim';
import { SuccessDogIllustration, NoPetsIllustration } from '../../components/ui/Illustrations';
import { useApp } from '../../context/AppContext';
import PaymentModal from '../../components/ui/PaymentModal';
import LiveRouteMap from '../../components/map/LiveRouteMap';
import PinDropPicker from '../../components/map/PinDropPicker';
import { useWalkersLive } from '../../lib/liveTracking';
import { isValidCoord } from '../../lib/geo';
import { geocodeAddress, reverseGeocode } from '../../lib/geocode';
import { LOOP_DIRECTIONS, loopBearing, planLoopRoute, type PlannedRoute } from '../../lib/routing';
import type { WalkerPricing } from '../../types';

const todayStr = () => new Date().toISOString().slice(0, 10);
const DURATIONS = [20, 30, 40, 60];

export default function OwnerRequestWalk() {
  const { data, currentUser, createWalkAsync } = useApp();
  const live = useWalkersLive(currentUser?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const walkersRef = useRef<HTMLDivElement>(null);

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  const urlDuration = parseInt(searchParams.get('duration') ?? '', 10);
  const initialDuration = DURATIONS.includes(urlDuration) ? urlDuration : 30;

  const [dogId, setDogId] = useState('');
  const [schedDate, setSchedDate] = useState(todayStr());
  const [schedTime, setSchedTime] = useState('09:00');
  const [duration, setDuration] = useState(initialDuration);
  const [isInstant, setIsInstant] = useState(true);
  const [addGrooming, setAddGrooming] = useState(false);
  const urlWalkerId = searchParams.get('walker') ?? '';
  const [selectedWalkerId, setSelectedWalkerId] = useState(urlWalkerId);
  const [submitted, setSubmitted] = useState(false);
  const [showWalkers, setShowWalkers] = useState(!!urlWalkerId);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [createdWalkId, setCreatedWalkId] = useState<string | null>(null);
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [routeOption, setRouteOption] = useState(0);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'looking' | 'found' | 'missing'>('idle');
  const [selectedArea, setSelectedArea] = useState('');
  const [createdWalkPrice, setCreatedWalkPrice] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Pickup location state
  const [pickupMode, setPickupMode] = useState<'live' | 'manual' | 'pin' | null>(null);
  const [showPinPicker, setShowPinPicker] = useState(false);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const selectedDog = myDogs.find(d => d.id === dogId);
  const pickupReady = pickupMode === 'live'
    ? pickupLat !== null && pickupAddress !== ''
    : pickupMode === 'manual'
    ? pickupAddress.trim().length > 3
    : false;

  const haversineKm = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const walkers = (() => {
    const active = data.users.filter(u => {
      if (u.role !== 'walker') return false;
      if (u.walkerStatus && u.walkerStatus !== 'active') return false;
      if (selectedArea) {
        const areas: string[] = (u.pricing as any)?.serviceAreas ?? [];
        if (areas.length > 0 && !areas.includes(selectedArea)) return false;
      }
      return true;
    });
    return active
      .map(w => {
        const l = live[w.id];
        const p: [number, number] | null = l ? [l.lat, l.lng]
          : isValidCoord(w.onlineLat, w.onlineLng) ? [w.onlineLat!, w.onlineLng!]
          : isValidCoord(w.serviceLat, w.serviceLng) ? [w.serviceLat!, w.serviceLng!]
          : null;
        return {
          ...w,
          isOnline: !!l, // "online" means broadcasting right now; the saved DB flag can be stale
          _distKm: (pickupLat != null && pickupLng != null && p) ? haversineKm(pickupLat, pickupLng, p[0], p[1]) : null,
        };
      })
      .sort((a, b) => {
        // The walker chosen on the map, then live walkers, then nearest
        if (a.id === urlWalkerId && b.id !== urlWalkerId) return -1;
        if (b.id === urlWalkerId && a.id !== urlWalkerId) return 1;
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        // Then by distance
        if (a._distKm == null && b._distKm == null) return 0;
        if (a._distKm == null) return 1;
        if (b._distKm == null) return -1;
        return a._distKm - b._distKm;
      });
  })() as (typeof data.users[0] & { _distKm?: number | null })[];

  // Pricing helpers — computed from walkers' stored pricing for the selected duration
  const dKey = `walk_${duration}` as keyof WalkerPricing;
  const walkerDurationPrices = walkers
    .map(w => w.pricing?.[dKey])
    .filter((p): p is number => typeof p === 'number');
  const minWalkPrice = walkerDurationPrices.length > 0 ? Math.min(...walkerDurationPrices) : null;
  const walkerGroomPrices = walkers
    .map(w => w.pricing?.grooming)
    .filter((p): p is number => typeof p === 'number');
  const minGroomPrice = walkerGroomPrices.length > 0 ? Math.min(...walkerGroomPrices) : null;

  // Auto-select dog when data loads
  useEffect(() => {
    if (myDogs.length === 1 && !dogId) setDogId(myDogs[0].id);
  }, [myDogs.length]);

  // Type-an-address: find its coordinates so the walker can navigate and the owner can preview the route.
  useEffect(() => {
    if (pickupMode !== 'manual') return;
    const q = pickupAddress.trim();
    if (q.length < 6) { setPickupLat(null); setPickupLng(null); setGeoStatus('idle'); return; }
    setGeoStatus('looking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const hit = await geocodeAddress(q);
      if (cancelled) return;
      if (hit) { setPickupLat(hit[0]); setPickupLng(hit[1]); setGeoStatus('found'); }
      else { setPickupLat(null); setPickupLng(null); setGeoStatus('missing'); }
    }, 900);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickupAddress, pickupMode]);

  // Suggested loop route for the chosen duration, starting and ending at the pickup point.
  useEffect(() => {
    setRoute(null);
    if (pickupLat == null || pickupLng == null) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const seed = `${pickupLat.toFixed(3)},${pickupLng.toFixed(3)}`;
      planLoopRoute([pickupLat, pickupLng], duration, seed, { bearing: loopBearing(seed, routeOption), signal: ctrl.signal })
        .then(r => { if (!ctrl.signal.aborted) setRoute(r); })
        .catch(() => {});
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [pickupLat, pickupLng, duration, routeOption]);

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

  const resetPickup = () => {
    setPickupMode(null);
    setPickupLat(null);
    setPickupLng(null);
    setPickupAddress('');
    setGpsError('');
  };

  const handlePinConfirmed = (result: { lat: number; lng: number; address: string }) => {
    setPickupMode('pin');
    setPickupLat(result.lat);
    setPickupLng(result.lng);
    setPickupAddress(result.address);
    setShowPinPicker(false);
  };

  const handleFindWalker = () => {
    if (!dogId || !pickupReady) return;
    setShowWalkers(true);
    setTimeout(() => walkersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = (walkerId?: string) => {
    if (!dogId || !pickupReady || submitting) return;
    confirmBooking(walkerId);
  };

  const confirmBooking = async (walkerId?: string) => {
    const selectedWalker = walkerId ? data.users.find(u => u.id === walkerId) : null;
    const walkPrice  = (selectedWalker?.pricing?.[dKey] as number | undefined) ?? minWalkPrice ?? 150;
    const groomPrice = selectedWalker?.pricing?.grooming ?? minGroomPrice ?? 249;
    const finalPrice = addGrooming ? walkPrice + groomPrice : walkPrice;

    const scheduledDate = isInstant
      ? new Date().toISOString()
      : new Date(`${schedDate}T${schedTime}:00`).toISOString();

    const pickupTag = pickupMode === 'live' ? 'PICKUP:live|' : pickupMode === 'pin' ? 'PICKUP:pin|' : 'PICKUP:manual|';
    // The route the owner chose: the walker's app rebuilds the same loop from this direction.
    const routeTag = pickupLat != null && pickupLng != null
      ? `ROUTE:${loopBearing(`${pickupLat.toFixed(3)},${pickupLng.toFixed(3)}`, routeOption)}|`
      : '';
    const notes = addGrooming
      ? `${pickupTag}DURATION:${duration}|${routeTag}Add-on: Grooming requested | Payment: after_service`
      : `${pickupTag}DURATION:${duration}|${routeTag}Payment: after_service`;

    setSubmitting(true);
    setBookingError('');
    const result = await createWalkAsync({
      dogId,
      ownerId: currentUser!.id,
      walkerId: walkerId || undefined,
      status: 'pending',
      scheduledDate,
      duration,
      price: finalPrice,
      walkerEarning: Math.round(finalPrice * 0.7),
      notes,
      startLocation: {
        lat: pickupLat ?? undefined,
        lng: pickupLng ?? undefined,
        address: pickupAddress || undefined,
      },
    });
    setSubmitting(false);

    if (result.error || !result.walk) {
      setBookingError(result.error || 'Could not send your booking. Please try again.');
      return;
    }
    setCreatedWalkId(result.walk.id);
    setCreatedWalkPrice(finalPrice);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 pb-24 overflow-hidden">
        <ScalePop className="mb-2">
          <SuccessDogIllustration />
        </ScalePop>
        <FadeIn delay={0.15} className="text-center">
          <h2 className="pf-heading text-center mb-2">Booking sent!</h2>
          <p className="text-ink-secondary text-sm text-center mb-4 max-w-xs leading-relaxed">
            We'll assign{' '}
            <span className="font-semibold text-ink">
              {selectedWalkerId ? data.users.find(u => u.id === selectedWalkerId)?.name?.split(' ')[0] : 'a trusted walker'}
            </span>{' '}
            and confirm your walk for <span className="font-semibold text-ink">{selectedDog?.name}</span> shortly.
          </p>
          {addGrooming && (
            <p className="text-xs font-semibold mb-4 inline-flex items-center gap-1.5 bg-primary-50 text-primary px-4 py-2 rounded-xl">
              ✂️ Grooming add-on included
            </p>
          )}
        </FadeIn>

        {/* Follow the walk */}
        {createdWalkId && (
          <div className="w-full max-w-xs mb-4 px-4 py-3.5 rounded-2xl border-2 border-primary/30 bg-[#EBF5EF]">
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">Follow your walk live</p>
                <p className="text-[10px] text-ink-muted font-normal">
                  {pickupMode === 'live' ? 'Your walker can see where to meet you. ' : ''}See them arrive on the map.
                </p>
              </div>
              <button type="button" onClick={() => navigate(`/owner/track/${createdWalkId}`)}
                className="text-xs font-bold text-primary shrink-0">
                Track
              </button>
            </div>
          </div>
        )}

        {/* Pay now CTA */}
        {!paymentDone ? (
          <div className="w-full max-w-xs mt-4 rounded-2xl overflow-hidden border-2 border-primary/20 bg-[#EBF5EF]">
            <div className="px-5 py-4 text-center">
              <p className="text-xs text-ink-muted mb-1">Walk fee</p>
              <p className="text-3xl font-extrabold mb-3" style={{ color: '#1B4332' }}>K{createdWalkPrice}</p>
              <button
                onClick={() => setShowPayModal(true)}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                <CreditCard className="w-4 h-4" />
                Pay via Mobile Money
              </button>
              <button onClick={() => navigate('/owner')}
                className="mt-2 text-xs text-ink-muted hover:text-ink transition-colors">
                Pay later at home
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xs mt-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-center">
            <p className="text-sm font-bold text-green-700">Payment confirmed ✓</p>
            <p className="text-xs text-green-600 mt-0.5">K{createdWalkPrice} received</p>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-xs mt-3">
          <button onClick={() => navigate('/owner')}
            className="flex-1 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink hover:bg-surface-hover transition-colors">
            Home
          </button>
          <button onClick={() => {
            setSubmitted(false); setShowWalkers(false);
            setSelectedWalkerId(''); setAddGrooming(false);
            resetPickup(); setCreatedWalkId(null); setBookingError('');
            setPaymentDone(false);
          }}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
            style={{ background: '#1B4332' }}>
            Book another
          </button>
        </div>

        {showPayModal && (
          <PaymentModal
            amount={createdWalkPrice}
            description={`Dog walk${addGrooming ? ' + grooming' : ''} for ${selectedDog?.name || 'your dog'}`}
            customerName={currentUser?.name || ''}
            customerPhone={currentUser?.phone}
            onConfirm={(_method, _ref) => {
              setPaymentDone(true);
              setShowPayModal(false);
            }}
            onClose={() => setShowPayModal(false)}
          />
        )}
      </div>
    );
  }

  if (myDogs.length === 0) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 pb-24">
        <ScalePop className="mb-4">
          <NoPetsIllustration />
        </ScalePop>
        <FadeIn delay={0.12} className="text-center">
          <h2 className="pf-heading mb-2">Add pet first</h2>
          <p className="pf-subtitle mb-7 max-w-xs mx-auto leading-relaxed">
            Register your pet before booking a walk — it only takes a minute!
          </p>
          <button onClick={() => navigate('/owner/dogs')}
            className="btn-spring px-8 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg mb-3 block w-full max-w-xs mx-auto"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.28)' }}>
            + Add My Dog
          </button>
          <button onClick={() => navigate('/owner')}
            className="text-sm font-semibold text-ink-muted hover:text-ink transition-colors">
            Go Back
          </button>
        </FadeIn>
      </div>
    );
  }

  const step = !pickupReady ? 1 : !dogId ? 2 : 3;

  return (
    <div className="bg-[#F4F9F6] min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold italic"
            style={{ background: 'linear-gradient(135deg, #1B4332, #52B788)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Book a Walk
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#5A8A70' }}>Find a trusted walker near you</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] p-4 space-y-3">
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
            <div className="grid grid-cols-3 gap-2.5">
              <button type="button" onClick={() => setShowPinPicker(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-primary/40 bg-primary-50/30 hover:bg-primary-50/50 transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <span className="text-xl">📌</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink">Drop a Pin</p>
                  <p className="text-[9px] text-ink-muted mt-0.5">Most accurate</p>
                </div>
              </button>
              <button type="button" onClick={handleUseCurrentLocation}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-surface-border bg-white hover:border-primary/40 hover:bg-primary-50/30 transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <span className="text-xl">📍</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink">Live Location</p>
                  <p className="text-[9px] text-ink-muted mt-0.5">Use my GPS</p>
                </div>
              </button>
              <button type="button" onClick={() => setPickupMode('manual')}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-surface-border bg-white hover:border-primary/40 hover:bg-primary-50/30 transition-all active:scale-95">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                  <span className="text-xl">✏️</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-ink">Type Address</p>
                  <p className="text-[9px] text-ink-muted mt-0.5">Enter manually</p>
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

          {/* Pin mode — location dropped on the map */}
          {pickupMode === 'pin' && pickupLat != null && (
            <div className="p-4 rounded-2xl border-2 border-primary/30 bg-[#EBF5EF] flex items-start gap-3">
              <div className="text-2xl shrink-0 mt-0.5">📌</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary mb-0.5">Pinned on the map</p>
                <p className="text-sm text-ink font-medium leading-relaxed">{pickupAddress}</p>
                <button type="button" onClick={() => setShowPinPicker(true)} className="text-xs font-semibold text-primary mt-1.5 hover:underline">
                  Adjust pin
                </button>
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
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-semibold leading-relaxed">{pickupAddress}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: geoStatus === 'missing' ? '#B45309' : '#5A8A70' }}>
                      {geoStatus === 'looking' && 'Finding this on the map…'}
                      {geoStatus === 'found' && '✓ Located on the map — your walker can navigate here'}
                      {geoStatus === 'missing' && 'Could not find this on the map. Add a landmark or area name, or use Live Location. Your walker will call you.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Area selector ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Your area in Lusaka</p>
            {selectedArea && (
              <button type="button" onClick={() => setSelectedArea('')}
                className="text-xs text-ink-muted hover:text-danger">Clear</button>
            )}
          </div>
          <p className="text-xs text-ink-muted mb-3">Select your area to find walkers who cover it</p>
          <div className="relative">
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-2xl border border-surface-border text-sm text-ink bg-white focus:outline-none focus:border-primary">
              <option value="">All areas — show every walker</option>
              {LUSAKA_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          </div>
          {selectedArea && (
            <p className="text-xs text-primary font-semibold mt-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Showing walkers who cover {selectedArea}
            </p>
          )}
        </div>

        {/* Dog selector */}
        {myDogs.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Which dog?</p>
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

        {/* ── When & how long card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] p-4 space-y-4">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">When & how long?</p>

          {/* Instant / Scheduled toggle */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-[#F4F9F6] border border-[#DDE9E2]">
            <button onClick={() => setIsInstant(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isInstant ? 'bg-white text-ink shadow-md' : 'text-ink-muted hover:text-ink'
              }`}>
              <Zap className={`w-4 h-4 ${isInstant ? 'text-amber-500' : ''}`} /> Instant
            </button>
            <button onClick={() => setIsInstant(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                !isInstant ? 'bg-white text-ink shadow-md' : 'text-ink-muted hover:text-ink'
              }`}>
              <Calendar className={`w-4 h-4 ${!isInstant ? 'text-primary' : ''}`} /> Scheduled
            </button>
          </div>

          {/* Date/time */}
          {!isInstant && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={schedDate} min={todayStr()} onChange={e => setSchedDate(e.target.value)}
                  className="w-full border border-[#DDE9E2] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary bg-[#F4F9F6]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Time</label>
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                  className="w-full border border-[#DDE9E2] rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary bg-[#F4F9F6]" />
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Duration</p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-4 rounded-2xl font-bold transition-all ${
                    duration === d ? 'text-white shadow-md' : 'text-ink bg-[#F4F9F6] hover:bg-[#EBF5EF] border border-[#DDE9E2]'
                  }`}
                  style={duration === d ? { background: 'linear-gradient(135deg, #1B4332, #2B8A50)' } : {}}>
                  <span className="text-base font-extrabold leading-none">{d}</span>
                  <span className={`text-[10px] font-semibold leading-none mt-0.5 ${duration === d ? 'opacity-75' : 'text-ink-muted'}`}>min</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Suggested route for the chosen length */}
        {pickupLat != null && pickupLng != null && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Your {duration}-minute walk route</p>
              {route && <span className="text-[11px] font-bold" style={{ color: '#2B8A50' }}>{route.distanceKm.toFixed(1)} km · ~{route.durationMin} min</span>}
            </div>
            <div className="relative h-44 bg-[#EBF5EF]">
              {route ? (
                <LiveRouteMap
                  markers={[{ id: 'pickup', lat: pickupLat, lng: pickupLng, kind: 'pickup' }]}
                  lines={[{ id: 'plan', points: route.points, dashed: true }]}
                  fitKey={`${duration}|${route.points.length}`}
                  center={[pickupLat, pickupLng]}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-secondary">{LOOP_DIRECTIONS[routeOption]}</p>
                <p className="text-[11px] text-ink-muted leading-snug">
                  Your walker follows this loop from your door and back, with voice directions. You can watch it live.
                </p>
              </div>
              <button type="button" onClick={() => setRouteOption(o => (o + 1) % LOOP_DIRECTIONS.length)}
                className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl" style={{ color: '#2B8A50', background: '#EBF5EF' }}>
                Try another
              </button>
            </div>
          </div>
        )}

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
            <span className="text-sm font-bold" style={{ color: '#2B8A50' }}>
              {minGroomPrice != null ? `+K${minGroomPrice}` : '+Grooming'}
            </span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              addGrooming ? 'bg-primary border-primary' : 'border-surface-border'
            }`}>
              {addGrooming && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
        </button>

        {/* Price summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#DDE9E2] px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-muted font-medium">Estimated total</p>
            {addGrooming ? (
              <p className="text-[10px] text-ink-muted mt-0.5">
                {minWalkPrice != null ? `Walk from K${minWalkPrice}` : 'Walk'} + {minGroomPrice != null ? `Grooming K${minGroomPrice}` : 'Grooming fee'}
              </p>
            ) : (
              <p className="text-[10px] text-ink-muted mt-0.5">
                {duration} min · {minWalkPrice != null ? 'prices from' : 'prices set by each walker'}
              </p>
            )}
          </div>
          <span className="text-2xl font-extrabold" style={{ color: '#1B4332' }}>
            {minWalkPrice != null
              ? `K${addGrooming ? minWalkPrice + (minGroomPrice ?? 249) : minWalkPrice}`
              : '—'}
          </span>
        </div>

        {bookingError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-bold text-red-700">Booking not sent</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{bookingError}</p>
          </div>
        )}

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
                {walkers.length > 0
                  ? (pickupLat ? 'Walkers near your pickup' : 'Available walkers')
                  : 'No walkers available yet'}
              </h2>
              {walkers.some(w => w.isOnline) && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {walkers.filter(w => w.isOnline).length} online
                </span>
              )}
            </div>

            {walkers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-surface-border rounded-2xl">
                <p className="text-3xl mb-2">🦮</p>
                <p className="text-sm font-semibold text-ink">No approved walkers yet</p>
                <p className="text-xs text-ink-muted mt-1">Book anyway and the first walker to accept will confirm</p>
              </div>
            ) : (
              <StaggerList className="grid grid-cols-2 gap-3">
                {walkers.map((walker, i) => {
                  const BADGE_DEFS = [
                    { id: 'first_walk', icon: '🐾', minWalks: 1 },
                    { id: 'five_walks', icon: '⭐', minWalks: 5 },
                    { id: 'ten_walks', icon: '🏆', minWalks: 10 },
                    { id: 'twenty_five_walks', icon: '🥇', minWalks: 25 },
                  ];
                  const completedWalks = data.walks.filter(w => w.walkerId === walker.id && w.status === 'completed');
                  const completedCount = completedWalks.length;
                  const ratedWalks = completedWalks.filter(w => w.rating != null);
                  const avgRating = ratedWalks.length > 0
                    ? (ratedWalks.reduce((s, w) => s + (w.rating ?? 0), 0) / ratedWalks.length).toFixed(1)
                    : null;
                  const earnedBadges  = BADGE_DEFS.filter(b => completedCount >= b.minWalks);

                  return (
                    <StaggerItem key={walker.id}>
                    <div
                      className={`relative overflow-hidden rounded-2xl flex flex-col btn-spring ${
                        (selectedWalkerId === walker.id || urlWalkerId === walker.id) ? 'ring-2 ring-primary' : ''
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
                          {walker.pricing?.[dKey] != null ? `K${walker.pricing[dKey]}` : 'Ask'}
                        </div>
                        {/* Verified badge — top left */}
                        {walker.walkerStatus === 'active' && (
                          <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(27,67,50,0.85)', backdropFilter: 'blur(4px)' }}>
                            <span className="text-[9px] font-bold text-white">✓ NRC Verified</span>
                          </div>
                        )}
                        {/* Rating — bottom left (real calculated) */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                          {avgRating ? (
                            <>
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span className="text-[10px] font-bold text-white">{avgRating}</span>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold text-white/80">New</span>
                          )}
                        </div>
                        {/* Online badge — bottom right */}
                        {walker.isOnline && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.92)', backdropFilter: 'blur(4px)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[9px] font-bold text-white">Online</span>
                          </div>
                        )}
                      </div>

                      {/* Info area */}
                      <div className="bg-white p-3 flex-1 flex flex-col gap-2">
                        <div>
                          <p className="font-bold text-ink text-sm truncate">{walker.name}</p>
                          <p className="text-[11px] text-ink-muted mt-0.5 leading-snug line-clamp-2">
                            {walker.pricing?.[dKey] != null
                              ? `K${walker.pricing[dKey]} for ${duration} min`
                              : 'Experienced dog walker.'}
                            {completedCount > 0 && <span className="ml-1 text-primary font-semibold">· {completedCount} walk{completedCount !== 1 ? 's' : ''}</span>}
                          </p>
                          {walker._distKm != null && (
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: walker._distKm < 10 ? '#2B8A50' : '#9CA3AF' }}>
                              📍 {walker._distKm < 1 ? `${Math.round(walker._distKm * 1000)}m away` : `${walker._distKm.toFixed(1)} km away`}
                            </p>
                          )}
                        </div>
                        {earnedBadges.length > 0 && (
                          <div className="flex gap-0.5">
                            {earnedBadges.map(b => <span key={b.id} className="text-sm leading-none">{b.icon}</span>)}
                          </div>
                        )}
                        <button
                          onClick={() => { setSelectedWalkerId(walker.id); handleSubmit(walker.id); }}
                          disabled={!dogId || !pickupReady || submitting}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40 active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                          {submitting && selectedWalkerId === walker.id ? 'Booking…' : 'Book Now'}
                        </button>
                        <button type="button" onClick={() => navigate(`/owner/dm/${walker.id}`)}
                          className="w-full py-1.5 text-[11px] font-bold" style={{ color: '#2B8A50' }}>
                          Message {walker.name.split(' ')[0]}
                        </button>
                      </div>
                    </div>
                    </StaggerItem>
                  );
                })}
              </StaggerList>
            )}

            <button onClick={() => { setSelectedWalkerId(''); handleSubmit(); }} disabled={!dogId || !pickupReady || submitting}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-semibold text-ink-secondary border border-surface-border hover:bg-surface-hover disabled:opacity-40 transition-colors">
              Book with any available walker
            </button>
          </div>
        )}

      </div>

      {showPinPicker && (
        <PinDropPicker
          initial={pickupLat != null && pickupLng != null ? [pickupLat, pickupLng] : undefined}
          onConfirm={handlePinConfirmed}
          onClose={() => setShowPinPicker(false)}
        />
      )}

    </div>
  );
}
