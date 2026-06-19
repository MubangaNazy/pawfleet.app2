import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Navigation, MessageCircle, ChevronRight, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// ── Scroll-reveal wrapper ────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); ob.disconnect(); } },
      { threshold: 0.05 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(22px)',
      }}
    >
      {children}
    </div>
  );
}

// ── Slideshow images ─────────────────────────────────────────
const SLIDES = [
  {
    img: '/images/pf-walk-man.png',
    tag: 'Trusted walkers in Lusaka',
    headline: 'Book a walk in seconds',
    sub: 'Get started →',
    to: '/owner/request',
  },
  {
    img: '/images/pf-walk-women.png',
    tag: 'Live GPS on every walk',
    headline: 'Follow every step, live',
    sub: 'See how tracking works →',
    to: '/owner/request',
  },
  {
    img: '/images/pf-groom-dog.png',
    tag: 'Premium grooming service',
    headline: 'Pamper your pet today',
    sub: 'Book a grooming →',
    to: '/owner/services',
  },
  {
    img: '/images/pf-vet.png',
    tag: '4 partner vet clinics in Lusaka',
    headline: 'Vet care, made easy',
    sub: 'Book a vet visit →',
    to: '/owner/vet-booking',
  },
  {
    img: '/images/pf-dogs-park.png',
    tag: 'Trusted by families in Lusaka',
    headline: 'Happy pets, happy you',
    sub: 'Meet your walkers →',
    to: '/owner/request',
  },
];

