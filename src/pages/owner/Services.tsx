import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors, PawPrint, Star, ChevronDown, ChevronUp,
  CheckCircle, Clock, Shield, Heart, Sparkles, Phone,
  MapPin, ChevronLeft, ChevronRight, CalendarDays, Zap, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

/* ── Slideshow images ── */
const SLIDES = [
  {
    url: '/images/pf-groom-dog.png',
    label: 'Professional dog grooming at your door',
  },
  {
    url: '/images/pf-groom-cats.png',
    label: 'Expert cat grooming & spa',
  },
  {
    url: '/images/pf-walk-man.png',
    label: 'Trusted walkers near you',
  },
  {
    url: '/images/pf-walk-women.png',
    label: 'Professional walkers, every step',
  },
  {
    url: '/images/pf-dogs-park.png',
    label: 'Happy, healthy, loved pets',
  },
];

/* ── Grooming service cards ── */
const GROOM_SERVICES = [
  {
    tag: 'Best Value',
    tagColor: '#2B8A50',
    img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80',
    icon: '📋',
    title: 'Build a Grooming Plan',
    subtitle: 'Monthly or twice-a-month recurring sessions',
    price: 'from ZMW 199',
    cta: 'View Plans',
  },
  {
    tag: null,
    img: 'https://images.unsplash.com/photo-1597633544156-0a5e9d7a1285?w=600&q=80',
    icon: '🛁',
    title: 'Single Bath & Brush',
    subtitle: 'One-time, no commitment needed',
    price: 'ZMW 249',
    cta: 'Book Now',
  },
  {
    tag: 'Most Popular',
    tagColor: '#1B4332',
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&q=80',
    icon: '💅',
    title: 'Full Groom Package',
    subtitle: 'Bath, trim, nail clip, ear clean + more',
    price: 'ZMW 399',
    cta: 'Book Now',
  },
];

/* ── Walking plans ── */
const WALK_SERVICES = [
  {
    tag: 'Great for first-timers!',
    tagColor: '#2B8A50',
    img: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600&q=80',
    icon: '🦮',
    title: 'Single 40 Min Walk',
    subtitle: 'One-time walk, no commitment',
    price: 'ZMW 150',
    cta: 'Try Now',
  },
  {
    tag: null,
    img: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&q=80',
    icon: '⚡',
    title: '20 Min Walk Plans',
    subtitle: 'Quick daily exercise sessions',
    price: 'from ZMW 103 / walk',
    cta: 'View Options',
  },
  {
    tag: 'Bestseller',
    tagColor: '#1B4332',
    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
    icon: '🌳',
    title: '40 Min Walk Plans',
    subtitle: 'Most popular — full neighbourhood walk',
    price: 'from ZMW 120 / walk',
    cta: 'View Options',
  },
];

/* ── Reviews ── */
const REVIEWS = [
  { name: 'Chanda M., Lusaka',  text: 'PawFleet has been a lifesaver. My walker is always on time and sends me photos during the walk. Max loves it!', rating: 5 },
  { name: 'Bwalya K., Ndola',   text: 'The groomer was so gentle with my anxious golden. She was spotless and relaxed after. Worth every kwacha.',    rating: 5 },
  { name: 'Mutale C., Kitwe',   text: 'Booked the monthly grooming plan and I have not looked back. Professional, punctual, and my dog smells amazing.', rating: 5 },
];

/* ── FAQ data ── */
const GROOM_FAQS = [
  { q: 'What grooming services do you offer?', a: 'We offer full grooming packages including bath, blow-dry, haircut, nail trim, ear cleaning, and teeth brushing. You can book one-off sessions or recurring plans.' },
  { q: 'How often should I schedule grooming?', a: 'Most breeds benefit from grooming every 4–6 weeks. Long-haired breeds may need it more frequently. Our groomers will advise based on your dog.' },
  { q: 'Can I stay with my pet during grooming?', a: 'Yes — our grooming is done at your home, so you can be present the whole time. This keeps your dog calm and comfortable.' },
  { q: 'What products do you use?', a: 'We use premium, pet-safe, hypoallergenic shampoos and conditioners. All products are free from harsh chemicals and safe for all coat types.' },
];

