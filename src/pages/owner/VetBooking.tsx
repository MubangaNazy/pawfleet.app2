import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, AlertTriangle, Check, Navigation, MapPin, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

/* ── Hero slides ─────────────────────────────────────────── */
const VET_HERO_SLIDES = [
  'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&q=80',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&q=80',
];

/* ── Data ─────────────────────────────────────────────────── */
const VET_SERVICES = [
  { id: 'checkup',     label: 'General Checkup', icon: '🩺', price: 450, color: '#2B8A50', includes: ['Full physical exam', 'Vital signs check', 'Health report'] },
  { id: 'vaccination', label: 'Vaccination',      icon: '💉', price: 650, color: '#0891B2', includes: ['Rabies', 'Parvovirus', 'Distemper', 'Bordetella'] },
  { id: 'dental',      label: 'Dental Care',      icon: '🦷', price: 750, color: '#7C3AED', includes: ['Teeth cleaning', 'Oral exam', 'Professional scaling'] },
  { id: 'deworming',   label: 'Deworming',        icon: '💊', price: 350, color: '#B45309', includes: ['Internal parasites', 'Prevention treatment', '3-month plan'] },
  { id: 'emergency',   label: 'Emergency Visit',  icon: '🚨', price: 800, color: '#DC2626', includes: ['Urgent care', 'Injury treatment', 'Priority booking'] },
];

const VET_CLINICS = [
  { id: 1, name: 'Lusaka Veterinary Clinic',  address: 'Cairo Rd, Lusaka',      lat: -15.4131, lng: 28.2822, hours: 'Mon–Sat 8am–6pm',   rating: '4.9' },
  { id: 2, name: 'PetCare Lusaka',             address: 'Kabulonga, Lusaka',     lat: -15.4408, lng: 28.3100, hours: 'Mon–Fri 8am–5pm',   rating: '4.8' },
  { id: 3, name: 'Animal Health Centre',       address: 'Woodlands, Lusaka',     lat: -15.4285, lng: 28.3000, hours: 'Mon–Sun 7am–8pm',   rating: '4.9' },
  { id: 4, name: 'VetZam Clinic',              address: 'Roma, Lusaka',          lat: -15.4500, lng: 28.3200, hours: 'Mon–Sat 9am–6pm',   rating: '4.7' },
];

const WALKER_FEE          = 150;
const AGGRESSIVE_SURCHARGE = 600;

