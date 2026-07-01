import { useNavigate } from 'react-router-dom';
import PawFleetLogo from '../components/ui/PawFleetLogo';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <PawFleetLogo size={32} />
            <span className="text-base font-bold" style={{ color: '#1B4332' }}>PawFleet</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold transition-colors"
              style={{ color: '#2B8A50' }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-bold text-white px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
            >
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D2818 0%, #1B4332 50%, #2B8A50 100%)', minHeight: '92vh' }}
      >
        {/* Floating decorative paw prints */}
        <div style={{ position: 'absolute', top: 40, right: 60, fontSize: 80, opacity: 0.07, transform: 'rotate(20deg)', userSelect: 'none' }}>🐾</div>
        <div style={{ position: 'absolute', bottom: 80, left: 30, fontSize: 60, opacity: 0.06, transform: 'rotate(-15deg)', userSelect: 'none' }}>🐾</div>
        <div style={{ position: 'absolute', top: '40%', left: '8%', fontSize: 40, opacity: 0.05, userSelect: 'none' }}>🐾</div>

        <div className="max-w-5xl mx-auto px-5 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">
          {/* Left: headline + CTAs */}
          <div className="flex-1 text-white text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-6 border"
              style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Now live in Lusaka, Zambia 🇿🇲
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight mb-5" style={{ letterSpacing: '-0.02em' }}>
              Walk your dog<br />
              <span style={{ color: '#52B788' }}>with confidence</span>
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
              PawFleet connects trusted walkers with Lusaka's pet owners. Live GPS tracking, instant booking, and professional grooming — all in one app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <button
                onClick={() => navigate('/register')}
                className="flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-base transition-all active:scale-95 shadow-xl"
                style={{ background: '#fff', color: '#1B4332' }}
              >
                Get Started →
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-2xl text-base border transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Sign In
              </button>
            </div>

            {/* Social proof row */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {['🐕', '🐩', '🦮'].map((emoji, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm" style={{ background: '#2B8A50' }}>
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Zambia's fastest-growing pet care platform
              </p>
            </div>
          </div>

          {/* Right: App mockup card */}
          <div className="flex-shrink-0 w-72 lg:w-80">
            <div
              className="rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: '#fff', border: '4px solid rgba(255,255,255,0.25)' }}
            >
              {/* Mock status bar */}
              <div style={{ background: '#1B4332', padding: '12px 16px' }} className="flex items-center justify-between">
                <span className="text-white text-xs font-bold">PawFleet</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-[10px] font-bold">LIVE</span>
                </div>
              </div>
              {/* Mock map area */}
              <div style={{ height: 180, background: '#EBF5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Fake map grid lines */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ position: 'absolute', left: `${i * 33}%`, top: 0, bottom: 0, width: 1, background: '#2B8A50' }} />
                  ))}
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ position: 'absolute', top: `${i * 33}%`, left: 0, right: 0, height: 1, background: '#2B8A50' }} />
                  ))}
                </div>
                {/* Route line */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path d="M 30 150 Q 80 80 140 100 T 240 60" stroke="#2B8A50" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                {/* Walker marker */}
                <div style={{ position: 'absolute', top: '35%', left: '55%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: '#2B8A50', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 3px 12px rgba(0,0,0,0.25)' }}>
                  🐾
                </div>
              </div>
              {/* Mock walk card */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EBF5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🐕</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#1B4332' }}>Max is on a walk</p>
                    <p style={{ fontSize: 11, color: '#666' }}>with Chanda M. · 1.2km so far</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#EBF5EF', borderRadius: 12, padding: '8px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1B4332' }}>22:14</p>
                    <p style={{ fontSize: 10, color: '#666' }}>Elapsed</p>
                  </div>
                  <div style={{ flex: 1, background: '#EBF5EF', borderRadius: 12, padding: '8px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1B4332' }}>1.2km</p>
                    <p style={{ fontSize: 10, color: '#666' }}>Distance</p>
                  </div>
                  <div style={{ flex: 1, background: '#EBF5EF', borderRadius: 12, padding: '8px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#2B8A50' }}>⭐ 4.9</p>
                    <p style={{ fontSize: 10, color: '#666' }}>Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <section className="px-5 py-0 -mt-6 relative z-10">
        <div
          className="max-w-3xl mx-auto rounded-2xl shadow-xl grid grid-cols-3 divide-x"
          style={{ background: '#fff', border: '1px solid #e5e7eb', divideColor: '#e5e7eb' }}
        >
          {[
            { value: '500+', label: 'Walks Completed' },
            { value: '50+',  label: 'Trusted Walkers' },
            { value: '4.9★', label: 'Average Rating'  },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center py-5 gap-1">
              <span className="text-2xl font-extrabold" style={{ color: '#1B4332' }}>{value}</span>
              <span className="text-xs font-medium" style={{ color: '#666' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B4332' }}>Everything your dog deserves</h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: '#666' }}>
            From live GPS tracking to professional grooming — PawFleet is built for Zambia's pet owners.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🗺️',
              title: 'Live GPS Tracking',
              desc: 'Watch your dog\'s walk in real-time on the map. Know exactly where they are, every step of the way.',
            },
            {
              icon: '🛁',
              title: 'Professional Grooming',
              desc: 'Book bath, trim and full grooming sessions with certified groomers. Add-ons available with walks.',
            },
            {
              icon: '💳',
              title: 'Easy Payments',
              desc: 'Pay securely via Mobile Money, Cash or Bank Transfer. All pricing in Zambian Kwacha — no surprises.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-6 border transition-all hover:shadow-md"
              style={{ background: '#fff', borderColor: '#e5e7eb' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: '#EBF5EF' }}
              >
                {icon}
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#1B4332' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#EBF5EF' }}>
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#1B4332' }}>How it works</h2>
            <p className="text-sm" style={{ color: '#555' }}>Get your dog walking in three easy steps</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Book a walk',
                desc: 'Choose instant or scheduled. Pick your dog, set duration, and select from available walkers in your area.',
                icon: '📅',
              },
              {
                step: '2',
                title: 'Walker accepts',
                desc: 'Your walker confirms the booking and heads to your location. You\'ll get a notification the moment they accept.',
                icon: '✅',
              },
              {
                step: '3',
                title: 'Track live',
                desc: 'Watch every step on the real-time map. Chat with your walker and rate the experience when complete.',
                icon: '📍',
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-md"
                  style={{ background: '#1B4332' }}
                >
                  {icon}
                </div>
                <div
                  className="text-xs font-extrabold px-3 py-1 rounded-full mb-3"
                  style={{ background: '#2B8A50', color: '#fff', letterSpacing: '0.08em' }}
                >
                  STEP {step}
                </div>
                <h3 className="font-extrabold text-base mb-2" style={{ color: '#1B4332' }}>{title}</h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#555' }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Connector arrows (desktop only) */}
          <div className="hidden lg:flex justify-center gap-0 mt-2 -translate-y-24 pointer-events-none select-none">
            <span style={{ flex: 1, textAlign: 'center', fontSize: 28, color: '#52B788', opacity: 0.5 }}>→</span>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 28, color: '#52B788', opacity: 0.5 }}>→</span>
          </div>
        </div>
      </section>

      {/* ── CTA footer ──────────────────────────────────────── */}
      <section
        className="py-20 px-5 text-center"
        style={{ background: 'linear-gradient(135deg, #0D2818 0%, #1B4332 60%, #2B8A50 100%)' }}
      >
        <div className="max-w-lg mx-auto">
          <div className="text-5xl mb-5">🐾</div>
          <h2 className="text-3xl font-extrabold text-white mb-3">Ready to get started?</h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Join Lusaka's growing community of dog owners and trusted walkers on PawFleet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="font-bold px-8 py-4 rounded-2xl text-base shadow-xl active:scale-95 transition-all"
              style={{ background: '#fff', color: '#1B4332' }}
            >
              Get Started →
            </button>
            <button
              onClick={() => navigate('/login')}
              className="font-semibold px-8 py-4 rounded-2xl text-base border transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: '#e5e7eb' }}>
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PawFleetLogo size={24} />
            <span className="text-sm font-bold" style={{ color: '#1B4332' }}>PawFleet</span>
            <span className="text-xs" style={{ color: '#999' }}>· Lusaka, Zambia</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-xs hover:underline"
              style={{ color: '#2B8A50' }}
            >
              Privacy & Terms
            </button>
            <p className="text-xs" style={{ color: '#999' }}>© 2026 PawFleet. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
