import { useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Star, Shield, Clock, ChevronRight } from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';

const HERO_IMG = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80';
const DOG1 = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80';
const DOG2 = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80';
const WALKER1 = 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80';
const WALKER2 = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80';
const WALKER3 = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80';

const FEATURES = [
  { icon: MapPin, title: 'Live GPS Tracking', desc: 'Watch every step of your dog\'s walk in real time on an interactive map.' },
  { icon: MessageCircle, title: 'In-Walk Chat', desc: 'Message your walker directly during any walk — photos, updates, anything.' },
  { icon: Star, title: 'Verified Walkers', desc: 'Every PawFleet walker is background-checked and rated by real owners.' },
  { icon: Shield, title: 'Walk Insurance', desc: 'All walks are covered. Your dog is in safe, protected hands every time.' },
  { icon: Clock, title: 'Instant Booking', desc: 'Book a same-day walk in under 60 seconds — no phone calls needed.' },
  { icon: ChevronRight, title: 'ZMW Pricing', desc: 'Fair local pricing in Zambian Kwacha with transparent, no-hidden-fee rates.' },
];

const STEPS = [
  { n: '01', title: 'Create your profile', desc: 'Add your dog\'s name, breed, age, and any special care instructions in minutes.' },
  { n: '02', title: 'Pick a walker', desc: 'Browse walkers near you. Check their ratings, bio, and price per walk.' },
  { n: '03', title: 'Track & relax', desc: 'Watch the live map while your dog gets a great walk. Rate when done.' },
];

const WALKERS = [
  { name: 'Chanda M.', rating: 4.9, walks: 142, img: WALKER1 },
  { name: 'Mwape K.', rating: 4.8, walks: 98, img: WALKER2 },
  { name: 'Bupe N.', rating: 5.0, walks: 73, img: WALKER3 },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <PawFleetLogo size={32} />
            <span className="text-base font-bold text-ink">PawFleet</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-ink-secondary hover:text-ink transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-white px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#1B4332' }}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1B4332 0%, #2B8A50 50%, #52B788 100%)' }}>
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-0 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-white text-center lg:text-left pb-10 lg:pb-16">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Now live in Lusaka 🇿🇲
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
              Dog walking you<br />can actually trust
            </h1>
            <p className="text-white/85 text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Book vetted walkers, track every step live, and chat in real time — all in one app built for Zambia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-white font-bold px-6 py-3.5 rounded-2xl text-sm transition-all active:scale-95 shadow-lg"
                style={{ color: '#1B4332' }}
              >
                🐾 Get started free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-white/15 backdrop-blur text-white font-semibold px-6 py-3.5 rounded-2xl text-sm border border-white/30 hover:bg-white/25 transition-all"
              >
                Sign in to your account
              </button>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {[DOG1, DOG2, WALKER1].map((img, i) => (
                  <img key={i} src={img} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <div className="text-sm text-white/90">
                <span className="font-bold">500+</span> happy dogs walked
              </div>
            </div>
          </div>

          {/* Hero phone mockup */}
          <div className="flex-shrink-0 w-64 lg:w-72 lg:self-end">
            <div className="rounded-t-3xl overflow-hidden shadow-2xl border-4 border-white/30">
              <img src={HERO_IMG} alt="Dog walking" className="w-full h-80 object-cover" />
              <div className="bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                    <img src={WALKER1} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-ink">Chanda is walking Max</p>
                    <p className="text-[10px] text-ink-muted">2.1 km · 28 mins</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-success px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="h-24 rounded-xl overflow-hidden bg-surface-secondary flex items-center justify-center">
                  <span className="text-2xl">🗺️</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="bg-surface-secondary border-b border-surface-border">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-surface-border px-5">
          {[
            { n: '500+', label: 'Walks completed' },
            { n: '4.9★', label: 'Average rating' },
            { n: '25+', label: 'Verified walkers' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-6 gap-1">
              <span className="text-2xl font-extrabold" style={{ color: '#1B4332' }}>{s.n}</span>
              <span className="text-xs text-ink-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-ink mb-3">Everything you need in one app</h2>
          <p className="text-ink-muted max-w-md mx-auto text-sm">From booking to tracking to chatting — PawFleet covers it all, designed for Zambian dog owners.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-surface-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#EBF5EF' }}>
                <Icon className="w-5 h-5" style={{ color: '#2B8A50' }} />
              </div>
              <p className="text-sm font-bold text-ink mb-1">{title}</p>
              <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" style={{ background: '#EBF5EF' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-ink mb-3">How PawFleet works</h2>
            <p className="text-ink-muted text-sm max-w-sm mx-auto">Get your dog walking in three easy steps</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {STEPS.map(step => (
              <div key={step.n} className="flex gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
                  style={{ background: '#1B4332' }}
                >
                  {step.n}
                </div>
                <div>
                  <p className="font-bold text-ink mb-1">{step.title}</p>
                  <p className="text-sm text-ink-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Walkers */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-ink mb-3">Meet our top walkers</h2>
          <p className="text-ink-muted text-sm">Background-checked, trained, and loved by hundreds of dogs</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {WALKERS.map(w => (
            <div key={w.name} className="bg-white border border-surface-border rounded-2xl p-4 flex flex-col items-center text-center">
              <img src={w.img} alt={w.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-surface-border" />
              <p className="font-bold text-ink text-sm">{w.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-amber-400 text-xs">★</span>
                <span className="text-xs font-semibold text-ink">{w.rating}</span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">{w.walks} walks</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-5 mb-16 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        <div className="px-8 py-12 text-center text-white">
          <p className="text-3xl font-extrabold mb-3">Ready to try PawFleet?</p>
          <p className="text-white/80 mb-8 max-w-sm mx-auto text-sm">
            Join hundreds of Zambian dog owners who trust PawFleet for safe, trackable dog walks.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white font-bold px-8 py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-transform"
            style={{ color: '#1B4332' }}
          >
            🐾 Start for free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PawFleetLogo size={24} />
            <span className="text-sm font-bold text-ink">PawFleet</span>
            <span className="text-xs text-ink-muted">· Lusaka, Zambia</span>
          </div>
          <p className="text-xs text-ink-muted">© 2026 PawFleet. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