/* ── Vet Map ──────────────────────────────────────────────── */
function VetMap({ userLat, userLng }: { userLat: number | null; userLng: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     'https://tiles.openfreemap.org/styles/liberty',
      center:    [28.2833, -15.4167],
      zoom:      11.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      VET_CLINICS.forEach(c => {
        const el = document.createElement('div');
        el.style.cssText = 'width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0F766E,#0891B2);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;';
        el.textContent = '🏥';
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([c.lng, c.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(
            `<div style="font-size:13px;font-weight:700;color:#0F766E">${c.name}</div>
             <div style="font-size:11px;color:#555;margin-top:2px">${c.address}</div>
             <div style="font-size:11px;color:#0891B2;margin-top:2px">⏰ ${c.hours}</div>
             <div style="font-size:11px;color:#F59E0B;margin-top:2px">⭐ ${c.rating}</div>`
          ))
          .addTo(map);
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    const el = document.createElement('div');
    el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);';
    new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userLng, userLat])
      .addTo(mapRef.current);
    mapRef.current.flyTo({ center: [userLng, userLat], zoom: 12.5, duration: 1200 });
  }, [userLat, userLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

/* ── Main Page ───────────────────────────────────────────── */
export default function VetBooking() {
  const navigate = useNavigate();
  const { data, currentUser } = useApp();
  const ownerPets = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const today     = new Date().toISOString().split('T')[0];

  const [heroSlide,       setHeroSlide]      = useState(0);
  const [selectedPet,     setSelectedPet]    = useState(ownerPets[0]?.id ?? '');
  const [serviceId,       setServiceId]      = useState('checkup');
  const [selectedClinic,  setSelectedClinic] = useState(VET_CLINICS[0].id);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide(s => (s + 1) % VET_HERO_SLIDES.length), 4500);
    return () => clearInterval(id);
  }, []);
  const [isAggressive,    setIsAggressive]   = useState(false);
  const [needsTransport,  setNeedsTransport] = useState(false);
  const [bookingDate,     setBookingDate]    = useState('');
  const [bookingTime,     setBookingTime]    = useState('09:00');
  const [userLat,         setUserLat]        = useState<number | null>(null);
  const [userLng,         setUserLng]        = useState<number | null>(null);
  const [locLoading,      setLocLoading]     = useState(false);
  const [submitting,      setSubmitting]     = useState(false);
  const [done,            setDone]           = useState(false);

  const service = VET_SERVICES.find(s => s.id === serviceId) ?? VET_SERVICES[0];
  const total   = service.price + (isAggressive ? AGGRESSIVE_SURCHARGE : 0) + (needsTransport ? WALKER_FEE : 0);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocLoading(false); },
      ()  => setLocLoading(false),
      { timeout: 10000 }
    );
  };

  const handleBook = async () => {
    if (!selectedPet || !bookingDate || !currentUser) return;
    setSubmitting(true);
    const clinic = VET_CLINICS.find(c => c.id === selectedClinic) ?? VET_CLINICS[0];
    const note = [
      `VET BOOKING: ${service.label}`,
      `📍 Clinic: ${clinic.name}`,
      isAggressive   ? '⚠️ Aggressive animal — sedation required' : null,
      needsTransport ? '🚗 Walker transport requested'             : null,
      `Total: K${total}`,
    ].filter(Boolean).join('\n');

    await supabase.from('walks').insert({
      id: crypto.randomUUID(), dog_id: selectedPet, owner_id: currentUser.id,
      walker_id: null, status: 'pending',
      scheduled_date: `${bookingDate}T${bookingTime}:00`,
      notes: note, price: total, walker_earning: needsTransport ? WALKER_FEE : 0,
      duration: 60, created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setDone(true);
  };

  /* ── Success screen ── */
  if (done) {
    const bookedClinic = VET_CLINICS.find(c => c.id === selectedClinic) ?? VET_CLINICS[0];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white gap-5">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg"
          style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>🏥</div>
        <div>
          <h2 className="text-2xl font-extrabold text-ink mb-2">Booking Confirmed!</h2>
          <p className="text-sm text-ink-muted">Your appointment has been sent to the clinic below.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <div className="rounded-2xl p-4 text-left" style={{ background: '#F0FDFA', border: '1px solid #A5F3FC' }}>
            <p className="text-[11px] text-teal-600 font-bold uppercase tracking-wider mb-1">Assigned Clinic</p>
            <p className="text-base font-extrabold text-ink">{bookedClinic.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">{bookedClinic.address}</p>
            <p className="text-xs text-teal-600 mt-0.5">⏰ {bookedClinic.hours}</p>
          </div>
          <div className="rounded-2xl px-6 py-3 text-center" style={{ background: '#EBF5EF' }}>
            <p className="text-xs text-ink-muted font-semibold uppercase tracking-wider">Total Due</p>
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
        {/* Slide dots */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 items-center z-10">
          {VET_HERO_SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-400"
              style={{ width: heroSlide === i ? 18 : 5, height: 5, background: heroSlide === i ? 'white' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,118,110,0.55) 0%, rgba(0,0,0,0.70) 100%)' }} />

        {/* Back button */}
        <button type="button" onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Hero text */}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
              style={{ background: 'rgba(8,145,178,0.8)', backdropFilter: 'blur(4px)' }}>
              🏥 4 Partner Clinics in Lusaka
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">Veterinary Care</h1>
          <p className="text-white/80 text-sm mt-0.5">Expert vet visits for your dogs and cats</p>
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
                    : <span className="text-lg">{pet.animalType === 'cat' ? '🐈' : '🐕'}</span>}
                  {pet.name}
                  {selectedPet === pet.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Toggles ── */}
        <div className="space-y-3">
          {/* Aggressive */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isAggressive ? 'border-amber-400 bg-amber-50' : 'border-surface-border bg-white'}`}
            onClick={() => setIsAggressive(v => !v)}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${isAggressive ? 'bg-amber-100' : 'bg-surface-secondary'}`}>
              ⚠️
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Aggressive Animal</p>
              <p className="text-xs text-ink-muted">Requires sedation for safe handling</p>
              {isAggressive && <p className="text-xs font-bold text-amber-600 mt-0.5">+K{AGGRESSIVE_SURCHARGE} sedation fee</p>}
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isAggressive ? 'bg-amber-400' : 'bg-surface-border'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isAggressive ? 'left-6' : 'left-0.5'}`} />
            </div>
          </div>

          {/* Transport */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${needsTransport ? 'border-primary bg-primary/5' : 'border-surface-border bg-white'}`}
            onClick={() => setNeedsTransport(v => !v)}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${needsTransport ? 'bg-primary/10' : 'bg-surface-secondary'}`}>
              🚗
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Walker Transport</p>
              <p className="text-xs text-ink-muted">Walker picks up your pet and takes them to the clinic</p>
              {needsTransport && <p className="text-xs font-bold text-primary mt-0.5">+K{WALKER_FEE} transport fee</p>}
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
              {['08:00','09:00','10:00','11:00','14:00','15:00','16:00'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Map ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Nearest Clinics</p>
            <button type="button" onClick={getLocation}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: '#0891B2', background: '#F0FDFA', border: '1px solid #A5F3FC' }}>
              <Navigation className="w-3 h-3" />
              {locLoading ? 'Locating…' : userLat ? '✓ Located' : 'Use My Location'}
            </button>
          </div>
          <div className="rounded-3xl overflow-hidden border border-surface-border shadow-sm" style={{ height: 220 }}>
            <VetMap userLat={userLat} userLng={userLng} />
          </div>
          <p className="text-[11px] text-ink-muted mt-2 text-center">Tap 🏥 markers to see clinic details</p>
        </div>

        {/* ── Clinic selection ── */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Select a Clinic</p>
          <div className="space-y-2">
            {VET_CLINICS.map(c => (
              <button key={c.id} type="button" onClick={() => setSelectedClinic(c.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                  selectedClinic === c.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-surface-border bg-white hover:bg-surface-hover'
                }`}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: selectedClinic === c.id ? '#EBF5EF' : 'linear-gradient(135deg,#F0FDFA,#CFFAFE)' }}>🏥</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{c.name}</p>
                  <p className="text-xs text-ink-muted">{c.address}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  <p className="text-xs font-bold text-amber-500">⭐ {c.rating}</p>
                  <p className="text-[10px] text-ink-muted">{c.hours.split(' ')[0]}</p>
                  {selectedClinic === c.id && <Check className="w-3.5 h-3.5 text-primary mt-0.5" />}
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
          </div>
        </div>

        {/* ── Book button ── */}
        <button type="button" onClick={handleBook}
          disabled={!selectedPet || !bookingDate || submitting || ownerPets.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-3"
          style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)', boxShadow: '0 4px 20px rgba(8,145,178,0.35)' }}>
          {submitting
            ? <><div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Booking…</>
            : <>🏥 Book Vet Visit &nbsp;·&nbsp; K{total}</>}
        </button>

      </div>
    </div>
  );
}