const WALK_FAQS = [
  { q: "What if my dog doesn't go with the walker?", a: 'Our walkers are trained to build trust with shy or hesitant dogs. The first session includes a 10-minute meet-and-greet before the walk begins.' },
  { q: 'What if my dog is reactive or pulls the leash?', a: 'Our walkers are experienced handling all temperaments. Just mention it in your special instructions when booking and we will match you with the right walker.' },
  { q: 'How can I identify the PawFleet walker?', a: 'All PawFleet walkers wear a branded vest and carry an ID card. You can also verify their photo via the app before they arrive.' },
  { q: "Where can I track my dog's walk?", a: 'Once the walker starts the session, you can track your dog live on the map from your dashboard. You get notified when the walk begins and ends.' },
];

/* ── Subcomponents ── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-border last:border-0">
      <button className="w-full flex items-start justify-between gap-3 py-4 text-left"
        onClick={() => setOpen(o => !o)}>
        <span className="text-sm font-medium text-ink leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />}
      </button>
      {open && <p className="text-sm text-ink-secondary pb-4 pr-6 leading-relaxed">{a}</p>}
    </div>
  );
}

function Slideshow() {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    timer.current = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 3500);
  };
  useEffect(() => { start(); return () => { if (timer.current) clearInterval(timer.current); }; }, []);

  const go = (dir: 1 | -1) => {
    if (timer.current) clearInterval(timer.current);
    setIdx(i => (i + dir + SLIDES.length) % SLIDES.length);
    start();
  };

  return (
    <div className="relative w-full h-52 overflow-hidden rounded-none">
      {SLIDES.map((s, i) => (
        <div key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}>
          <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <p className="absolute bottom-10 left-4 right-4 text-white font-bold text-base drop-shadow">
            {s.label}
          </p>
        </div>
      ))}

      {/* Arrows */}
      <button onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => { if (timer.current) clearInterval(timer.current); setIdx(i); start(); }}
            className="transition-all rounded-full"
            style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? 'white' : 'rgba(255,255,255,0.45)' }} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ svc, onBook }: { svc: typeof GROOM_SERVICES[0]; onBook: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-surface-border bg-white shadow-sm">
      {/* Image */}
      <div className="relative h-36 w-full">
        <img src={svc.img} alt={svc.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {svc.tag && (
          <span className="absolute top-3 left-3 text-[10px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ background: svc.tagColor }}>
            {svc.tag}
          </span>
        )}
        <span className="absolute top-3 right-3 text-2xl">{svc.icon}</span>
      </div>
      {/* Content */}
      <div className="p-4 flex items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm leading-snug">{svc.title}</p>
          <p className="text-xs text-ink-muted mt-0.5">{svc.subtitle}</p>
          <p className="text-sm font-bold mt-2" style={{ color: '#2B8A50' }}>{svc.price}</p>
        </div>
        <button onClick={onBook}
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {svc.cta}
        </button>
      </div>
    </div>
  );
}

