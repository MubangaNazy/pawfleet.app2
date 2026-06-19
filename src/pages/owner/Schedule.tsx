import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import {
  Clock, MapPin, MessageCircle, Navigation,
  ChevronLeft, ChevronRight, StickyNote, X, Check,
  Calendar, CheckCircle, Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Walk } from '../../types';

/* ─── Clinic data (with coords for map) ────────────────── */
const VET_CLINICS = [
  { id: 1, name: 'Lusaka Veterinary Clinic', address: 'Cairo Rd, Lusaka',      lat: -15.4131, lng: 28.2822 },
  { id: 2, name: 'PetCare Lusaka',           address: 'Kabulonga, Lusaka',     lat: -15.4408, lng: 28.3100 },
  { id: 3, name: 'Animal Health Centre',     address: 'Woodlands, Lusaka',     lat: -15.4285, lng: 28.3000 },
  { id: 4, name: 'VetZam Clinic',            address: 'Roma, Lusaka',          lat: -15.4500, lng: 28.3200 },
];

const SERVICE_TILES = [
  { type: 'walk'  as const, icon: '🦮', label: 'Dog Walk',  sub: 'Book a walker',      color: '#1B4332', bg: '#EBF5EF' },
  { type: 'groom' as const, icon: '✂️', label: 'Grooming',  sub: 'At-home grooming',   color: '#0891B2', bg: '#EFF6FF' },
  { type: 'vet'   as const, icon: '🩺', label: 'Vet Care',  sub: 'Clinic appointment', color: '#7C3AED', bg: '#F5F3FF' },
];

