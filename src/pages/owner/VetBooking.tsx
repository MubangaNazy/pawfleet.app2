import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, ExternalLink, Loader2, MapPin, MessageCircle, Navigation, Phone, Pin as PinIcon, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import LiveRouteMap, { MapMarker } from '../../components/map/LiveRouteMap';
import PinDropPicker from '../../components/map/PinDropPicker';
import { useMyLocation } from '../../hooks/useMyLocation';
import { scanVetClinics, type OsmPlace } from '../../lib/nearbyPlaces';
import { LatLng, formatKm, haversineKm, isValidCoord } from '../../lib/geo';

/* ── Hero slides ─────────────────────────────────────────── */
const VET_HERO_SLIDES = [
  '/images/pf-vet.png',
  '/images/pf-groom-dog.png',
  '/images/pf-walk-man.png',
  '/images/pf-dogs-park.png',
];

/* ── Data ─────────────────────────────────────────────────── */
const VET_SERVICES = [
  { id: 'checkup',     label: 'General Checkup', icon: '🩺', price: 450, color: '#2B8A50', includes: ['Full physical exam', 'Vital signs check', 'Health report'] },
  { id: 'vaccination', label: 'Vaccination',      icon: '💉', price: 650, color: '#0891B2', includes: ['Rabies', 'Parvovirus', 'Distemper', 'Bordetella'] },
  { id: 'dental',      label: 'Dental Care',      icon: '🦷', price: 750, color: '#7C3AED', includes: ['Teeth cleaning', 'Oral exam', 'Professional scaling'] },
  { id: 'deworming',   label: 'Deworming',        icon: '💊', price: 350, color: '#B45309', includes: ['Internal parasites', 'Prevention treatment', '3-month plan'] },
  { id: 'emergency',   label: 'Emergency Visit',  icon: '🚨', price: 800, color: '#DC2626', includes: ['Urgent care', 'Injury treatment', 'Priority booking'] },
];

// Clinics we already know in Lusaka. Shown only when they are not already found by the live scan.
const KNOWN_CLINICS = [
  { id: 'listed-1', name: 'Lusaka Veterinary Clinic', address: 'Cairo Rd, Lusaka',  lat: -15.4131, lng: 28.2822, hours: 'Mon–Sat 8am–6pm', rating: '4.9' },
  { id: 'listed-2', name: 'PetCare Lusaka',            address: 'Kabulonga, Lusaka', lat: -15.4408, lng: 28.3100, hours: 'Mon–Fri 8am–5pm', rating: '4.8' },
  { id: 'listed-3', name: 'Animal Health Centre',      address: 'Woodlands, Lusaka', lat: -15.4285, lng: 28.3000, hours: 'Mon–Sun 7am–8pm', rating: '4.9' },
  { id: 'listed-4', name: 'VetZam Clinic',             address: 'Roma, Lusaka',      lat: -15.4500, lng: 28.3200, hours: 'Mon–Sat 9am–6pm', rating: '4.7' },
];

const WALKER_FEE          = 150;
const AGGRESSIVE_SURCHARGE = 600;

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  hours: string;
  rating?: string;
  lat: number | null;
  lng: number | null;
  /** pawfleet = registered vet you can book in the app. osm / listed = found on the map, confirm by phone. */
  source: 'pawfleet' | 'osm' | 'listed';
  vetUserId?: string;
  distKm: number | null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ── Main Page ───────────────────────────────────────────── */