function HowItWorks({ steps }: { steps: { icon: React.ReactNode; title: string; desc: string }[] }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-100" style={{ background: '#F0FAF4' }}>
      <div className="px-5 pt-5 pb-2">
        <p className="text-base font-bold text-ink mb-5">How It Works</p>
        <div className="space-y-0">
          {steps.map(({ icon, title, desc }, i) => (
            <div key={title} className="flex gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                  {icon}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 flex-1 my-1.5" style={{ background: 'repeating-linear-gradient(to bottom, #2B8A50 0px, #2B8A50 4px, transparent 4px, transparent 8px)' }} />
                )}
              </div>
              {/* Text */}
              <div className={`flex-1 pb-5 ${i < steps.length - 1 ? '' : ''}`}>
                <p className="font-bold text-ink text-sm leading-snug">{title}</p>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Grooming Booking Modal ── */
interface BookingModalProps {
  service: typeof GROOM_SERVICES[0];
  onClose: () => void;
}
function GroomingBookingModal({ service, onClose }: BookingModalProps) {
  const { data, currentUser } = useApp();
  const ownerDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const today = new Date().toISOString().split('T')[0];

  const [selectedDog, setSelectedDog] = useState(ownerDogs[0]?.id ?? '');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [addWalk, setAddWalk] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDog || !bookingDate || !currentUser) return;
    setSubmitting(true);
    const serviceLabel = `GROOMING: ${service.title}${addWalk ? ' + Walk' : ''}`;
    const scheduled = `${bookingDate}T${bookingTime}:00`;
    await supabase.from('walks').insert({
      id: crypto.randomUUID(),
      dog_id: selectedDog,
      owner_id: currentUser.id,
      walker_id: null,
      status: 'pending',
      scheduled_date: scheduled,
      notes: notes ? `${serviceLabel}\n${notes}` : serviceLabel,
      price: 0,
      walker_earning: 0,
      duration: addWalk ? 100 : 60,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle + header */}
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-base font-extrabold text-ink">{service.title}</p>
            <p className="text-sm text-ink-muted">{service.price}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl" style={{ background: '#EBF5EF' }}>✅</div>
            <div>
              <p className="font-bold text-ink text-base mb-1">Booking Received!</p>
              <p className="text-sm text-ink-muted">We'll confirm your grooming appointment shortly.</p>
            </div>
            <button type="button" onClick={onClose}
              className="px-8 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dog selection */}
            {ownerDogs.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Select Dog</label>
                <div className="flex gap-2 flex-wrap">
                  {ownerDogs.map(dog => (
                    <button key={dog.id} type="button"
                      onClick={() => setSelectedDog(dog.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedDog === dog.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                      }`}>
                      {dog.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-6 h-6 rounded-full object-cover" />
                        : <span className="text-base">🐶</span>}
                      {dog.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
                Add a dog in your profile first before booking.
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Date</label>
              <input type="date" min={today} value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary bg-white" />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Preferred Time</label>
              <div className="flex gap-2 flex-wrap">
                {['08:00','09:00','10:00','11:00','14:00','15:00','16:00'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setBookingTime(t)}
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

            {/* Add walk toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-surface-border bg-surface-secondary">
              <div className="flex items-center gap-3">
                <span className="text-xl">🦮</span>
                <div>
                  <p className="text-sm font-bold text-ink">Add a Walk</p>
                  <p className="text-xs text-ink-muted">Combine with a 40-min walk session</p>
                </div>
              </div>
              <button type="button" onClick={() => setAddWalk(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative ${addWalk ? 'bg-primary' : 'bg-surface-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${addWalk ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Special Instructions (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Any allergies, coat type, or other notes…"
                className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none" />
            </div>

            <button type="button" onClick={handleSubmit}
              disabled={!selectedDog || !bookingDate || submitting || ownerDogs.length === 0}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {submitting
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Booking…</>
                : <><Scissors className="w-4 h-4" /> Book Grooming{addWalk ? ' + Walk' : ''}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function Services() {
  const navigate = useNavigate();
  const { data, currentUser } = useApp();
  const [tab, setTab] = useState<'grooming' | 'walking'>('grooming');
  const [bookingService, setBookingService] = useState<typeof GROOM_SERVICES[0] | null>(null);

  const activeGroomings = data.walks.filter(w =>
    w.ownerId === currentUser?.id &&
    w.notes?.startsWith('GROOMING:') &&
    (w.status === 'active' || w.status === 'assigned')
  );

  const groomSteps = [
    { icon: <Scissors className="w-5 h-5" />, title: 'Choose a service', desc: 'Pick a one-time groom or a recurring plan — monthly or twice a month.' },
    { icon: <CalendarDays className="w-5 h-5" />, title: 'Set your schedule', desc: 'Pick a date and time that works for you. We come to your door — no drop-offs.' },
    { icon: <CheckCircle className="w-5 h-5" />, title: 'Confirm your booking', desc: "Book your slot and get an instant confirmation with your groomer's details." },
    { icon: <Heart className="w-5 h-5" />, title: 'Your groomer arrives', desc: 'A trusted PawFleet groomer shows up right on schedule. You can be there the whole time.' },
  ];

  const walkSteps = [
    { icon: <CalendarDays className="w-5 h-5" />, title: 'Schedule your walk', desc: 'Set the date, time, and duration — one-time or recurring, we\'re flexible.' },
    { icon: <Zap className="w-5 h-5" />, title: 'Meet your walker', desc: 'A friendly, trained walker arrives at your doorstep on time, ready to go.' },
    { icon: <MapPin className="w-5 h-5" />, title: 'Track in real-time', desc: 'Follow along live on the map. Get notified when the walk begins and ends.' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-28 lg:pb-8 bg-white min-h-screen">

      {/* Active Grooming Banner */}
      {activeGroomings.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-blue-200"
          style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
          {activeGroomings.map(w => {
            const dog = data.dogs.find(d => d.id === w.dogId);
            const label = (w.notes ?? '').split('\n')[0].replace('GROOMING: ', '');
            return (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: '#0891B220' }}>✂️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {w.status === 'active' ? 'ACTIVE' : 'CONFIRMED'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink mt-0.5">{label}</p>
                  {dog && <p className="text-xs text-ink-muted">For {dog.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-surface-border px-4 pt-4 pb-3">
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-secondary rounded-xl">
          <button onClick={() => setTab('grooming')}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === 'grooming' ? 'bg-white shadow-sm text-primary' : 'text-ink-muted hover:text-ink'
            }`}>
            <Scissors className="w-3.5 h-3.5" /> Grooming
          </button>
          <button onClick={() => setTab('walking')}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === 'walking' ? 'bg-white shadow-sm text-primary' : 'text-ink-muted hover:text-ink'
            }`}>
            <PawPrint className="w-3.5 h-3.5" /> Walking
          </button>
          <button onClick={() => navigate('/owner/vet-booking')}
            className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all text-ink-muted hover:text-ink hover:bg-white">
            <Heart className="w-3.5 h-3.5" /> Vet Care
          </button>
        </div>
      </div>

      {tab === 'grooming' ? (
        <>
          {/* Slideshow */}
          <Slideshow />

          {/* Intro */}
          <div className="px-4 pt-5 pb-1">
            <div className="flex items-center gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              <span className="text-xs text-ink-muted ml-1 font-medium">4.90 · 1,000+ sessions</span>
            </div>
            <h2 className="text-xl font-extrabold text-ink">Grooming Services</h2>
            <p className="text-sm text-ink-secondary mt-1">At-home grooming — no stress, no travel. Your dog stays clean, healthy, and happy.</p>
          </div>

          {/* Service cards */}
          <div className="px-4 pt-4 space-y-3">
            <p className="text-sm font-bold text-ink-muted uppercase tracking-wider">Choose a Service</p>
            {GROOM_SERVICES.map(svc => (
              <ServiceCard key={svc.title} svc={svc} onBook={() => setBookingService(svc)} />
            ))}
          </div>

          {/* How It Works */}
          <div className="px-4 pt-6">
            <HowItWorks steps={groomSteps} />
          </div>

          {/* Why Choose */}
          <div className="px-4 pt-6">
            <p className="text-base font-bold text-ink mb-4">Why Choose PawFleet?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Heart,    title: 'At-home comfort',    desc: "Your dog stays in a space they know and love." },
                { icon: Sparkles, title: 'We clean up after',  desc: "No mess, no fuss. We tidy up when done." },
                { icon: Clock,    title: 'Flexible scheduling', desc: "Book sessions when you need them." },
                { icon: Phone,    title: 'Support 9am–7pm',    desc: "We're just a message away, all day." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-surface-secondary rounded-2xl p-4 border border-surface-border">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mb-2 shadow-sm">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-ink">{title}</p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="px-4 pt-6">
            <div className="flex items-center gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-bold text-ink mb-4">12,000+ five-star reviews!</p>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
              {REVIEWS.map(r => (
                <div key={r.name} className="snap-start shrink-0 w-72 bg-white border border-surface-border rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-0.5 mb-2">
                    {Array(r.rating).fill(0).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed mb-3">"{r.text}"</p>
                  <p className="text-xs font-bold text-ink">— {r.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="px-4 pt-6">
            <p className="text-base font-bold text-ink mb-3">Frequently Asked Questions</p>
            <div className="bg-white border border-surface-border rounded-2xl px-4">
              {GROOM_FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pt-6">
            <div className="rounded-2xl p-5 text-center border border-emerald-100" style={{ background: '#F0FAF4' }}>
              <p className="text-base font-bold text-ink mb-1">Ready for a fresh, clean pup?</p>
              <p className="text-sm text-ink-secondary mb-4">Book your first grooming session today</p>
              <button onClick={() => setBookingService(GROOM_SERVICES[2])}
                className="px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                <Scissors className="w-4 h-4 inline mr-2" />
                Book Grooming
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Walking hero */}
          <div className="relative h-52 w-full overflow-hidden">
            <img src="https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80"
              alt="Dog walking" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-300 text-amber-300" />)}
                <span className="text-white/80 text-xs ml-1">4.95 · 500+ owners</span>
              </div>
              <p className="text-white font-extrabold text-lg">Walking Plans</p>
            </div>
          </div>

          {/* Intro */}
          <div className="px-4 pt-4 pb-1">
            <p className="text-sm text-ink-secondary">Reliable daily walks, GPS-tracked every step, by trusted walkers.</p>
          </div>

          {/* Walk service cards */}
          <div className="px-4 pt-4 space-y-3">
            <p className="text-sm font-bold text-ink-muted uppercase tracking-wider">Choose a Plan</p>
            {WALK_SERVICES.map(svc => (
              <ServiceCard key={svc.title} svc={svc} onBook={() => navigate('/owner/request')} />
            ))}
          </div>

          {/* How It Works */}
          <div className="px-4 pt-6">
            <HowItWorks steps={walkSteps} />
          </div>

          {/* Feature grid */}
          <div className="px-4 pt-6">
            <p className="text-base font-bold text-ink mb-4">What you get</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MapPin,      title: 'Live GPS',        desc: "Track your dog's exact route in real time" },
                { icon: Shield,      title: 'Vetted Walkers',  desc: 'Background-checked and trained' },
                { icon: Clock,       title: 'Flexible Times',  desc: 'Morning, afternoon, or evening walks' },
                { icon: CheckCircle, title: 'Walk Reports',    desc: 'Photo updates after every session' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-surface-secondary border border-surface-border rounded-2xl p-4">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-ink">{title}</p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="px-4 pt-6">
            <div className="flex items-center gap-1 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-bold text-ink mb-4">12,000+ five-star reviews!</p>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
              {REVIEWS.map(r => (
                <div key={r.name} className="snap-start shrink-0 w-72 bg-white border border-surface-border rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-0.5 mb-2">
                    {Array(r.rating).fill(0).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed mb-3">"{r.text}"</p>
                  <p className="text-xs font-bold text-ink">— {r.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="px-4 pt-6">
            <p className="text-base font-bold text-ink mb-3">Frequently Asked Questions</p>
            <div className="bg-white border border-surface-border rounded-2xl px-4">
              {WALK_FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pt-6">
            <div className="rounded-2xl p-5 text-center border border-emerald-100" style={{ background: '#F0FAF4' }}>
              <p className="text-base font-bold text-ink mb-1">Ready to book your first walk?</p>
              <p className="text-sm text-ink-secondary mb-4">Takes less than 30 seconds</p>
              <button onClick={() => navigate('/owner/request')}
                className="px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                <PawPrint className="w-4 h-4 inline mr-2" />
                Book a Walk
              </button>
            </div>
          </div>
        </>
      )}

      {/* Grooming Booking Modal */}
      {bookingService && (
        <GroomingBookingModal service={bookingService} onClose={() => setBookingService(null)} />
      )}
    </div>
  );
}
