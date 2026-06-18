import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, MapPin, AlertTriangle, Check, Navigation, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const LUSAKA_CENTER: [number, number] = [28.2833, -15.4167]; // [lng, lat] for maplibre

const VET_SERVICES = [
  { id: 'checkup',     label: 'General Checkup', icon: '🩺', price: 450,  desc: 'Full physical exam, vitals, basic health screening' },
  { id: 'vaccination', label: 'Vaccination',      icon: '💉', price: 650,  desc: 'Core vaccines: Rabies, Parvo, Distemper, Bordetella' },
  { id: 'dental',      label: 'Dental Care',      icon: '🦷', price: 750,  desc: 'Teeth cleaning, oral exam, professional scaling' },
  { id: 'deworming',   label: 'Deworming',        icon: '💊', price: 350,  desc: 'Internal parasite treatment and 3-month prevention' },
  { id: 'emergency',   label: 'Emergency Visit',  icon: '🚨', price: 800,  desc: 'Urgent care for injuries or sudden illness' },
];

const VET_CLINICS = [
  { id: 1, name: 'Lusaka Veterinary Clinic',  address: 'Cairo Rd, Lusaka',        lat: -15.4131, lng: 28.2822, hours: 'Mon–Sat 8am–6pm' },
  { id: 2, name: 'PetCare Lusaka',             address: 'Kabulonga, Lusaka',       lat: -15.4408, lng: 28.3100, hours: 'Mon–Fri 8am–5pm' },
  { id: 3, name: 'Animal Health Centre',       address: 'Woodlands, Lusaka',       lat: -15.4285, lng: 28.3000, hours: 'Mon–Sun 7am–8pm' },
  { id: 4, name: 'VetZam Clinic',              address: 'Roma, Lusaka',            lat: -15.4500, lng: 28.3200, hours: 'Mon–Sat 9am–6pm' },
];

const WHAT_WE_DO = [
  { icon: '🩺', title: 'Physical Exam',   desc: 'Nose-to-tail health assessment by a certified vet' },
  { icon: '💉', title: 'Vaccinations',    desc: 'Protection against rabies, parvovirus & distemper' },
  { icon: '🔬', title: 'Lab Tests',       desc: 'Blood work, parasite screening & urinalysis' },
  { icon: '🦷', title: 'Dental Check',    desc: 'Oral hygiene assessment and professional cleaning' },
  { icon: '💊', title: 'Deworming',       desc: 'Monthly prevention and parasite treatment plan' },
  { icon: '📋', title: 'Health Record',   desc: 'Digital health log updated after every visit' },
];

const WALKER_FEE         = 150;
const AGGRESSIVE_SURCHARGE = 600;