/* ─── Vet map picker sub-component ─────────────────────── */
function VetMapPicker({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     'https://tiles.openfreemap.org/styles/liberty',
      center:    [28.2922, -15.4167],
      zoom:      12,
      attributionControl: false,
    });

    VET_CLINICS.forEach(clinic => {
      const el = document.createElement('div');
      el.style.cssText = [
        'width:34px;height:34px;border-radius:50%;',
        'background:#7C3AED;border:3px solid white;',
        'box-shadow:0 2px 8px rgba(0,0,0,0.35);',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:16px;cursor:pointer;',
      ].join('');
      el.textContent = '🏥';
      new maplibregl.Marker({ element: el })
        .setLngLat([clinic.lng, clinic.lat])
        .setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setText(clinic.name))
        .addTo(map);
      el.addEventListener('click', () => {
        onSelect(clinic.id);
        map.flyTo({ center: [clinic.lng, clinic.lat], zoom: 14 });
      });
    });

    mapRef.current = map;
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  /* Fly to selected clinic */
  useEffect(() => {
    if (selected === null) return;
    const c = VET_CLINICS.find(x => x.id === selected);
    if (c) mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 14 });
  }, [selected]);

  const handleUseLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { longitude, latitude } = pos.coords;
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 13 });
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 8000 }
    );
  };

  return (
    <div>
      {/* Map */}
      <div className="relative" style={{ height: 180 }}>
        <div ref={containerRef} className="w-full h-full" />
        <button type="button" onClick={handleUseLocation}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow"
          style={{ background: 'rgba(27,67,50,0.88)', backdropFilter: 'blur(4px)' }}>
          {locLoading
            ? <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Locating…</>
            : <>📍 Use my location</>}
        </button>
      </div>

      {/* Clinic list */}
      <div className="divide-y divide-surface-border">
        {VET_CLINICS.map(c => {
          const active = selected === c.id;
          return (
            <button key={c.id} type="button"
              onClick={() => onSelect(c.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-all"
              style={active ? { background: '#F5F3FF' } : {}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: active ? '#7C3AED20' : '#F3F4F6' }}>🏥</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">{c.address}</p>
              </div>
              {active
                ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#7C3AED' }} />
                : <div className="w-4 h-4 rounded-full border-2 border-surface-border shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Notes modal ───────────────────────────────────────── */
function NotesModal({ walk, onClose }: { walk: Walk; onClose: () => void }) {
  const { updateWalk } = useApp();
  const [note,   setNote]   = useState(walk.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateWalk(walk.id, { notes: note.trim() || undefined });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg mx-auto p-5 pb-10 space-y-4">
        <div className="flex justify-center mb-1">
          <div className="w-10 h-1 rounded-full bg-surface-border" />
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Instructions for Walker</h3>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Please use the side gate. Buddy needs his harness…"
          rows={5}
          className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none"
        />
        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#1B4332' }}>
          {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save Note</>}
        </button>
      </div>
    </div>
  );
}

const isVetWalk   = (n?: string) => n?.startsWith('VET BOOKING:') ?? false;
const isGroomWalk = (n?: string) => n?.startsWith('GROOMING:') ?? false;

/* ─── Main Schedule component ───────────────────────────── */
export default function OwnerSchedule() {
  const { data, currentUser, createWalk, updateWalk } = useApp();
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [notesWalk,    setNotesWalk]    = useState<Walk | null>(null);

  /* Inline booking state */
  const [selService,  setSelService]  = useState<'walk' | 'groom' | 'vet' | null>(null);
  const [selClinic,   setSelClinic]   = useState<number | null>(null);
  const [selGroomer,  setSelGroomer]  = useState<string | null>(null);
  const [selDogs,     setSelDogs]     = useState<string[]>([]);
  const [booking,     setBooking]     = useState(false);
  const [booked,      setBooked]      = useState(false);

  const myWalks  = data.walks.filter(w => w.ownerId === currentUser?.id);
  const myDogs   = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const walkers  = data.users.filter(u => u.role === 'walker');

  /* Auto-select first dog when opening */
  useEffect(() => {
    if (myDogs.length > 0 && selDogs.length === 0) {
      setSelDogs([myDogs[0].id]);
    }
  }, [myDogs.length]);

  /* Reset booking when date changes */
  useEffect(() => {
    setSelService(null);
    setSelClinic(null);
    setSelGroomer(null);
    setBooked(false);
  }, [selectedDate?.toDateString()]);

  /* Calendar helpers */
  const monthStart  = startOfMonth(currentMonth);
  const monthEnd    = endOfMonth(currentMonth);
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad    = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];

  const walksForDay = (date: Date) =>
    myWalks.filter(w => isSameDay(new Date(w.scheduledDate), date));

  const selectedDayWalks = selectedDate
    ? walksForDay(selectedDate).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    : [];

  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending' || w.status === 'active')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  /* Toggle a dog in/out of selection */
  const toggleDog = (dogId: string) => {
    setSelDogs(prev =>
      prev.includes(dogId)
        ? prev.filter(id => id !== dogId)
        : [...prev, dogId]
    );
  };

  /* ── Book handler ─────────────────────────────────────── */
  const handleScheduleNow = () => {
    if (!selectedDate || !currentUser || myDogs.length === 0) return;

    const dogsToBook = selDogs.length > 0 ? selDogs : [myDogs[0].id];
    const dt = new Date(selectedDate);
    dt.setHours(9, 0, 0, 0);

    let notes = '';
    let duration = 60;
    let price    = 0;
    let walkerId: string | undefined;

    if (selService === 'vet') {
      const clinic = VET_CLINICS.find(c => c.id === selClinic);
      notes    = `VET BOOKING: General Checkup\n📍 Clinic: ${clinic?.name ?? ''}\nTotal: K450`;
      duration = 60;
      price    = 450;
    } else if (selService === 'groom') {
      const groomer = data.users.find(u => u.id === selGroomer);
      notes     = `GROOMING: Full Groom\n📍 Groomer: ${groomer?.name ?? ''}\nTotal: K350`;
      duration  = 90;
      price     = 350;
      walkerId  = selGroomer ?? undefined;
    }

    setBooking(true);
    dogsToBook.forEach(dogId => {
      createWalk({
        dogId,
        ownerId:       currentUser.id,
        walkerId,
        status:        'pending',
        scheduledDate: dt.toISOString(),
        duration,
        price,
        walkerEarning: Math.round(price * 0.7),
        ownerCost:     price,
        notes,
      });
    });
    setBooking(false);
    setBooked(true);
  };

  /* ── Walk card ────────────────────────────────────────── */
  const statusBadge = (status: string) => {
    if (status === 'active')    return { label: 'Active',    cls: 'bg-success/10 text-success border border-success/20' };
    if (status === 'completed') return { label: 'Done',      cls: 'bg-surface-secondary text-ink-secondary border border-surface-border' };
    if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border border-red-100' };
    return { label: 'Upcoming', cls: 'bg-primary/10 text-primary border border-primary/20' };
  };

  const renderWalkCard = (walk: Walk) => {
    const dog    = data.dogs.find(d => d.id === walk.dogId);
    const walker = data.users.find(u => u.id === walk.walkerId);
    const badge  = statusBadge(walk.status);
    const vet    = isVetWalk(walk.notes);
    const groom  = isGroomWalk(walk.notes);

    const lines      = (walk.notes ?? '').split('\n');
    const vetService = vet ? lines[0].replace('VET BOOKING: ', '') : null;
    const clinicLine = lines.find(l => l.startsWith('📍 Clinic:'));
    const clinic     = clinicLine ? clinicLine.replace('📍 Clinic: ', '') : null;
    const groomLabel = groom ? lines[0].replace('GROOMING: ', '') : null;
    const ownerNote  = !vet && !groom && walk.notes?.trim() ? walk.notes : null;

    return (
      <div key={walk.id} className="flex gap-4">
        <div className="flex flex-col items-center shrink-0 pt-0.5" style={{ minWidth: 48 }}>
          <p className="text-[10px] font-bold text-ink-muted uppercase">{format(new Date(walk.scheduledDate), 'MMM')}</p>
          <p className="text-2xl font-extrabold text-ink leading-tight">{format(new Date(walk.scheduledDate), 'd')}</p>
        </div>

        <div className="flex-1 bg-white border border-surface-border rounded-2xl p-3.5 shadow-sm min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{format(new Date(walk.scheduledDate), 'h:mm a')} · {vet || groom ? '60 min' : '45 min'}</span>
              </div>

              {vet && (
                <>
                  <p className="font-bold text-ink text-sm flex items-center gap-1.5">🏥 {vetService}</p>
                  {clinic && (
                    <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{clinic}</span>
                    </div>
                  )}
                </>
              )}

              {groom && (
                <p className="font-bold text-ink text-sm flex items-center gap-1.5">✂️ {groomLabel}</p>
              )}

              {!vet && !groom && (
                <>
                  <p className="font-bold text-ink text-sm">
                    Walk with {walker?.name?.split(' ')[0] || 'Walker'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{dog?.name || 'Your pet'}</span>
                  </div>
                </>
              )}

              {ownerNote && (
                <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-2">
                  <StickyNote className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 leading-snug break-words">{ownerNote}</p>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {!vet && !groom && (
            <div className="flex gap-3 mt-3 flex-wrap items-center">
              <Link to={`/owner/chat/${walk.id}`}
                className="flex items-center gap-1.5 text-xs text-ink-secondary font-semibold hover:text-primary">
                <MessageCircle className="w-3.5 h-3.5" /> Chat
              </Link>
              <span className="text-ink-muted text-xs">·</span>
              <Link to={`/owner/track/${walk.id}`}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                <Navigation className="w-3.5 h-3.5" /> Track
              </Link>
              <span className="text-ink-muted text-xs">·</span>
              <button type="button" onClick={() => setNotesWalk(walk)}
                className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                <StickyNote className="w-3.5 h-3.5" />{ownerNote ? 'Edit Note' : 'Add Note'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Dog multi-picker ─────────────────────────────────── */
  const renderDogPicker = () => {
    if (myDogs.length === 0) {
      return (
        <p className="text-xs text-ink-muted">
          <Link to="/owner/dogs" className="text-primary font-bold underline">Add a pet</Link> to get started.
        </p>
      );
    }
    return (
      <div>
        <p className="text-xs font-bold text-ink-muted mb-2 uppercase tracking-wider">
          {myDogs.length === 1 ? 'Your pet' : 'Select pets (can pick multiple)'}
        </p>
        <div className="flex gap-2 flex-wrap">
          {myDogs.map(dog => {
            const active = selDogs.includes(dog.id);
            return (
              <button key={dog.id} type="button" onClick={() => toggleDog(dog.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all"
                style={active
                  ? { background: '#EBF5EF', borderColor: '#1B4332', color: '#1B4332' }
                  : { background: 'white', borderColor: '#E5E7EB', color: '#6B7280' }}>
                {dog.imageUrl
                  ? <img src={dog.imageUrl} alt={dog.name} className="w-4 h-4 rounded-full object-cover" />
                  : <span>🐾</span>}
                {dog.name}
                {active && <CheckCircle className="w-3 h-3" style={{ color: '#1B4332' }} />}
              </button>
            );
          })}
        </div>
        {myDogs.length > 1 && selDogs.length > 1 && (
          <p className="text-[10px] text-ink-muted mt-1.5">
            {selDogs.length} separate bookings will be created
          </p>
        )}
      </div>
    );
  };

  /* ── Inline booking panel ─────────────────────────────── */
  const renderBookingPanel = () => {
    if (!selectedDate) return null;

    /* Success */
    if (booked) {
      const svcLabel = selService === 'vet' ? 'Vet appointment' : selService === 'groom' ? 'Grooming session' : 'Walk';
      const provider = selService === 'vet'
        ? VET_CLINICS.find(c => c.id === selClinic)?.name
        : selService === 'groom'
        ? data.users.find(u => u.id === selGroomer)?.name
        : null;
      const petNames = selDogs.map(id => myDogs.find(d => d.id === id)?.name).filter(Boolean).join(', ');
      return (
        <div className="bg-white border border-surface-border rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl"
            style={{ background: '#EBF5EF' }}>✅</div>
          <div>
            <p className="font-bold text-ink">{svcLabel} requested!</p>
            {provider && <p className="text-sm text-ink-muted mt-0.5">{provider}</p>}
            <p className="text-sm text-ink-muted">{format(selectedDate, 'MMMM d')} · 9:00 AM</p>
            {petNames && <p className="text-xs text-primary font-semibold mt-1">🐾 {petNames}</p>}
          </div>
          <button type="button" onClick={() => { setBooked(false); setSelService(null); setSelClinic(null); setSelGroomer(null); }}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-surface-border text-ink-secondary hover:bg-surface-hover">
            Book another
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-2xl overflow-hidden border border-surface-border bg-white">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-surface-border" style={{ background: '#F8FBF9' }}>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            {selectedDayWalks.length > 0 ? 'Add another booking' : 'What would you like to schedule?'}
          </p>
        </div>

        {/* Step 1 — Service tiles */}
        <div className="grid grid-cols-3 divide-x divide-surface-border border-b border-surface-border">
          {SERVICE_TILES.map(s => {
            const active = selService === s.type;
            return (
              <button key={s.type} type="button"
                onClick={() => {
                  setSelService(s.type);
                  setSelClinic(null);
                  setSelGroomer(null);
                  setBooked(false);
                }}
                className="flex flex-col items-center gap-2 py-4 px-2 transition-all active:scale-95"
                style={active ? { background: s.bg } : { background: 'white' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border-2 transition-all"
                  style={active
                    ? { background: 'white', borderColor: s.color + '60' }
                    : { background: '#F9FAFB', borderColor: '#F3F4F6' }}>
                  {s.icon}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold" style={{ color: active ? s.color : '#374151' }}>{s.label}</p>
                  <p className="text-[9px] text-ink-muted mt-0.5">{s.sub}</p>
                </div>
                {active && <div className="w-1 h-1 rounded-full" style={{ background: s.color }} />}
              </button>
            );
          })}
        </div>

        {/* Step 2 — Walk */}
        {selService === 'walk' && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-ink-secondary">
              We'll find a walker available on <strong>{format(selectedDate, 'MMMM d')}</strong>.
            </p>
            <Link to="/owner/request"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white"
              style={{ background: '#1B4332' }}>
              🦮 Find a Walker
            </Link>
          </div>
        )}

        {/* Step 2 — Vet: map + clinic list */}
        {selService === 'vet' && (
          <VetMapPicker selected={selClinic} onSelect={setSelClinic} />
        )}

        {/* Step 2 — Groom: available groomers */}
        {selService === 'groom' && (
          <div>
            <div className="px-4 py-3 border-b border-surface-border bg-surface-secondary/40">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Available Groomers</p>
            </div>
            {walkers.length === 0 ? (
              <p className="text-sm text-ink-muted px-4 py-4">No groomers available right now.</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {walkers.slice(0, 5).map((w, i) => {
                  const active = selGroomer === w.id;
                  const ratings = ['4.9', '5.0', '4.8', '4.9', '4.7'];
                  const initials = w.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button key={w.id} type="button"
                      onClick={() => setSelGroomer(w.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-all"
                      style={active ? { background: '#EFF6FF' } : {}}>
                      <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: active ? '#0891B2' : '#1B4332' }}>
                        {w.imageUrl
                          ? <img src={w.imageUrl} alt={w.name} className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">{w.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-ink-muted">{ratings[i % ratings.length]} · Professional groomer</span>
                        </div>
                      </div>
                      {active
                        ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#0891B2' }} />
                        : <div className="w-4 h-4 rounded-full border-2 border-surface-border shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Dog picker + Schedule Now (for vet/groom after provider selected) */}
        {(selService === 'vet' && selClinic !== null) ||
         (selService === 'groom' && selGroomer !== null)
          ? (
            <div className="p-4 space-y-3 border-t border-surface-border">
              {renderDogPicker()}
              {myDogs.length > 0 && (
                <button type="button" onClick={handleScheduleNow}
                  disabled={booking || selDogs.length === 0}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                  {booking
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Scheduling…</>
                    : <><Calendar className="w-4 h-4" /> Schedule Now{selDogs.length > 1 ? ` (${selDogs.length} pets)` : ''}</>}
                </button>
              )}
            </div>
          ) : null}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        <div>
          <h1 className="text-2xl font-extrabold text-ink">Schedule</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Pick a date to book a service</p>
        </div>

        {/* Calendar */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-ink">{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hover text-ink-secondary">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-surface-border">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-ink-muted py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 p-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="h-11" />;
              const walks   = walksForDay(day);
              const isSel   = selectedDate ? isSameDay(day, selectedDate) : false;
              const today   = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <button key={day.toISOString()}
                  onClick={() => setSelectedDate(isSel ? null : day)}
                  className={`relative h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all mx-0.5 my-0.5 ${
                    isSel     ? 'text-white shadow-sm'
                    : today   ? 'font-bold text-primary'
                    : inMonth ? 'text-ink hover:bg-surface-hover'
                    : 'text-ink-muted'
                  }`}
                  style={isSel ? { background: '#1B4332' } : today ? { background: '#EBF5EF' } : {}}>
                  <span className="text-xs font-semibold">{format(day, 'd')}</span>
                  {walks.length > 0 && (
                    <div className="flex gap-0.5">
                      {walks.slice(0, 3).map((w, j) => (
                        <div key={j} className={`w-1 h-1 rounded-full ${
                          isSel ? 'bg-white/70'
                          : isVetWalk(w.notes) ? 'bg-teal-500'
                          : isGroomWalk(w.notes) ? 'bg-blue-400'
                          : 'bg-primary'
                        }`} />
                      ))}
                    </div>
                  )}
                  {walks.length === 0 && <div className="w-1.5 h-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-surface-border">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-2 h-2 rounded-full bg-primary" />Walk
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-2 h-2 rounded-full bg-teal-500" />Vet
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-2 h-2 rounded-full bg-blue-400" />Groom
            </div>
          </div>
        </div>

        {/* Selected date */}
        {selectedDate && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            {selectedDayWalks.length > 0 && selectedDayWalks.map(renderWalkCard)}
            {renderBookingPanel()}
          </div>
        )}

        {/* No date selected — upcoming */}
        {!selectedDate && upcomingWalks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">All Upcoming</p>
            {upcomingWalks.slice(0, 15).map(renderWalkCard)}
          </div>
        )}

        {!selectedDate && upcomingWalks.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EBF5EF' }}>
              <Calendar className="w-8 h-8" style={{ color: '#1B4332' }} />
            </div>
            <p className="font-bold text-ink mb-1">No bookings yet</p>
            <p className="text-sm text-ink-muted">Tap a date on the calendar to get started</p>
          </div>
        )}
      </div>

      {notesWalk && !isVetWalk(notesWalk.notes) && (
        <NotesModal walk={notesWalk} onClose={() => setNotesWalk(null)} />
      )}
    </div>
  );
}