export default function VetBooking() {
  const navigate = useNavigate();
  const { data, currentUser, createWalkAsync } = useApp();
  const loc = useMyLocation(true);
  const ownerPets = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const today     = new Date().toISOString().split('T')[0];

  const [heroSlide,       setHeroSlide]      = useState(0);
  const [selectedPet,     setSelectedPet]    = useState(ownerPets[0]?.id ?? '');
  const [serviceId,       setServiceId]      = useState('checkup');
  const [selectedClinic,  setSelectedClinic] = useState('');
  const [clinicSearch,    setClinicSearch]   = useState('');
  const [radius,          setRadius]         = useState<number | 'all'>('all');
  const [areaText,        setAreaText]       = useState('');
  const [areaMissing,     setAreaMissing]    = useState(false);
  const [showPinPicker,   setShowPinPicker]  = useState(false);
  const [isAggressive,    setIsAggressive]   = useState(false);
  const [needsTransport,  setNeedsTransport] = useState(false);
  const [bookingDate,     setBookingDate]    = useState('');
  const [bookingTime,     setBookingTime]    = useState('09:00');
  const [submitting,      setSubmitting]     = useState(false);
  const [bookingError,    setBookingError]   = useState('');
  const [done,            setDone]           = useState(false);
  const [osm,             setOsm]            = useState<OsmPlace[]>([]);
  const [scanning,        setScanning]       = useState(false);
  const [scanned,         setScanned]        = useState(false);
  const [fitTick,         setFitTick]        = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide(s => (s + 1) % VET_HERO_SLIDES.length), 4500);
    return () => clearInterval(id);
  }, []);

  // The pet list loads a moment after the page, so pick the first pet once it arrives.
  useEffect(() => { if (!selectedPet && ownerPets[0]) setSelectedPet(ownerPets[0].id); }, [ownerPets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scan the area around the owner for clinics on the map. Best effort: PawFleet vets show immediately.
  const posKey = loc.pos ? `${loc.pos[0].toFixed(3)},${loc.pos[1].toFixed(3)}` : '';
  useEffect(() => {
    if (!loc.pos) return;
    let cancelled = false;
    setScanning(true);
    setScanned(false);
    scanVetClinics(loc.pos, 20).then(places => { if (!cancelled) { setOsm(places); setScanned(true); } })
      .finally(() => { if (!cancelled) setScanning(false); });
    return () => { cancelled = true; };
  }, [posKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Everything we can offer, merged and sorted by distance.
  const clinics: Clinic[] = useMemo(() => {
    const out: Clinic[] = [];
    const dist = (lat: number | null, lng: number | null) => (loc.pos && lat != null && lng != null ? haversineKm(loc.pos, [lat, lng]) : null);
    const seen = (name: string, lat: number | null, lng: number | null) => out.some(c =>
      norm(c.name) === norm(name) || (lat != null && lng != null && c.lat != null && c.lng != null && haversineKm([c.lat, c.lng], [lat, lng]) < 0.15));

    data.users.filter(u => u.role === 'vet').forEach(u => {
      const has = isValidCoord(u.serviceLat, u.serviceLng);
      out.push({
        id: `pf-${u.id}`, name: u.businessName || u.name, address: u.businessAddress || 'PawFleet verified vet',
        phone: u.phone, hours: 'Contact for hours', rating: '✓ Verified',
        lat: has ? u.serviceLat! : null, lng: has ? u.serviceLng! : null,
        source: 'pawfleet', vetUserId: u.id, distKm: has ? dist(u.serviceLat!, u.serviceLng!) : null,
      });
    });
    osm.forEach(p => {
      if (seen(p.name, p.lat, p.lng)) return;
      out.push({ id: p.id, name: p.name, address: p.address, phone: p.phone, hours: p.hours || 'Call for hours', lat: p.lat, lng: p.lng, source: 'osm', distKm: dist(p.lat, p.lng) });
    });
    KNOWN_CLINICS.forEach(k => {
      if (seen(k.name, k.lat, k.lng)) return;
      out.push({ ...k, source: 'listed', distKm: dist(k.lat, k.lng) });
    });

    return out.sort((a, b) => {
      if (a.distKm == null && b.distKm == null) return (a.source === 'pawfleet' ? -1 : 0) - (b.source === 'pawfleet' ? -1 : 0);
      if (a.distKm == null) return 1;
      if (b.distKm == null) return -1;
      return a.distKm - b.distKm;
    });
  }, [data.users, osm, loc.pos]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = clinics.filter(c => {
    const q = clinicSearch.toLowerCase().trim();
    if (q && !c.name.toLowerCase().includes(q) && !c.address.toLowerCase().includes(q)) return false;
    if (radius !== 'all' && c.distKm != null && c.distKm > radius) return false;
    return true;
  });

  // Default to the nearest clinic you can book in the app, else the nearest overall.
  useEffect(() => {
    if (selectedClinic && clinics.some(c => c.id === selectedClinic)) return;
    setSelectedClinic((clinics.find(c => c.source === 'pawfleet') ?? clinics[0])?.id ?? '');
  }, [clinics]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = clinics.find(c => c.id === selectedClinic) ?? null;
  const service = VET_SERVICES.find(s => s.id === serviceId) ?? VET_SERVICES[0];
  const total   = service.price + (isAggressive ? AGGRESSIVE_SURCHARGE : 0) + (needsTransport ? WALKER_FEE : 0);
  const within10 = clinics.filter(c => c.distKm != null && c.distKm <= 10).length;

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (loc.pos) m.push({ id: 'me', lat: loc.pos[0], lng: loc.pos[1], kind: 'me', title: 'You' });
    visible.forEach(c => {
      if (c.lat == null || c.lng == null) return;
      m.push({ id: c.id, lat: c.lat, lng: c.lng, kind: c.source === 'pawfleet' ? 'vet' : 'vet-listed', selected: c.id === selectedClinic, title: c.name });
    });
    return m;
  }, [visible, loc.pos, selectedClinic]);

  const mapCenter: LatLng = loc.pos ?? (chosen?.lat != null ? [chosen.lat, chosen.lng!] : [-15.4167, 28.2833]);

  const searchArea = async () => {
    setAreaMissing(false);
    const ok = await loc.setFromText(areaText);
    if (!ok) setAreaMissing(true);
  };

  const handleBook = async () => {
    if (!selectedPet || !bookingDate || !currentUser || !chosen) return;
    setSubmitting(true);
    setBookingError('');
    const note = [
      `VET BOOKING: ${service.label}`,
      `📍 Clinic: ${chosen.name}`,
      `Clinic address: ${chosen.address}`,
      chosen.phone ? `Clinic phone: ${chosen.phone}` : null,
      chosen.lat != null && chosen.lng != null ? `ClinicGeo: ${chosen.lat.toFixed(5)},${chosen.lng.toFixed(5)}` : null,
      chosen.source !== 'pawfleet' ? 'Clinic is not on PawFleet: confirm the slot with them by phone' : null,
      isAggressive   ? '⚠️ Aggressive animal — sedation required' : null,
      needsTransport ? '🚗 Walker transport requested'             : null,
      `Total: K${total}`,
    ].filter(Boolean).join('\n');

    const res = await createWalkAsync({
      dogId: selectedPet,
      ownerId: currentUser.id,
      walkerId: chosen.vetUserId,
      status: 'pending',
      scheduledDate: new Date(`${bookingDate}T${bookingTime}:00`).toISOString(),
      duration: 60,
      price: total,
      walkerEarning: needsTransport ? WALKER_FEE : 0,
      notes: note,
      startLocation: needsTransport && loc.pos ? { lat: loc.pos[0], lng: loc.pos[1], address: 'Owner location (pickup for vet transport)' } : undefined,
    });
    setSubmitting(false);
    if (res.error) { setBookingError(res.error); return; }
    setDone(true);
  };

  /* ── Success screen ── */
  if (done && chosen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white gap-5">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg"
          style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>🏥</div>
        <div>
          <h2 className="text-2xl font-extrabold text-ink mb-2">Request sent!</h2>
          <p className="text-sm text-ink-muted">
            {chosen.source === 'pawfleet'
              ? 'The clinic has been notified and will confirm your slot.'
              : 'Please call the clinic to confirm your slot. We have saved your request.'}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <div className="rounded-2xl p-4 text-left" style={{ background: '#F0FDFA', border: '1px solid #A5F3FC' }}>
            <p className="text-[11px] text-teal-600 font-bold uppercase tracking-wider mb-1">Your clinic</p>
            <p className="text-base font-extrabold text-ink">{chosen.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">{chosen.address}</p>
            <p className="text-xs text-teal-600 mt-0.5">⏰ {chosen.hours}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {chosen.phone && (
                <a href={`tel:${chosen.phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#0F766E' }}>
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              {chosen.lat != null && chosen.lng != null && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${chosen.lat},${chosen.lng}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-teal-300 text-teal-700 bg-white">
                  <ExternalLink className="w-3.5 h-3.5" /> Directions
                </a>
              )}
              {chosen.vetUserId && (
                <button type="button" onClick={() => navigate(`/owner/dm/${chosen.vetUserId}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-teal-300 text-teal-700 bg-white">
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
              )}
            </div>
          </div>
          <div className="rounded-2xl px-6 py-3 text-center" style={{ background: '#EBF5EF' }}>
            <p className="text-xs text-ink-muted font-semibold uppercase tracking-wider">Estimated total</p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: '#0F766E' }}>K{total}</p>
          </div>
        </div>
        <button onClick={() => navigate('/owner')}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-28 bg-white min-h-screen">

      {/* ── Hero ── */}
      <div className="relative h-56 w-full overflow-hidden">
        {VET_HERO_SLIDES.map((url, i) => (
          <img key={i} src={url} alt="Vet care"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: heroSlide === i ? 1 : 0, transition: 'opacity 0.9s ease' }} />
        ))}
        <div className="absolute bottom-4 right-4 flex gap-1.5 items-center z-10">
          {VET_HERO_SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-400"
              style={{ width: heroSlide === i ? 18 : 5, height: 5, background: heroSlide === i ? 'white' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,118,110,0.55) 0%, rgba(0,0,0,0.70) 100%)' }} />

        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: 'rgba(8,145,178,0.85)' }}>
              {loc.pos
                ? `🏥 ${within10} clinic${within10 === 1 ? '' : 's'} within 10 km`
                : `🏥 ${clinics.length} clinic${clinics.length === 1 ? '' : 's'} listed`}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">Veterinary Care</h1>
          <p className="text-white/80 text-sm mt-0.5">Find a vet near you and book in minutes</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* ── Service selection ── */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Choose a Service</p>
          <div className="space-y-2.5">
            {VET_SERVICES.map(svc => (
              <button key={svc.id} type="button" onClick={() => setServiceId(svc.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                  serviceId === svc.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-border hover:bg-surface-hover'
                }`}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: serviceId === svc.id ? `${svc.color}18` : '#F3F4F6' }}>
                  {svc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">{svc.label}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {svc.includes.map(i => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-ink-muted font-medium">{i}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-extrabold" style={{ color: svc.color }}>K{svc.price}</p>
                  {serviceId === svc.id && <Check className="w-4 h-4 text-primary mx-auto mt-1" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Select pet ── */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Which Pet?</p>
          {ownerPets.length === 0 ? (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50">
              <p className="text-sm text-amber-700 font-medium">Add a pet in "My Pets" before booking.</p>
              <button onClick={() => navigate('/owner/dogs')}
                className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
                Go to My Pets <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {ownerPets.map(pet => (
                <button key={pet.id} type="button" onClick={() => setSelectedPet(pet.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all ${
                    selectedPet === pet.id
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                  }`}>
                  {pet.imageUrl
                    ? <img src={pet.imageUrl} alt={pet.name} className="w-7 h-7 rounded-full object-cover" />
                    : <span className="text-lg">🐕</span>}
                  {pet.name}
                  {selectedPet === pet.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Toggles ── */}
        <div className="space-y-3">
          <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isAggressive ? 'border-amber-400 bg-amber-50' : 'border-surface-border bg-white'}`}
            onClick={() => setIsAggressive(v => !v)}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${isAggressive ? 'bg-amber-100' : 'bg-surface-secondary'}`}>⚠️</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Aggressive Animal</p>
              <p className="text-xs text-ink-muted">Requires sedation for safe handling</p>
              {isAggressive && <p className="text-xs font-bold text-amber-600 mt-0.5">+K{AGGRESSIVE_SURCHARGE} sedation fee</p>}
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isAggressive ? 'bg-amber-400' : 'bg-surface-border'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isAggressive ? 'left-6' : 'left-0.5'}`} />
            </div>
          </div>

          <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${needsTransport ? 'border-primary bg-primary/5' : 'border-surface-border bg-white'}`}
            onClick={() => setNeedsTransport(v => !v)}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${needsTransport ? 'bg-primary/10' : 'bg-surface-secondary'}`}>🚗</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Walker Transport</p>
              <p className="text-xs text-ink-muted">Walker picks up your pet and takes them to the clinic</p>
              {needsTransport && <p className="text-xs font-bold text-primary mt-0.5">+K{WALKER_FEE} transport fee</p>}
              {needsTransport && !loc.pos && <p className="text-[11px] text-amber-600 mt-0.5">Share your location below so the walker can find you.</p>}
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${needsTransport ? 'bg-primary' : 'bg-surface-border'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${needsTransport ? 'left-6' : 'left-0.5'}`} />
            </div>
          </div>
        </div>

        {/* ── Date & Time ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Date</p>
            <input type="date" min={today} value={bookingDate} onChange={e => setBookingDate(e.target.value)}
              className="w-full border border-surface-border rounded-2xl px-3 py-3 text-sm text-ink focus:outline-none focus:border-primary bg-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Time</p>
            <select value={bookingTime} onChange={e => setBookingTime(e.target.value)}
              className="w-full border border-surface-border rounded-2xl px-3 py-3 text-sm text-ink focus:outline-none focus:border-primary bg-white">
              {['08:00','09:00','10:00','11:00','14:00','15:00','16:00'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* ── Nearby clinics ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Vets near you</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowPinPicker(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: '#0891B2', background: '#F0FDFA', border: '1px solid #A5F3FC' }}>
                <PinIcon className="w-3 h-3" />
                Drop a pin
              </button>
              <button type="button" onClick={() => { loc.request(); setFitTick(t => t + 1); }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: '#0891B2', background: '#F0FDFA', border: '1px solid #A5F3FC' }}>
                <Navigation className="w-3 h-3" />
                {loc.status === 'asking' ? 'Locating…' : loc.pos ? (loc.source === 'typed' ? 'Use GPS instead' : '✓ Located') : 'Use My Location'}
              </button>
            </div>
          </div>

          {/* Status of the scan */}
          <div className="flex items-center gap-2 text-[11px] mb-3 px-3 py-2 rounded-xl bg-surface-secondary text-ink-secondary">
            {scanning ? <><Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Scanning your area for clinics…</>
              : loc.pos ? <><MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#0891B2' }} />
                  {clinics.filter(c => c.distKm != null).length} clinic{clinics.filter(c => c.distKm != null).length === 1 ? '' : 's'} found around {loc.source === 'typed' ? 'the area you entered' : 'you'}
                  {scanned && osm.length === 0 ? '. The map has few clinics listed here, so registered vets are shown first.' : '.'}</>
              : loc.status === 'asking' ? <><Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Waiting for your location…</>
              : <>Location is off. Type your area to find vets near you.</>}
          </div>

          {/* Area fallback */}
          {!loc.pos && loc.status !== 'asking' && (
            <div className="flex gap-2 mb-3">
              <input type="text" value={areaText} onChange={e => setAreaText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchArea(); }}
                placeholder="e.g. Kabulonga, Lusaka or Ndola"
                className="flex-1 border border-surface-border rounded-2xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary bg-white" />
              <button type="button" onClick={searchArea} disabled={loc.lookingUp || areaText.trim().length < 3}
                className="px-4 rounded-2xl text-xs font-bold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>
                {loc.lookingUp ? '…' : 'Find'}
              </button>
            </div>
          )}
          {areaMissing && <p className="text-xs text-amber-600 mb-3">We could not find that place. Try a nearby suburb or town name.</p>}

          {/* Map */}
          <div className="relative rounded-3xl overflow-hidden border border-surface-border shadow-sm" style={{ height: 240 }}>
            <LiveRouteMap
              markers={markers}
              center={mapCenter}
              zoom={12}
              fitKey={`${posKey}|${markers.length > 1 ? 'm' : ''}|${fitTick}`}
              onSelect={id => { if (id !== 'me') setSelectedClinic(id); }}
            />
          </div>
          <p className="text-[11px] text-ink-muted mt-2 text-center">Tap a 🏥 pin to choose that clinic. Teal pins are registered on PawFleet.</p>
        </div>

        {/* ── Clinic selection ── */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Select a Clinic</p>

          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {([['all', 'All'], [5, '5 km'], [10, '10 km'], [25, '25 km']] as const).map(([val, label]) => (
              <button key={String(val)} type="button" onClick={() => setRadius(val)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-all ${radius === val ? 'text-white border-transparent' : 'text-ink-secondary border-surface-border bg-white'}`}
                style={radius === val ? { background: '#0F766E' } : {}}>
                {val === 'all' ? 'All' : `Within ${label}`}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
            <input type="text" placeholder="Search clinics by name or area…" value={clinicSearch} onChange={e => setClinicSearch(e.target.value)}
              className="w-full border border-surface-border rounded-2xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary bg-white" />
          </div>

          <div className="space-y-2">
            {visible.length === 0 && (
              <p className="text-sm text-ink-muted text-center py-6">No clinics match. Try a wider distance.</p>
            )}
            {visible.map(c => (
              <button key={c.id} type="button" onClick={() => setSelectedClinic(c.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                  selectedClinic === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-surface-border bg-white hover:bg-surface-hover'
                }`}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: c.source === 'pawfleet' ? 'linear-gradient(135deg,#CCFBF1,#CFFAFE)' : '#F1F5F9' }}>🏥</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink truncate">{c.name}</p>
                    {c.source === 'pawfleet' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#CCFBF1', color: '#0F766E' }}>On PawFleet</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted truncate">{c.address}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {c.distKm != null ? <span className="font-bold" style={{ color: '#0891B2' }}>{formatKm(c.distKm)} away</span> : 'Distance unknown'}
                    {c.phone ? ' · tap to call after booking' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {c.rating && <p className="text-xs font-bold text-amber-500">⭐ {c.rating}</p>}
                  {selectedClinic === c.id && <Check className="w-4 h-4 text-primary mt-1 ml-auto" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Price breakdown ── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F766E, #0891B2)' }}>
          <div className="p-5">
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-3">Price Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">{service.label}</span>
                <span className="text-white font-semibold">K{service.price}</span>
              </div>
              {isAggressive && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200">Sedation surcharge</span>
                  <span className="text-amber-200 font-semibold">+K{AGGRESSIVE_SURCHARGE}</span>
                </div>
              )}
              {needsTransport && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">Walker transport</span>
                  <span className="text-white font-semibold">+K{WALKER_FEE}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2.5 flex justify-between items-baseline">
                <span className="text-white font-bold">Total</span>
                <span className="text-3xl font-extrabold text-white">K{total}</span>
              </div>
            </div>
            <p className="text-white/60 text-[11px] mt-3">Prices are guides. The clinic confirms the final amount.</p>
          </div>
        </div>

        {bookingError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-bold text-red-700">Request not sent</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{bookingError}</p>
          </div>
        )}

        {/* ── Book button ── */}
        <button type="button" onClick={handleBook}
          disabled={!selectedPet || !bookingDate || !chosen || submitting || ownerPets.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-3"
          style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)', boxShadow: '0 4px 20px rgba(8,145,178,0.35)' }}>
          {submitting
            ? <><div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Sending…</>
            : <>🏥 Book Vet Visit &nbsp;·&nbsp; K{total}</>}
        </button>
        {!bookingDate && ownerPets.length > 0 && <p className="text-center text-xs text-ink-muted -mt-3">Pick a date to continue</p>}

      </div>

      {showPinPicker && (
        <PinDropPicker
          initial={loc.pos}
          onConfirm={result => {
            loc.setPoint([result.lat, result.lng]);
            setFitTick(t => t + 1);
            setShowPinPicker(false);
          }}
          onClose={() => setShowPinPicker(false)}
        />
      )}
    </div>
  );
}
