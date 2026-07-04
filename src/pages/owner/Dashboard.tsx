import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Navigation, MessageCircle, ChevronRight, Star, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Onboarding from '../../components/ui/Onboarding';

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
  const navigate = useNavigate();

  const myWalks      = data.walks.filter(w => w.ownerId === currentUser?.id);
  const activeWalk   = myWalks.find(w => w.status === 'active');
  const upcomingWalks = myWalks
    .filter(w => w.status === 'assigned' || w.status === 'pending')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const nearestWalk   = activeWalk || upcomingWalks[0];
  const nearestDog    = nearestWalk ? data.dogs.find(d => d.id === nearestWalk.dogId) : null;
  const nearestWalker = nearestWalk ? data.users.find(u => u.id === nearestWalk.walkerId) : null;

  const walkers = data.users.filter(u => u.role === 'walker').slice(0, 3);
  const myDogs  = data.dogs.filter(d => d.ownerId === currentUser?.id);

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
    <div className="bg-white min-h-screen pb-28">
      {currentUser && <Onboarding userId={currentUser.id} role="owner" />}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-sm font-medium" style={{ color: '#52B788' }}>{greeting}</p>
          <h1 className="mt-0.5 flex items-center gap-2 flex-wrap">
            <span
              className="text-3xl font-black italic tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 50%, #52B788 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'fadeSlideIn 0.6s ease both',
              }}
            >
              Hi, {firstName}
            </span>
            <span
              className="text-3xl"
              style={{ animation: 'pawBounce 1.2s ease 0.5s both' }}
            >
              🐾
            </span>
          </h1>
          <style>{`
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes pawBounce {
              0%   { opacity: 0; transform: scale(0.4) rotate(-20deg); }
              60%  { transform: scale(1.25) rotate(8deg); }
              80%  { transform: scale(0.92) rotate(-4deg); }
              100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
          `}</style>
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
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">
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
            <img src="/logo.png" alt="PawFleet" className="w-6 h-6 rounded-full object-cover opacity-90 drop-shadow" />
            <span className="text-xs font-bold drop-shadow" style={{ color: '#52B788', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>PawFleet</span>
          </div>
        </Link>

        {/* ── Quick Actions ── */}
        <Reveal delay={50}>
          <div className="grid grid-cols-5 gap-1">
            {quickActions.map((a) => (
              <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(145deg, #1B4332, #2B8A50)',
                      boxShadow: '0 4px 12px rgba(27,67,50,0.28)',
                    }}
                  >
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
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-ink">{a.label}</span>
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
              <div className="bg-white rounded-3xl p-5"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-3.5 mb-4">
                  {/* Walker avatar — larger */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-50 flex items-center justify-center shrink-0"
                    style={{ border: '2px solid rgba(43,138,80,0.2)' }}>
                    {nearestWalker.imageUrl
                      ? <img src={nearestWalker.imageUrl} alt={nearestWalker.name} className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                          <span className="text-xl font-bold text-white">{nearestWalker.name[0]}</span>
                        </div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-ink text-[15px]">{nearestWalker.name}</p>
                      <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-600">4.9</span>
                      </div>
                    </div>
                    <p className="text-xs text-ink-secondary mt-0.5">Professional walker</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-ink-muted">
                      <span>
                        {activeWalk
                          ? `Active now · started ${nearestWalk.startTime ? format(new Date(nearestWalk.startTime), 'h:mm a') : ''}`
                          : `${format(new Date(nearestWalk.scheduledDate), 'EEE, MMM d')} · ${format(new Date(nearestWalk.scheduledDate), 'h:mm a')}`}
                      </span>
                      {nearestDog && <><span>·</span><span className="font-semibold text-ink">{nearestDog.name}</span></>}
                    </div>
                  </div>
                  {activeWalk && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success-light px-2.5 py-1 rounded-full shrink-0 border border-success/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/owner/track/${nearestWalk.id}`}
                    className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-2xl hover:opacity-90 transition-opacity active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    <Navigation className="w-4 h-4" /> Live Track
                  </Link>
                  <Link to={`/owner/chat/${nearestWalk.id}`}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-ink-secondary border-2 border-surface-border hover:border-primary/30 hover:text-primary transition-colors py-3 rounded-2xl">
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
            <div className="rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE', boxShadow: '0 2px 12px rgba(14,116,144,0.1)' }}>
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
            <div className="rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE', boxShadow: '0 2px 12px rgba(124,58,237,0.1)' }}>
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
                <button onClick={() => navigate('/owner/walker-map')} className="text-sm font-medium flex items-center gap-0.5 hover:underline" style={{ color: '#2B8A50' }}>
                  View map
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {walkers.map((walker, i) => {
                  const ratings   = ['4.9', '5.0', '4.8'];
                  const distances = ['0.4 km', '0.8 km', '1.2 km'];
                  return (
                    <div key={walker.id} className="shrink-0 w-36 active:scale-95 transition-transform">
                      {/* Image card */}
                      <div className="relative w-36 h-32 rounded-2xl overflow-hidden mb-2.5"
                        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                        {walker.imageUrl
                          ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
                          : (
                            <div className="w-full h-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                              <span className="text-3xl font-bold text-white">{walker.name[0]}</span>
                            </div>
                          )}
                        {/* Distance pill — top right corner */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                          {distances[i]}
                        </div>
                        {/* Rating pill — bottom left */}
                        <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold text-white">{ratings[i]}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-ink truncate px-0.5">{walker.name}</p>
                      <p className="text-xs text-ink-muted px-0.5 mt-0.5">Professional walker</p>
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

            {/* 3-column service cards — image-forward with CTA */}
            <div className="grid grid-cols-3 gap-3">
              {/* Dog Walking */}
              <Link to="/owner/request"
                className="relative overflow-hidden rounded-2xl flex flex-col justify-between active:scale-95 transition-transform"
                style={{ background: '#1B4332', boxShadow: '0 4px 14px rgba(27,67,50,0.25)', minHeight: 130 }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(40%,-40%)' }} />
                <div className="p-3.5">
                  <span className="text-2xl">🦮</span>
                  <p className="text-white font-bold text-xs mt-2 leading-tight">Dog Walking</p>
                </div>
                <div className="px-3.5 pb-3 flex items-center justify-end">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </Link>

              {/* Grooming */}
              <Link to="/owner/services"
                className="relative overflow-hidden rounded-2xl flex flex-col justify-between active:scale-95 transition-transform"
                style={{ background: '#2B8A50', boxShadow: '0 4px 14px rgba(43,138,80,0.25)', minHeight: 130 }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(40%,-40%)' }} />
                <div className="p-3.5">
                  <span className="text-2xl">🛁</span>
                  <p className="text-white font-bold text-xs mt-2 leading-tight">Grooming</p>
                </div>
                <div className="px-3.5 pb-3 flex items-center justify-end">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </Link>

              {/* Vetting */}
              <Link to="/owner/services"
                className="relative overflow-hidden rounded-2xl flex flex-col justify-between active:scale-95 transition-transform"
                style={{ background: '#52B788', boxShadow: '0 4px 14px rgba(82,183,136,0.3)', minHeight: 130 }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(40%,-40%)' }} />
                <div className="p-3.5">
                  <span className="text-2xl">🩺</span>
                  <p className="text-white font-bold text-xs mt-2 leading-tight">Vetting</p>
                </div>
                <div className="px-3.5 pb-3 flex items-center justify-end">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Shop CTA — elevated card */}
            <Link to="/owner/shop"
              className="mt-3 flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                style={{ background: '#EBF5EF' }}>
                🛒
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Shop treats & gear</p>
                <p className="text-xs text-ink-muted mt-0.5">Hand-picked goodies for your pup</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />
            </Link>

            {/* Community CTA */}
            <Link to="/owner/community"
              className="mt-3 flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 4px 16px rgba(27,67,50,0.28)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">PawFleet Community</p>
                <p className="text-xs text-white/70 mt-0.5">Connect with pet owners in Zambia</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />
            </Link>
          </div>
        </Reveal>

        {/* ── Pet Care Reminders ── */}
        {myDogs.length > 0 && (
          <Reveal delay={250}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-ink">Pet Care</h2>
                <Link to="/owner/dogs" className="text-sm font-medium" style={{ color: '#2B8A50' }}>
                  All pets →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {myDogs.map(dog => {
                  const lastGroom = [...myWalks]
                    .filter(w => w.dogId === dog.id && w.status === 'completed' &&
                      (w.notes?.includes('GROOMING') || w.notes?.includes('HOME_GROOMING')))
                    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
                  const daysSince = lastGroom
                    ? Math.floor((Date.now() - new Date(lastGroom.scheduledDate).getTime()) / 86400000)
                    : null;
                  const daysUntil = daysSince !== null ? Math.max(0, 30 - daysSince) : null;
                  const groomDue = daysUntil !== null && daysUntil <= 7;

                  return (
                    <div key={dog.id} className="shrink-0 w-44 bg-white rounded-2xl p-3.5 border border-[#DDE9E2]"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#EBF5EF] shrink-0">
                          {dog.imageUrl
                            ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg">{dog.animalType === 'cat' ? '🐈' : '🐕'}</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-ink text-sm truncate">{dog.name}</p>
                          {dog.breed && <p className="text-[10px] text-ink-muted truncate">{dog.breed}</p>}
                        </div>
                      </div>

                      <div className={`rounded-xl p-2.5 mb-2.5 ${groomDue ? 'bg-amber-50' : 'bg-[#F4F9F6]'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs">✂️</span>
                          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Grooming</p>
                        </div>
                        {daysUntil !== null ? (
                          <p className={`text-xs font-bold ${groomDue ? 'text-amber-600' : 'text-ink'}`}>
                            {daysUntil === 0 ? 'Due today!' : `Due in ${daysUntil} days`}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-muted">Not yet booked</p>
                        )}
                      </div>

                      <Link to="/owner/services"
                        className="flex items-center justify-center gap-1 w-full py-1.5 rounded-xl text-[10px] font-bold text-white transition-all active:scale-95"
                        style={{ background: groomDue ? 'linear-gradient(135deg,#D97706,#F59E0B)' : 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                        {groomDue ? '⚠️ Book Grooming' : '+ Schedule'}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}

      </div>
    </div>
  );
}
