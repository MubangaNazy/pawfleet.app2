import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Navigation, MessageCircle, Scissors, ChevronRight, Star } from 'lucide-react';
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
    img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=85',
    tag: 'Trusted walkers near you',
    headline: 'Book a walk in seconds',
    sub: 'Get started →',
  },
  {
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400&q=85',
    tag: 'Professional care',
    headline: 'Happy dogs, happy you',
    sub: 'Meet your walkers →',
  },
  {
    img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1400&q=85',
    tag: 'Live GPS tracking',
    headline: 'Follow every step live',
    sub: 'See how it works →',
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

  const quickActions = [
    { label: 'Walk',  icon: '🐾', to: '/owner/request' },
    { label: 'Groom', icon: '✂️', to: '/owner/services' },
    { label: 'Track', icon: '📍', to: nearestWalk ? `/owner/track/${nearestWalk.id}` : '/owner/history' },
    { label: 'Chat',  icon: '💬', to: nearestWalk ? `/owner/chat/${nearestWalk.id}` : '/owner/history' },
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
        <Link to="/owner/request" className="block relative overflow-hidden rounded-3xl" style={{ height: 230 }}>
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
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((a, idx) => (
              <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm hover:scale-105 transition-transform active:scale-95"
                  style={{ background: '#1B4332' }}>
                  <span>{a.icon}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <Link to="/owner/request"
                className="relative overflow-hidden rounded-3xl p-5 flex flex-col justify-between group hover:opacity-90 transition-opacity active:scale-95"
                style={{ height: 128, background: '#1B4332' }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(35%,-35%)' }} />
                <span className="text-2xl">🐾</span>
                <div>
                  <p className="text-white font-bold text-sm">Dog Walking</p>
                  <p className="text-white/70 text-xs">From K150 / walk</p>
                </div>
              </Link>

              <Link to="/owner/services"
                className="rounded-3xl p-5 flex flex-col justify-between border-2 border-surface-border hover:border-primary/30 transition-colors group active:scale-95"
                style={{ height: 128 }}>
                <Scissors className="w-6 h-6 text-ink-secondary group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-ink font-bold text-sm">Grooming</p>
                  <p className="text-ink-muted text-xs">From K350 / session</p>
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