function VetMap({ userLat, userLng }: { userLat: number | null; userLng: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: LUSAKA_CENTER,
      zoom: 11.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      // Vet clinic markers
      VET_CLINICS.forEach(clinic => {
        const el = document.createElement('div');
        el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1B4332,#2B8A50);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;';
        el.textContent = '🏥';
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([clinic.lng, clinic.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(
            `<div style="font-family:sans-serif;font-size:13px;font-weight:700;color:#1B4332">${clinic.name}</div>
             <div style="font-size:11px;color:#666;margin-top:2px">${clinic.address}</div>
             <div style="font-size:11px;color:#2B8A50;margin-top:2px">⏰ ${clinic.hours}</div>`
          ))
          .addTo(map);
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Add/update user location marker
  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    const el = document.createElement('div');
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 6px rgba(59,130,246,0.5);';
    new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userLng, userLat])
      .addTo(mapRef.current);
    mapRef.current.flyTo({ center: [userLng, userLat], zoom: 12, duration: 1000 });
  }, [userLat, userLng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function VetBooking() {
  const navigate     = useNavigate();
  const { data, currentUser } = useApp();
  const ownerPets    = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const today        = new Date().toISOString().split('T')[0];

  const [selectedPet,    setSelectedPet]    = useState(ownerPets[0]?.id ?? '');
  const [serviceId,      setServiceId]      = useState('checkup');
  const [isAggressive,   setIsAggressive]   = useState(false);
  const [needsTransport, setNeedsTransport] = useState(false);
  const [bookingDate,    setBookingDate]    = useState('');
  const [bookingTime,    setBookingTime]    = useState('09:00');
  const [userLat,        setUserLat]        = useState<number | null>(null);
  const [userLng,        setUserLng]        = useState<number | null>(null);
  const [locLoading,     setLocLoading]     = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [done,           setDone]           = useState(false);

  const service = VET_SERVICES.find(s => s.id === serviceId) ?? VET_SERVICES[0];
  const total   = service.price + (isAggressive ? AGGRESSIVE_SURCHARGE : 0) + (needsTransport ? WALKER_FEE : 0);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocLoading(false); },
      ()  => { setLocLoading(false); },
      { timeout: 10000 }
    );
  };

  const handleBook = async () => {
    if (!selectedPet || !bookingDate || !currentUser) return;
    setSubmitting(true);
    const pet  = ownerPets.find(p => p.id === selectedPet);
    const note = [
      `VET BOOKING: ${service.label}`,
      isAggressive   ? '⚠️ Aggressive animal — sedation required' : null,
      needsTransport  ? '🚗 Walker transport requested'            : null,
      `Total: K${total}`,
    ].filter(Boolean).join('\n');

    await supabase.from('walks').insert({
      id:             crypto.randomUUID(),
      dog_id:         selectedPet,
      owner_id:       currentUser.id,
      walker_id:      null,
      status:         'pending',
      scheduled_date: `${bookingDate}T${bookingTime}:00`,
      notes:          note,
      price:          total,
      walker_earning: needsTransport ? WALKER_FEE : 0,
      duration:       60,
      created_at:     new Date().toISOString(),
      ...(userLat && userLng ? { start_location: JSON.stringify({ lat: userLat, lng: userLng }) } : {}),
    });
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
          style={{ background: '#EBF5EF' }}>✅</div>
        <h2 className="text-xl font-extrabold text-ink mb-2">Vet Booking Received!</h2>
        <p className="text-sm text-ink-muted mb-2">We'll confirm your appointment shortly.</p>
        <p className="text-base font-bold text-primary mb-8">Total: K{total}</p>
        <button onClick={() => navigate('/owner/services')}
          className="px-8 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-28 bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-ink leading-tight">Veterinary Care</h1>
          <p className="text-xs text-ink-muted">Book a vet visit for your pet</p>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative h-48 w-full overflow-hidden">
        <img src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&q=80"
          alt="Vet care" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-extrabold text-lg drop-shadow">Trusted Vet Partners in Lusaka</p>
          <p className="text-white/80 text-xs mt-0.5">PawFleet connects you with certified vet clinics</p>
        </div>
      </div>

      {/* What gets done */}
      <div className="px-4 pt-5">
        <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-3">What Gets Done at the Vet</p>
        <div className="grid grid-cols-2 gap-2">
          {WHAT_WE_DO.map(item => (
            <div key={item.title} className="bg-surface-secondary border border-surface-border rounded-2xl p-3">
              <span className="text-xl">{item.icon}</span>
              <p className="text-sm font-bold text-ink mt-1">{item.title}</p>
              <p className="text-xs text-ink-muted mt-0.5 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">

        {/* Select pet */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Select Pet</p>
          {ownerPets.length === 0 ? (
            <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
              Add a pet in My Pets before booking a vet visit.
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {ownerPets.map(pet => (
                <button key={pet.id} type="button" onClick={() => setSelectedPet(pet.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedPet === pet.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                  }`}>
                  {pet.imageUrl
                    ? <img src={pet.imageUrl} alt={pet.name} className="w-6 h-6 rounded-full object-cover" />
                    : <span className="text-base">{pet.animalType === 'cat' ? '🐈' : '🐕'}</span>}
                  {pet.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Service type */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Service Type</p>
          <div className="space-y-2">
            {VET_SERVICES.map(svc => (
              <button key={svc.id} type="button" onClick={() => setServiceId(svc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                  serviceId === svc.id
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-border hover:bg-surface-hover'
                }`}>
                <span className="text-2xl shrink-0">{svc.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{svc.label}</p>
                  <p className="text-xs text-ink-muted">{svc.desc}</p>
                </div>
                <p className="text-sm font-extrabold shrink-0" style={{ color: '#2B8A50' }}>K{svc.price}</p>
                {serviceId === svc.id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Aggressive animal toggle */}
        <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isAggressive ? 'border-amber-400 bg-amber-50' : 'border-surface-border bg-surface-secondary'}`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${isAggressive ? 'text-amber-500' : 'text-ink-muted'}`} />
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Aggressive Animal</p>
            <p className="text-xs text-ink-muted mt-0.5">Pet requires sedation for safe examination</p>
            {isAggressive && (
              <p className="text-xs font-bold text-amber-600 mt-1">+K{AGGRESSIVE_SURCHARGE} sedation surcharge</p>
            )}
          </div>
          <button type="button" onClick={() => setIsAggressive(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isAggressive ? 'bg-amber-400' : 'bg-surface-border'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isAggressive ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Walker transport toggle */}
        <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${needsTransport ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface-secondary'}`}>
          <span className="text-xl shrink-0 mt-0.5">🚗</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Walker Transport</p>
            <p className="text-xs text-ink-muted mt-0.5">A PawFleet walker picks up your pet and takes them to the clinic</p>
            {needsTransport && (
              <p className="text-xs font-bold text-primary mt-1">+K{WALKER_FEE} transport fee</p>
            )}
          </div>
          <button type="button" onClick={() => setNeedsTransport(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${needsTransport ? 'bg-primary' : 'bg-surface-border'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${needsTransport ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Date */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Preferred Date</p>
          <input type="date" min={today} value={bookingDate} onChange={e => setBookingDate(e.target.value)}
            className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary bg-white" />
        </div>

        {/* Time */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Preferred Time</p>
          <div className="flex gap-2 flex-wrap">
            {['08:00','09:00','10:00','11:00','14:00','15:00','16:00'].map(t => (
              <button key={t} type="button" onClick={() => setBookingTime(t)}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  bookingTime === t
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Location + Map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Nearest Vet Clinics</p>
            <button type="button" onClick={getLocation}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              <Navigation className="w-3.5 h-3.5" />
              {locLoading ? 'Finding…' : userLat ? 'Located ✓' : 'Use My Location'}
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden border border-surface-border" style={{ height: 240 }}>
            <VetMap userLat={userLat} userLng={userLng} />
          </div>
          <p className="text-[11px] text-ink-muted mt-1.5">🏥 Tap a clinic marker on the map for details</p>
        </div>

        {/* Clinic list */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Partner Vet Clinics</p>
          <div className="space-y-2">
            {VET_CLINICS.map(clinic => (
              <div key={clinic.id} className="flex items-center gap-3 p-3 rounded-2xl border border-surface-border bg-surface-secondary">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: '#EBF5EF' }}>🏥</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{clinic.name}</p>
                  <p className="text-xs text-ink-muted">{clinic.address}</p>
                  <p className="text-xs font-medium" style={{ color: '#2B8A50' }}>⏰ {clinic.hours}</p>
                </div>
                <MapPin className="w-4 h-4 text-ink-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="rounded-2xl border border-surface-border bg-surface-secondary p-4 space-y-2">
          <p className="text-sm font-bold text-ink mb-1">Price Breakdown</p>
          <div className="flex justify-between text-sm">
            <span className="text-ink-secondary">{service.label}</span>
            <span className="font-semibold text-ink">K{service.price}</span>
          </div>
          {isAggressive && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Sedation surcharge</span>
              <span className="font-semibold text-amber-600">+K{AGGRESSIVE_SURCHARGE}</span>
            </div>
          )}
          {needsTransport && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">Walker transport</span>
              <span className="font-semibold text-ink">+K{WALKER_FEE}</span>
            </div>
          )}
          <div className="border-t border-surface-border pt-2 flex justify-between">
            <span className="font-bold text-ink">Total</span>
            <span className="font-extrabold text-lg" style={{ color: '#1B4332' }}>K{total}</span>
          </div>
        </div>

        {/* Book button */}
        <button type="button" onClick={handleBook}
          disabled={!selectedPet || !bookingDate || submitting || ownerPets.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {submitting
            ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Booking…</>
            : <>🏥 Book Vet Visit — K{total}</>}
        </button>
      </div>
    </div>
  );
}
