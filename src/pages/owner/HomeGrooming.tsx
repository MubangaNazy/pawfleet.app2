import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, MapPin, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWalkersLive } from '../../lib/liveTracking';
import { geocodeAddress, reverseGeocode } from '../../lib/geocode';
import { LatLng, formatKm, haversineKm, isValidCoord } from '../../lib/geo';
import { GROOM_PACKAGES as PACKAGES, GROOM_PLANS, planPrice, type PlanId } from '../../lib/groomingPackages';

const todayStr = () => new Date().toISOString().slice(0, 10);

const SEDATION_FEE = 180;

export default function HomeGrooming() {
  const { currentUser, data, createWalkAsync } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const live = useWalkersLive(currentUser?.id);

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  const [dogId, setDogId]       = useState(myDogs[0]?.id ?? '');
  const [pkg, setPkg]           = useState(() => PACKAGES.some(p => p.id === params.get('package')) ? params.get('package')! : 'full_groom');
  const [plan, setPlan]         = useState<PlanId | ''>(() => GROOM_PLANS.some(p => p.id === params.get('plan')) ? (params.get('plan') as PlanId) : '');
  const [date, setDate]         = useState(todayStr());
  const [time, setTime]         = useState('10:00');
  const [address, setAddress]   = useState('');
  const [coords, setCoords]     = useState<LatLng | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'looking' | 'found' | 'missing'>('idle');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState('');
  const [groomerId, setGroomerId]   = useState(params.get('groomer') ?? '');
  const [notes, setNotes]       = useState('');
  const [temperament, setTemperament] = useState<'calm' | 'nervous' | 'aggressive' | ''>('');
  const [needsSedation, setNeedsSedation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const selectedPkg = PACKAGES.find(p => p.id === pkg)!;
  const isVetGrooming = selectedPkg?.isVet;
  const beforePlan = selectedPkg ? selectedPkg.price + (needsSedation && isVetGrooming ? SEDATION_FEE : 0) : 0;
  const activePlan = isVetGrooming ? '' : plan;
  const totalPrice = planPrice(beforePlan, activePlan);
  const planMeta = GROOM_PLANS.find(p => p.id === activePlan);
  const canSubmit = !!dogId && !!pkg && !!date && !!time && address.trim().length > 3 && temperament !== '' && !submitting;

  // Type-an-address → coordinates, so the groomer gets a real point on the map.
  useEffect(() => {
    if (gpsLoading) return;
    const q = address.trim();
    if (q.length < 6) { setGeoStatus('idle'); return; }
    // An address filled in from GPS already has coordinates.
    if (coords && geoStatus === 'found') return;
    setGeoStatus('looking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const hit = await geocodeAddress(q);
      if (cancelled) return;
      setCoords(hit);
      setGeoStatus(hit ? 'found' : 'missing');
    }, 900);
    return () => { cancelled = true; clearTimeout(t); };
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setGpsError('This device does not support GPS.'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async p => {
        const pt: LatLng = [p.coords.latitude, p.coords.longitude];
        setCoords(pt);
        setGeoStatus('found');
        setAddress(await reverseGeocode(pt[0], pt[1]));
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); setGpsError('Could not get your location. Allow location access or type your address.'); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  // Groomers = approved walkers who offer grooming. Live ones first, then nearest to the owner.
  const groomers = useMemo(() => {
    return data.users
      .filter(u => u.role === 'walker' && (!u.walkerStatus || u.walkerStatus === 'active') && u.pricing?.grooming != null)
      .map(u => {
        const l = live[u.id];
        const pos: LatLng | null = l ? [l.lat, l.lng]
          : isValidCoord(u.onlineLat, u.onlineLng) ? [u.onlineLat!, u.onlineLng!]
          : isValidCoord(u.serviceLat, u.serviceLng) ? [u.serviceLat!, u.serviceLng!] : null;
        return { user: u, live: !!l, distKm: coords && pos ? haversineKm(coords, pos) : null };
      })
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        if (a.distKm == null && b.distKm == null) return 0;
        if (a.distKm == null) return 1;
        if (b.distKm == null) return -1;
        return a.distKm - b.distKm;
      });
  }, [data.users, live, coords]);

  const chosenGroomer = groomers.find(g => g.user.id === groomerId)?.user;

  const handleBook = async () => {
    if (!canSubmit || !currentUser) return;
    const dog = data.dogs.find(d => d.id === dogId);
    const scheduledDate = new Date(`${date}T${time}:00`).toISOString();
    const sedationNote = (needsSedation && isVetGrooming) ? '\nSedation: Required (animal is vicious)' : '';
    setSubmitting(true);
    setBookingError('');
    const res = await createWalkAsync({
      dogId,
      ownerId: currentUser.id,
      walkerId: groomerId || undefined,
      status: 'pending',
      scheduledDate,
      duration: 60,
      price: totalPrice,
      walkerEarning: Math.round(totalPrice * 0.75),
      startLocation: { lat: coords?.[0], lng: coords?.[1], address: address.trim() },
      notes: `${isVetGrooming ? 'VET_GROOMING' : 'GROOMING'}: ${selectedPkg.label} — ${dog?.name ?? 'Dog'}\nAddress: ${address.trim()}\nTemperament: ${temperament}${planMeta ? `\nPlan: ${planMeta.label} (${planMeta.discountPct}% off every visit)` : ''}${sedationNote}${notes ? `\nNotes: ${notes}` : ''}`,
    });
    setSubmitting(false);
    if (res.error) { setBookingError(res.error); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'linear-gradient(160deg,#1B4332,#2B8A50)' }}>
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Request sent!</h2>
        <p className="text-white/70 text-sm mb-2">
          Your <strong className="text-white">{selectedPkg.label}</strong> request
          {chosenGroomer ? <> was sent to <strong className="text-white">{chosenGroomer.name}</strong></> : ' was sent to groomers near you'}.
        </p>
        <p className="text-white/60 text-xs mb-8">You will get a notification the moment a groomer accepts.</p>
        {chosenGroomer && (
          <button type="button" onClick={() => navigate(`/owner/dm/${chosenGroomer.id}`)}
            className="mb-3 px-8 py-3 rounded-2xl bg-white/15 text-white font-bold text-sm active:scale-95 transition-transform">
            Message {chosenGroomer.name.split(' ')[0]}
          </button>
        )}
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

          {/* Home grooming packages */}
          <div className="space-y-2 mb-4">
            {PACKAGES.filter(p => !p.isVet).map(p => (
              <button key={p.id} type="button" onClick={() => { setPkg(p.id); setNeedsSedation(false); }}
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

          {/* Vet clinic grooming divider + option */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Or at a vet clinic</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>
          {PACKAGES.filter(p => p.isVet).map(p => (
            <div key={p.id}>
              <button type="button" onClick={() => setPkg(p.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  pkg === p.id ? 'border-purple-500 bg-purple-50' : 'border-surface-border bg-white hover:bg-surface-hover'
                }`}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: pkg === p.id ? '#F5F3FF' : '#F9FAFB' }}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${pkg === p.id ? 'text-purple-700' : 'text-ink'}`}>{p.label}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Vet</span>
                  </div>
                  <p className="text-xs text-ink-muted">{p.desc}</p>
                </div>
                <p className="font-extrabold text-sm shrink-0" style={{ color: pkg === p.id ? '#6B21A8' : '#374151' }}>
                  K{p.price}
                </p>
              </button>

              {/* Sedation toggle — only when vet grooming selected */}
              {pkg === p.id && (
                <div className="mt-3 rounded-2xl border-2 overflow-hidden"
                  style={{ borderColor: needsSedation ? '#DC2626' : '#DDE9E2' }}>
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-2xl mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-ink">Is your animal vicious or aggressive?</p>
                      <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                        If yes, the vet clinic will administer a safe sedative before grooming so your pet is calm and safe throughout.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-t border-[#DDE9E2]">
                    <button type="button" onClick={() => setNeedsSedation(false)}
                      className="py-2.5 text-sm font-bold transition-all"
                      style={{
                        background: !needsSedation ? '#EBF5EF' : 'white',
                        color: !needsSedation ? '#1B4332' : '#6B7280',
                      }}>
                      😊 No, calm/nervous
                    </button>
                    <button type="button" onClick={() => setNeedsSedation(true)}
                      className="py-2.5 text-sm font-bold transition-all border-l border-[#DDE9E2]"
                      style={{
                        background: needsSedation ? '#FEF2F2' : 'white',
                        color: needsSedation ? '#DC2626' : '#6B7280',
                      }}>
                      ⚠️ Yes — needs sedation
                    </button>
                  </div>
                  {needsSedation && (
                    <div className="px-4 py-2.5 bg-red-50 border-t border-red-100">
                      <p className="text-xs text-red-700 font-medium">
                        Sedation fee: <strong>+K{SEDATION_FEE}</strong> — administered by a licensed vet before grooming begins.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plan */}
        {!isVetGrooming && (
          <div>
            <p className="text-sm font-bold text-ink mb-1">How often?</p>
            <p className="text-xs text-ink-muted mb-3">Regular grooming costs less per visit. You book the first visit now.</p>
            <div className="grid grid-cols-3 gap-2">
              {([['', 'Just once', ''], ...GROOM_PLANS.map(p => [p.id, p.id === 'monthly' ? 'Monthly' : 'Twice a month', `Save ${p.discountPct}%`])] as [string, string, string][]).map(([id, label, sub]) => (
                <button key={id || 'once'} type="button" onClick={() => setPlan(id as PlanId | '')}
                  className={`flex flex-col items-center gap-0.5 py-3 rounded-2xl border-2 text-center transition-all ${plan === id ? 'border-primary bg-primary/5' : 'border-surface-border bg-white'}`}>
                  <span className={`text-xs font-bold ${plan === id ? 'text-primary' : 'text-ink'}`}>{label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: sub ? '#B45309' : '#9CA3AF' }}>{sub || 'Full price'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Where */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-ink">Where should the groomer go?</label>
            <button type="button" onClick={useMyLocation} disabled={gpsLoading}
              className="flex items-center gap-1 text-xs font-bold disabled:opacity-50" style={{ color: '#2B8A50' }}>
              {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              Use my location
            </button>
          </div>
          <input type="text" value={address} placeholder="e.g. Plot 15, Kabulonga, Lusaka"
            onChange={e => { setAddress(e.target.value); setCoords(null); setGeoStatus('idle'); }}
            className="w-full px-4 py-3 rounded-2xl border border-surface-border text-sm text-ink focus:outline-none focus:border-primary" />
          <p className="text-xs mt-1.5" style={{ color: geoStatus === 'missing' || gpsError ? '#B45309' : '#6B7280' }}>
            {gpsError
              || (geoStatus === 'looking' ? 'Finding this on the map…'
              : geoStatus === 'found' ? '✓ Located on the map — nearby groomers are shown below'
              : geoStatus === 'missing' ? 'Could not find this on the map. Add an area name or landmark, or use your location.'
              : 'The groomer will come to this address.')}
          </p>
        </div>

        {/* Groomers nearby */}
        <div>
          <p className="text-sm font-bold text-ink mb-1">Groomers near you</p>
          <p className="text-xs text-ink-muted mb-3">Pick one, or leave it and the first available groomer will accept.</p>
          {groomers.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-surface-border p-4 text-center">
              <p className="text-sm font-semibold text-ink">No groomers listed yet</p>
              <p className="text-xs text-ink-muted mt-1">Book anyway and groomers will be notified as soon as they join.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groomers.slice(0, 8).map(({ user: g, live: isLive, distKm }) => (
                <div key={g.id}
                  onClick={() => setGroomerId(id => id === g.id ? '' : g.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${groomerId === g.id ? 'border-primary bg-primary/5' : 'border-surface-border bg-white'}`}>
                  <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                    {g.imageUrl ? <img src={g.imageUrl} alt="" className="w-full h-full object-cover" /> : g.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{g.name}</p>
                    <p className="text-[11px] font-medium" style={{ color: isLive ? '#16A34A' : '#9CA3AF' }}>
                      {isLive ? '● Live now' : '○ Offline'}{distKm != null ? ` · ${formatKm(distKm)} away` : ''}
                    </p>
                  </div>
                  <button type="button" aria-label={`Message ${g.name}`}
                    onClick={e => { e.stopPropagation(); navigate(`/owner/dm/${g.id}`); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EBF5EF] shrink-0">
                    <MessageCircle className="w-4 h-4" style={{ color: '#2B8A50' }} />
                  </button>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${groomerId === g.id ? 'bg-primary border-primary' : 'border-surface-border'}`}>
                    {groomerId === g.id && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => navigate('/owner/walker-map?service=grooming')}
                className="w-full py-2 text-xs font-bold" style={{ color: '#2B8A50' }}>
                See groomers on the live map →
              </button>
            </div>
          )}
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-ink">{isVetGrooming ? 'Vet Clinic Grooming' : 'Home Grooming'}</p>
            <p className="text-sm font-semibold text-ink-muted">K{selectedPkg.price}</p>
          </div>
          {needsSedation && isVetGrooming && (
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-ink-muted">Sedation fee</p>
              <p className="text-sm font-semibold text-red-600">+K{SEDATION_FEE}</p>
            </div>
          )}
          {planMeta && (
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-ink-muted">{planMeta.label} discount ({planMeta.discountPct}%)</p>
              <p className="text-sm font-semibold" style={{ color: '#2B8A50' }}>−K{beforePlan - totalPrice}</p>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-surface-border mt-1">
            <p className="text-sm font-bold text-ink">Total</p>
            <p className="text-xl font-extrabold" style={{ color: '#1B4332' }}>K{totalPrice}</p>
          </div>
          <p className="text-xs text-ink-muted mt-2">Pay the groomer directly on the day. Cash or mobile money accepted.</p>
        </div>

        {bookingError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-bold text-red-700">Request not sent</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{bookingError}</p>
          </div>
        )}

        {/* Book button */}
        <button type="button" onClick={handleBook} disabled={!canSubmit}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base disabled:opacity-40 active:scale-95 transition-all shadow-lg"
          style={{ background: isVetGrooming ? 'linear-gradient(135deg,#4C1D95,#7C3AED)' : 'linear-gradient(135deg,#1B4332,#2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          {submitting ? 'Sending…' : `Book ${isVetGrooming ? 'Vet Clinic Grooming' : 'Home Grooming'} · K${totalPrice}`}
        </button>
      </div>
    </div>
  );
}