export default function OwnerDashboard() {
  const { data, currentUser } = useApp();

  const myWalks      = data.walks.filter(w => w.ownerId === currentUser?.id);
  const activeWalk   = myWalks.find(w => w.status === 'active');
  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const nearestWalk   = activeWalk || upcomingWalks[0];
  const nearestDog    = nearestWalk ? data.dogs.find(d => d.id === nearestWalk.dogId) : null;
  const nearestWalker = nearestWalk ? data.users.find(u => u.id === nearestWalk.walkerId) : null;

  const walkers = data.users.filter(u => u.role === 'walker').slice(0, 3);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const firstName = currentUser?.name.split(' ')[0] || 'there';

  const pendingGroomingWalks = myWalks.filter(
    w => (w.status === 'pending' || w.status === 'assigned') && w.notes?.startsWith('GROOMING:')
  );

  const activeGroomingWalks = myWalks.filter(
    w => (w.status === 'active' || w.status === 'assigned') && w.notes?.startsWith('GROOMING:')
  );
  const activeVetWalks = myWalks.filter(
    w => (w.status === 'active' || w.status === 'assigned') && w.notes?.startsWith('VET BOOKING:')
  );
  const unreadChatNotifications = data.notifications.filter(
    n => n.userId === currentUser?.id && !n.read && n.type.startsWith('walk')
  );

  const quickActions = [
    { label: 'Walk',  icon: '🦮', to: '/owner/request', badge: null as null | number | 'pulse-green' },
    { label: 'Groom', icon: '🛁', to: '/owner/services', badge: (pendingGroomingWalks.length > 0 ? 'pulse-green' : null) as null | number | 'pulse-green' },
    { label: 'Vet',   icon: '🩺', to: '/owner/vet-booking', badge: null as null | number | 'pulse-green' },
    { label: 'Track', icon: '📍', to: nearestWalk ? `/owner/track/${nearestWalk.id}` : '/owner/history', badge: (activeWalk ? 'pulse-green' : null) as null | number | 'pulse-green' },
    { label: 'Chat',  icon: '💬', to: '/owner/chats', badge: (unreadChatNotifications.length > 0 ? unreadChatNotifications.length : null) as null | number | 'pulse-green' },
  ];

  // Auto-rotating slideshow
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-sm text-ink-secondary">{greeting}</p>
          <h1 className="text-3xl font-extrabold text-ink mt-0.5">Hi, {firstName} 🐾</h1>
        </div>

        {/* ── Hero Slideshow ── */}
        <Link to={SLIDES[slide].to} className="block relative overflow-hidden rounded-3xl" style={{ height: 230 }}>
          {SLIDES.map((s, i) => (
            <img
              key={i}
              src={s.img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: slide === i ? 1 : 0,
                transition: 'opacity 0.8s ease',
              }}
            />
          ))}
          {/* Gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.08) 100%)' }} />

          {/* CTA text */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ transition: 'opacity 0.4s', opacity: 1 }}>
              {SLIDES[slide].tag}
            </p>
            <p className="text-white text-xl font-extrabold leading-tight">{SLIDES[slide].headline}</p>
            <p className="text-white/80 text-sm mt-1 font-medium">{SLIDES[slide].sub}</p>
          </div>

          {/* Dot indicators */}
          <div className="absolute top-4 right-4 flex gap-1.5 items-center">
            {SLIDES.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-400"
                style={{
                  width: slide === i ? 20 : 6,
                  height: 6,
                  background: slide === i ? 'white' : 'rgba(255,255,255,0.45)',
                }} />
            ))}
          </div>

          {/* PawFleet brand watermark */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
              <span className="text-sm">🐾</span>
            </div>
            <span className="text-white text-xs font-bold opacity-80">PawFleet</span>
          </div>
        </Link>

        {/* ── Quick Actions ── */}
        <Reveal delay={50}>
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm hover:scale-105 transition-transform active:scale-95"
                    style={{ background: '#1B4332' }}>
                    <span>{a.icon}</span>
                  </div>
                  {/* Badge: red number for Chat */}
                  {typeof a.badge === 'number' && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      {a.badge > 9 ? '9+' : a.badge}
                    </span>
                  )}
                  {/* Badge: green pulse dot for Groom / Track */}
                  {a.badge === 'pulse-green' && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
                  )}
                </div>
                <span className="text-xs font-semibold text-ink">{a.label}</span>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ── Upcoming Walk Card ── */}
        {nearestWalk && nearestWalker && (
          <Reveal delay={100}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-ink">Upcoming walk</h2>
                <Link to="/owner/history" className="text-sm text-ink-secondary hover:text-primary font-medium">See all</Link>
              </div>
              <div className="bg-white border border-surface-border rounded-3xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center shrink-0 border-2 border-primary/20">
                    {nearestWalker.imageUrl
                      ? <img src={nearestWalker.imageUrl} alt={nearestWalker.name} className="w-full h-full object-cover" />
                      : <span className="text-lg font-bold text-primary">{nearestWalker.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-ink">{nearestWalker.name}</p>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-ink-secondary">4.9</span>
                      </div>
                    </div>
                    <p className="text-xs text-ink-secondary mt-0.5">Professional walker</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-ink-muted">
                      <span>
                        {activeWalk
                          ? `Active now · started ${nearestWalk.startTime ? format(new Date(nearestWalk.startTime), 'h:mm a') : ''}`
                          : `${format(new Date(nearestWalk.scheduledDate), 'EEE, MMM d')} · ${format(new Date(nearestWalk.scheduledDate), 'h:mm a')}`}
                      </span>
                      {nearestDog && <><span>·</span><span>{nearestDog.name}</span></>}
                    </div>
                  </div>
                  {activeWalk && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success-light px-2 py-1 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/owner/track/${nearestWalk.id}`}
                    className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-2xl hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    <Navigation className="w-4 h-4" /> Live Track
                  </Link>
                  <Link to={`/owner/chat/${nearestWalk.id}`}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-ink-secondary hover:text-primary transition-colors py-2.5">
                    <MessageCircle className="w-4 h-4" /> Message
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Active Grooming Banner ── */}
        {activeGroomingWalks.length > 0 && (
          <Reveal delay={120}>
            <div className="rounded-3xl overflow-hidden border border-blue-200 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
              {activeGroomingWalks.map(w => {
                const dog   = data.dogs.find(d => d.id === w.dogId);
                const label = (w.notes ?? '').split('\n')[0].replace('GROOMING: ', '');
                const groomer = data.users.find(u => u.id === w.walkerId);
                return (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: '#0891B215' }}>✂️</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          {w.status === 'active' ? 'GROOMING ACTIVE' : 'GROOMING CONFIRMED'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-ink truncate">{label}</p>
                      <p className="text-xs text-ink-muted">
                        {dog?.name}{groomer ? ` · ${groomer.name}` : ''}
                      </p>
                    </div>
                    <Link to="/owner/schedule"
                      className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shrink-0"
                      style={{ background: '#0891B2' }}>
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* ── Active Vet Banner ── */}
        {activeVetWalks.length > 0 && (
          <Reveal delay={130}>
            <div className="rounded-3xl overflow-hidden border border-purple-200 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
              {activeVetWalks.map(w => {
                const dog      = data.dogs.find(d => d.id === w.dogId);
                const lines    = (w.notes ?? '').split('\n');
                const service  = lines[0].replace('VET BOOKING: ', '');
                const clinicLn = lines.find(l => l.startsWith('📍 Clinic:'));
                const clinic   = clinicLn ? clinicLn.replace('📍 Clinic: ', '') : null;
                return (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: '#7C3AED15' }}>🏥</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-purple-500 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          {w.status === 'active' ? 'AT THE VET' : 'VET VISIT CONFIRMED'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-ink truncate">{service}</p>
                      <p className="text-xs text-ink-muted">
                        {dog?.name}{clinic ? ` · ${clinic}` : ''}
                      </p>
                    </div>
                    <Link to="/owner/schedule"
                      className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shrink-0"
                      style={{ background: '#7C3AED' }}>
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {/* ── Top Walkers ── */}
        {walkers.length > 0 && (
          <Reveal delay={150}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-ink">Top walkers nearby</h2>
                <button className="text-sm font-medium flex items-center gap-0.5 hover:underline" style={{ color: '#2B8A50' }}>
                  View map
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {walkers.map((walker, i) => {
                  const ratings   = ['4.9', '5.0', '4.8'];
                  const distances = ['0.4 km', '0.8 km', '1.2 km'];
                  return (
                    <div key={walker.id} className="shrink-0 w-36">
                      <div className="w-36 h-28 rounded-2xl overflow-hidden bg-surface-secondary border border-surface-border mb-2 hover:scale-[1.02] transition-transform">
                        {walker.imageUrl
                          ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
                          : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                              <span className="text-3xl font-bold text-white">{walker.name[0]}</span>
                            </div>
                          )}
                      </div>
                      <p className="text-sm font-semibold text-ink truncate">{walker.name}</p>
                      <div className="flex items-center gap-1 text-xs text-ink-secondary">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{ratings[i]} · {distances[i]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Services ── */}
        <Reveal delay={200}>
          <div>
            <h2 className="text-base font-bold text-ink mb-3">Services</h2>
            <div className="grid grid-cols-3 gap-3">
              <Link to="/owner/request"
                className="relative overflow-hidden rounded-3xl p-4 flex flex-col justify-between group hover:opacity-90 transition-opacity active:scale-95"
                style={{ height: 120, background: '#1B4332' }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(35%,-35%)' }} />
                <span className="text-2xl">🦮</span>
                <div>
                  <p className="text-white font-bold text-xs">Dog Walking</p>
                  <p className="text-white/70 text-[10px]">From K150</p>
                </div>
              </Link>

              <Link to="/owner/services"
                className="relative overflow-hidden rounded-3xl p-4 flex flex-col justify-between group hover:opacity-90 transition-opacity active:scale-95"
                style={{ height: 120, background: '#2B8A50' }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(35%,-35%)' }} />
                <span className="text-2xl">🛁</span>
                <div>
                  <p className="text-white font-bold text-xs">Grooming</p>
                  <p className="text-white/70 text-[10px]">From K350</p>
                </div>
              </Link>

              <Link to="/owner/services"
                className="relative overflow-hidden rounded-3xl p-4 flex flex-col justify-between group hover:opacity-90 transition-opacity active:scale-95"
                style={{ height: 120, background: '#52B788' }}>
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(35%,-35%)' }} />
                <span className="text-2xl">🩺</span>
                <div>
                  <p className="text-white font-bold text-xs">Vetting</p>
                  <p className="text-white/70 text-[10px]">Book a vet visit</p>
                </div>
              </Link>
            </div>

            <Link to="/owner/shop"
              className="mt-3 flex items-center gap-3 p-4 rounded-2xl bg-surface-secondary hover:bg-surface-hover transition-colors border border-surface-border active:scale-[0.98]">
              <span className="text-xl">🛒</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">Shop treats & gear</p>
                <p className="text-xs text-ink-muted">Hand-picked goodies for your pup</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </Link>
          </div>
        </Reveal>

      </div>
    </div>
  );
}
