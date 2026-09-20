import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PawFleetLogo from '../components/ui/PawFleetLogo';
import { supabase } from '../lib/supabase';

// ── Illustrated characters ───────────────────────────────────────
function OwnerCharacter() {
  return (
    <svg width="160" height="220" viewBox="0 0 160 220" fill="none">
      {/* Shadow */}
      <ellipse cx="80" cy="216" rx="44" ry="5" fill="rgba(0,0,0,0.08)" />
      {/* Legs */}
      <path d="M62 148 L54 200 Q53 208 62 208 L68 208 Q74 206 72 198 L72 148" fill="#1E3A5F" />
      <path d="M78 148 L90 200 Q92 208 100 206 L106 204 Q110 200 106 194 L88 148" fill="#1E3A5F" />
      {/* Shoes */}
      <rect x="48" y="200" width="26" height="10" rx="5" fill="#F5F5F5" />
      <rect x="92" y="196" width="26" height="10" rx="5" fill="#F5F5F5" />
      {/* Dress/outfit — warm coral top */}
      <path d="M46 80 C40 84 36 96 36 112 L36 152 Q66 160 104 152 L104 112 C104 96 100 84 94 80 Q72 70 46 80 Z" fill="#FF6B6B" />
      {/* Pattern stripes on dress */}
      <path d="M42 88 Q40 108 40 128" stroke="rgba(255,255,255,0.2)" strokeWidth="8" strokeLinecap="round" />
      <path d="M52 84 Q50 106 52 128" stroke="rgba(255,255,255,0.12)" strokeWidth="5" strokeLinecap="round" />
      {/* Collar */}
      <path d="M58 80 Q70 86 82 80" stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Left arm (down) */}
      <path d="M40 96 Q22 108 18 128" stroke="#7B4A2C" strokeWidth="12" strokeLinecap="round" />
      <ellipse cx="17" cy="130" rx="7" ry="6.5" fill="#7B4A2C" />
      {/* Right arm (holding phone up) */}
      <path d="M100 96 Q116 100 122 86" stroke="#7B4A2C" strokeWidth="12" strokeLinecap="round" />
      <ellipse cx="123" cy="83" rx="7" ry="6.5" fill="#7B4A2C" />
      {/* Phone in hand */}
      <rect x="114" y="55" width="22" height="36" rx="4" fill="#1B4332" />
      <rect x="116" y="58" width="18" height="28" rx="2" fill="#52B788" opacity="0.8" />
      <circle cx="125" cy="87" r="2" fill="#2B8A50" />
      {/* Neck */}
      <rect x="65" y="64" width="12" height="20" rx="6" fill="#8B5A34" />
      {/* Head */}
      <circle cx="71" cy="48" r="28" fill="#8B5A34" />
      {/* Afro hair — rich and full */}
      <ellipse cx="71" cy="30" rx="26" ry="20" fill="#2A1200" />
      <ellipse cx="46" cy="42" rx="12" ry="10" fill="#2A1200" />
      <ellipse cx="96" cy="42" rx="12" ry="10" fill="#2A1200" />
      <ellipse cx="71" cy="20" rx="18" ry="12" fill="#3A1E00" />
      {/* Hair accessory — green clip */}
      <rect x="82" y="20" width="12" height="5" rx="2.5" fill="#2B8A50" />
      {/* Ears */}
      <ellipse cx="43" cy="50" rx="6" ry="7" fill="#7B4A2C" />
      <ellipse cx="99" cy="50" rx="6" ry="7" fill="#7B4A2C" />
      {/* Earrings */}
      <circle cx="43" cy="56" r="3.5" fill="#FFD700" />
      <circle cx="99" cy="56" r="3.5" fill="#FFD700" />
      {/* Eyes */}
      <ellipse cx="62" cy="48" rx="6" ry="6.5" fill="white" />
      <ellipse cx="80" cy="48" rx="6" ry="6.5" fill="white" />
      <circle cx="63" cy="49" r="4.5" fill="#3A1E00" />
      <circle cx="81" cy="49" r="4.5" fill="#3A1E00" />
      <circle cx="63" cy="49" r="2.5" fill="#0A0400" />
      <circle cx="81" cy="49" r="2.5" fill="#0A0400" />
      <circle cx="61.5" cy="47.5" r="1.5" fill="white" />
      <circle cx="79.5" cy="47.5" r="1.5" fill="white" />
      {/* Eyebrows */}
      <path d="M57 41 Q62 38 67 41" stroke="#2A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M75 41 Q80 38 85 41" stroke="#2A1200" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="71" cy="55" rx="3.5" ry="2.5" fill="#6B3A1C" />
      {/* Big smile */}
      <path d="M62 61 Q71 70 80 61" stroke="#6B3A1C" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Cheek blush */}
      <ellipse cx="56" cy="58" rx="6" ry="3.5" fill="rgba(220,80,60,0.18)" />
      <ellipse cx="86" cy="58" rx="6" ry="3.5" fill="rgba(220,80,60,0.18)" />
    </svg>
  );
}

function DogCharacter() {
  return (
    <svg width="140" height="130" viewBox="0 0 140 130" fill="none">
      {/* Shadow */}
      <ellipse cx="72" cy="126" rx="40" ry="4.5" fill="rgba(0,0,0,0.08)" />
      {/* Tail */}
      <path d="M30 70 Q10 45 18 25 Q24 12 32 18" stroke="#C4722A" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="16" r="7" fill="#EDAA58" />
      {/* Body */}
      <ellipse cx="70" cy="88" rx="38" ry="24" fill="#D4842A" />
      <ellipse cx="68" cy="80" rx="28" ry="16" fill="#EDAA58" opacity="0.4" />
      {/* Neck */}
      <path d="M82 65 Q96 72 96 84" stroke="#D4842A" strokeWidth="20" strokeLinecap="round" />
      <path d="M84 67 Q96 74 96 84" stroke="#EDAA58" strokeWidth="9" strokeLinecap="round" opacity="0.35" />
      {/* Head */}
      <ellipse cx="100" cy="56" rx="28" ry="26" fill="#D4842A" />
      <ellipse cx="98" cy="44" rx="20" ry="14" fill="#EDAA58" opacity="0.4" />
      {/* Left ear */}
      <path d="M76 48 C65 34 57 44 60 62 Q64 76 76 72 Q84 68 80 52 Z" fill="#B05818" />
      {/* Right ear */}
      <path d="M118 46 C128 33 136 44 132 62 Q128 76 116 72 Q106 68 110 52 Z" fill="#B05818" />
      {/* Snout */}
      <ellipse cx="119" cy="64" rx="15" ry="11" fill="#C47030" />
      {/* Nose */}
      <ellipse cx="127" cy="58" rx="6" ry="5" fill="#180800" />
      <ellipse cx="125" cy="56" rx="2" ry="1.5" fill="rgba(255,255,255,0.45)" />
      {/* Mouth */}
      <path d="M120 67 L126 72 L131 67" stroke="#8B3A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tongue */}
      <path d="M122 72 Q123 82 120 86" stroke="#E8708A" strokeWidth="8" strokeLinecap="round" />
      <path d="M125 72 Q126 82 123 86" stroke="#E8708A" strokeWidth="8" strokeLinecap="round" opacity="0.65" />
      {/* Eye */}
      <circle cx="95" cy="50" r="8" fill="white" />
      <circle cx="96" cy="51" r="5.5" fill="#3A1E00" />
      <circle cx="96" cy="51" r="3" fill="#0A0400" />
      <circle cx="94" cy="49" r="2" fill="white" />
      <path d="M88 44 Q95 40 102 44" stroke="#2A1200" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Collar */}
      <path d="M82 70 Q100 62 118 70" stroke="#E84040" strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="65" r="4" fill="#FFD700" />
      {/* Legs */}
      <path d="M62 110 L54 126" stroke="#C4722A" strokeWidth="11" strokeLinecap="round" />
      <path d="M76 112 L84 126" stroke="#C4722A" strokeWidth="11" strokeLinecap="round" />
      <path d="M44 104 L34 120" stroke="#B05818" strokeWidth="11" strokeLinecap="round" />
      <path d="M56 106 L68 120" stroke="#B05818" strokeWidth="11" strokeLinecap="round" />
      {/* Paws */}
      <ellipse cx="52" cy="127" rx="9" ry="5.5" fill="#9A4810" />
      <ellipse cx="85" cy="127" rx="9" ry="5.5" fill="#9A4810" />
      <ellipse cx="33" cy="121" rx="9" ry="5.5" fill="#9A4810" />
      <ellipse cx="69" cy="121" rx="9" ry="5.5" fill="#9A4810" />
    </svg>
  );
}

function WalkerCharacter() {
  return (
    <svg width="130" height="200" viewBox="0 0 130 200" fill="none">
      {/* Shadow */}
      <ellipse cx="65" cy="196" rx="36" ry="4" fill="rgba(0,0,0,0.08)" />
      {/* Legs in stride */}
      <path d="M52 136 L44 180 Q43 188 52 188 L58 188 Q64 186 62 178 L62 136" fill="#1E3A5F" />
      <path d="M66 136 L78 178 Q80 186 88 184 L94 182 Q98 178 94 172 L76 136" fill="#1E3A5F" />
      {/* Shoes */}
      <rect x="37" y="180" width="24" height="9" rx="4.5" fill="#2A2A2A" />
      <rect x="78" y="174" width="24" height="9" rx="4.5" fill="#2A2A2A" />
      {/* Body — athletic jacket */}
      <path d="M34 70 C28 74 24 86 24 100 L24 140 Q52 148 90 140 L90 100 C90 86 92 74 86 70 Q60 60 34 70 Z" fill="#1B4332" />
      {/* Jacket stripes */}
      <path d="M28 80 Q26 98 28 116" stroke="rgba(82,183,136,0.4)" strokeWidth="6" strokeLinecap="round" />
      <path d="M82 80 Q84 98 82 116" stroke="rgba(82,183,136,0.4)" strokeWidth="6" strokeLinecap="round" />
      {/* Jacket zipper */}
      <path d="M57 70 L57 138" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      {/* Left arm (forward, waving) */}
      <path d="M28 88 Q10 96 6 112" stroke="#7B4A2C" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="5" cy="114" rx="7" ry="6" fill="#7B4A2C" />
      {/* Right arm (down) */}
      <path d="M86 88 Q102 96 106 110" stroke="#7B4A2C" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="107" cy="112" rx="7" ry="6" fill="#7B4A2C" />
      {/* Neck */}
      <rect x="53" y="56" width="11" height="17" rx="5.5" fill="#8B5A34" />
      {/* Head */}
      <circle cx="58" cy="40" r="26" fill="#8B5A34" />
      {/* Cap */}
      <ellipse cx="58" cy="22" rx="28" ry="10" fill="#1B4332" />
      <rect x="30" y="22" width="56" height="8" rx="0" fill="#1B4332" />
      {/* Cap brim */}
      <path d="M28 30 Q58 34 88 30" stroke="#2B8A50" strokeWidth="1.5" fill="none" />
      <rect x="22" y="26" width="72" height="8" rx="4" fill="#1B4332" />
      {/* Cap logo */}
      <circle cx="58" cy="27" r="5" fill="#2B8A50" />
      <path d="M55 27 Q58 24 61 27" stroke="white" strokeWidth="1.5" fill="none" />
      {/* Ears */}
      <ellipse cx="32" cy="44" rx="5.5" ry="6.5" fill="#7B4A2C" />
      <ellipse cx="84" cy="44" rx="5.5" ry="6.5" fill="#7B4A2C" />
      {/* Eyes */}
      <ellipse cx="50" cy="42" rx="5.5" ry="6" fill="white" />
      <ellipse cx="66" cy="42" rx="5.5" ry="6" fill="white" />
      <circle cx="51" cy="43" r="4" fill="#3A1E00" />
      <circle cx="67" cy="43" r="4" fill="#3A1E00" />
      <circle cx="51" cy="43" r="2.2" fill="#0A0400" />
      <circle cx="67" cy="43" r="2.2" fill="#0A0400" />
      <circle cx="49.5" cy="41.5" r="1.3" fill="white" />
      <circle cx="65.5" cy="41.5" r="1.3" fill="white" />
      {/* Eyebrows */}
      <path d="M45 35 Q50 33 55 35" stroke="#2A1200" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M61 35 Q66 33 71 35" stroke="#2A1200" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="58" cy="49" rx="3" ry="2.2" fill="#6B3A1C" />
      {/* Friendly smile */}
      <path d="M50 55 Q58 63 66 55" stroke="#6B3A1C" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="52" rx="5" ry="3" fill="rgba(200,80,60,0.15)" />
      <ellipse cx="72" cy="52" rx="5" ry="3" fill="rgba(200,80,60,0.15)" />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [liveStats, setLiveStats] = useState({ walks: '500+', walkers: '50+', rating: '4.9' });

  useEffect(() => {
    Promise.all([
      supabase.from('walks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'walker').eq('walker_status', 'active'),
      supabase.from('walks').select('rating').eq('status', 'completed').not('rating', 'is', null),
    ]).then(([walksRes, walkersRes, ratingsRes]) => {
      const walksCount   = walksRes.count  ?? 0;
      const walkersCount = walkersRes.count ?? 0;
      const ratings      = (ratingsRes.data ?? []) as { rating: number }[];
      const avgRating    = ratings.length > 0
        ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
        : null;
      setLiveStats({
        walks:   walksCount   > 0 ? String(walksCount)   : '500+',
        walkers: walkersCount > 0 ? String(walkersCount) : '50+',
        rating:  avgRating ?? '4.9',
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <PawFleetLogo size={34} />
            <span className="text-lg font-extrabold tracking-tight" style={{ color: '#1B4332' }}>PawFleet</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Services', 'For Walkers', 'Pricing'].map(item => (
              <span key={item} className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer transition-colors">{item}</span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              style={{ color: '#2B8A50' }}>
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Get Started →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A1F12 0%, #1B4332 45%, #2B8A50 100%)', minHeight: '94vh' }}>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(82,183,136,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(82,183,136,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '42%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

          {/* Left copy */}
          <div className="flex-1 text-white text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-8"
              style={{ background: 'rgba(82,183,136,0.18)', border: '1px solid rgba(82,183,136,0.35)', color: '#86EFAC' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live in Lusaka, Zambia 🇿🇲
            </div>

            <h1 className="font-extrabold leading-none mb-6"
              style={{ fontSize: 'clamp(2.8rem,6vw,4.5rem)', letterSpacing: '-0.03em' }}>
              Your dog deserves<br />
              <span style={{ color: '#52B788' }}>the best walks</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0"
              style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>
              PawFleet connects Lusaka's pet owners with trusted, verified walkers. Live GPS tracking, instant booking, and real-time chat — all in one app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-12">
              <button onClick={() => navigate('/register')}
                className="font-bold px-8 py-4 rounded-2xl text-base shadow-2xl active:scale-95 transition-all"
                style={{ background: '#fff', color: '#1B4332', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                Book a Walk →
              </button>
              <button onClick={() => navigate('/login')}
                className="font-semibold px-8 py-4 rounded-2xl text-base transition-all"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.28)', color: '#fff' }}>
                Sign In
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
              {[
                { v: liveStats.walks, l: 'Walks done' },
                { v: liveStats.walkers, l: 'Walkers' },
                { v: liveStats.rating + '★', l: 'Avg rating' },
              ].map(s => (
                <div key={s.l} className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-white">{s.v}</span>
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — character illustration */}
          <div className="relative flex-shrink-0 flex items-end justify-center" style={{ width: 380, height: 400 }}>

            {/* Backdrop glow */}
            <div style={{ position: 'absolute', inset: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,183,136,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />

            {/* Ground */}
            <div style={{ position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />

            {/* Walker character (left) */}
            <div style={{ position: 'absolute', left: 0, bottom: 8 }}>
              <WalkerCharacter />
            </div>

            {/* Owner + dog (right) */}
            <div style={{ position: 'absolute', right: 0, bottom: 8 }}>
              <OwnerCharacter />
            </div>
            <div style={{ position: 'absolute', right: 16, bottom: 4 }}>
              <DogCharacter />
            </div>

            {/* Floating stat card — live walk */}
            <div style={{
              position: 'absolute', top: 24, left: 10,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
              borderRadius: 16, padding: '12px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              minWidth: 150,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} className="animate-pulse" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2B8A50', letterSpacing: '0.04em' }}>WALK IN PROGRESS</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', marginBottom: 2 }}>Max is out with Chanda</p>
              <p style={{ fontSize: 11, color: '#6B7280' }}>1.4km · 18 min · Kabulonga</p>
            </div>

            {/* Floating rating card */}
            <div style={{
              position: 'absolute', top: 60, right: 2,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
              borderRadius: 16, padding: '10px 14px', boxShadow: '0 8px 28px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF9E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⭐</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', lineHeight: 1 }}>4.9</p>
                <p style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Avg. walker rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2B8A50' }}>Why PawFleet</p>
          <h2 className="text-4xl font-extrabold mb-4" style={{ color: '#111827', letterSpacing: '-0.02em' }}>Everything your dog deserves</h2>
          <p className="text-base max-w-md mx-auto" style={{ color: '#6B7280', lineHeight: 1.7 }}>
            Built from the ground up for Zambia's pet owners and the professionals who care for their dogs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#EBF5EF" />
                  <circle cx="16" cy="14" r="5" fill="#2B8A50" />
                  <path d="M10 24 Q16 20 22 24" stroke="#2B8A50" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <circle cx="16" cy="14" r="2.5" fill="white" />
                </svg>
              ),
              color: '#EBF5EF',
              title: 'Verified Walkers',
              desc: 'Every walker passes NRC verification, a background check, and a dog-handling assessment before joining.',
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#FEF3C7" />
                  <path d="M10 18 L13 21 L22 12" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="24" cy="10" r="4" fill="#F59E0B" />
                  <path d="M22 8 L24 6 L26 8 L24 10 Z" fill="white" />
                </svg>
              ),
              color: '#FEF3C7',
              title: 'Live GPS Tracking',
              desc: 'Watch every step of your dog\'s walk on a live map. Know exactly where they are, in real-time.',
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#EEF2FF" />
                  <rect x="10" y="12" width="12" height="10" rx="2.5" fill="#6366F1" />
                  <path d="M13 12 L13 10 Q13 8 16 8 Q19 8 19 10 L19 12" stroke="#6366F1" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <circle cx="16" cy="17" r="2" fill="white" />
                </svg>
              ),
              color: '#EEF2FF',
              title: 'Secure Payments',
              desc: 'Pay via Mobile Money, cash, or bank transfer — all in Zambian Kwacha. No hidden fees, ever.',
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#FFF1F2" />
                  <path d="M10 14 Q10 10 16 10 Q22 10 22 14 L22 20 Q22 22 20 22 L12 22 Q10 22 10 20 Z" fill="#F43F5E" opacity="0.8" />
                  <circle cx="13" cy="16" r="1.5" fill="white" />
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                  <circle cx="19" cy="16" r="1.5" fill="white" />
                </svg>
              ),
              color: '#FFF1F2',
              title: 'Real-time Chat',
              desc: 'Message your walker before, during and after the walk. Stay connected the whole time.',
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#F0FDF4" />
                  <path d="M16 8 L18 13 L23 13 L19.5 16.5 L21 22 L16 18.5 L11 22 L12.5 16.5 L9 13 L14 13 Z" fill="#22C55E" />
                </svg>
              ),
              color: '#F0FDF4',
              title: 'Instant Booking',
              desc: 'Need a walker now? Book instantly and a verified walker will be at your door within the hour.',
            },
            {
              icon: (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#FDF4FF" />
                  <path d="M12 12 Q16 8 20 12 Q24 16 20 20 Q16 24 12 20 Q8 16 12 12 Z" fill="#A855F7" opacity="0.8" />
                  <circle cx="16" cy="16" r="3" fill="white" />
                </svg>
              ),
              color: '#FDF4FF',
              title: 'Pro Grooming',
              desc: 'Add a bath, trim, or full grooming session to any walk booking with one tap.',
            },
          ].map(({ icon, color, title, desc }) => (
            <div key={title}
              className="group rounded-2xl p-6 border border-gray-100 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-default"
              style={{ background: '#fff' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: color }}>
                {icon}
              </div>
              <h3 className="font-extrabold text-base mb-2" style={{ color: '#111827' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6B7280', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: '#F0FDF4' }} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2B8A50' }}>What Lusaka says</p>
            <h2 className="text-3xl font-extrabold" style={{ color: '#111827', letterSpacing: '-0.02em' }}>Trusted by pet owners across the city</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Natasha M.', area: 'Kabulonga', role: 'Dog Owner', quote: "I used to worry sick when someone else walked Bella. With PawFleet's live tracking I can watch every step. Absolutely love it!", rating: 5, avatar: '#FF6B6B', initials: 'NM' },
              { name: 'Chanda K.', area: 'Woodlands', role: 'Walker · 247 walks', quote: "PawFleet changed my life. I earn K4,000+ a week doing what I love — walking dogs. The app makes it so easy to manage bookings.", rating: 5, avatar: '#1B4332', initials: 'CK' },
              { name: 'Sarah & Max', area: 'Chelstone', role: 'Dog Owner', quote: "Max loves his walker James so much. The in-app chat and ratings made it easy to find someone we trust completely.", rating: 5, avatar: '#2B8A50', initials: 'SM' },
            ].map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
                <div className="flex mb-2">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} style={{ color: '#F59E0B', fontSize: 14 }}>★</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#374151', lineHeight: 1.7 }}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: t.avatar }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#111827' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{t.role} · {t.area}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2B8A50' }}>Simple process</p>
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: '#111827', letterSpacing: '-0.02em' }}>Walking in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {[
              { n: '01', icon: '📅', title: 'Book a walk', desc: 'Choose instant or scheduled. Pick your dog, set duration, and select from walkers in your area.' },
              { n: '02', icon: '✅', title: 'Walker heads over', desc: 'Your verified walker confirms and comes to you. You\'ll get a notification the moment they accept.' },
              { n: '03', icon: '📍', title: 'Track live & rate', desc: 'Watch every step on the real-time map. Chat with your walker, then rate when complete.' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-md"
                    style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                    {icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ background: '#52B788' }}>
                    {n}
                  </div>
                </div>
                <h3 className="font-extrabold text-base mb-2" style={{ color: '#111827' }}>{title}</h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6B7280', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For walkers CTA split ── */}
      <section style={{ background: '#1B4332' }} className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#52B788' }}>For dog walkers</p>
            <h2 className="text-3xl font-extrabold mb-4" style={{ letterSpacing: '-0.02em' }}>Turn your love of dogs into income</h2>
            <p className="text-base mb-6" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              Join PawFleet as a walker and earn K2,500–K6,000 per week. Flexible hours, instant payouts, and a growing community of dog lovers.
            </p>
            <div className="space-y-3 mb-8">
              {['Set your own schedule', 'Earn K150–K350 per walk', 'Get tips & bonuses', 'Free insurance coverage'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#52B788' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5 L4 7 L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-sm font-medium text-white">{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register')}
              className="font-bold px-8 py-4 rounded-2xl text-sm active:scale-95 transition-all"
              style={{ background: '#fff', color: '#1B4332', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              Apply to Walk →
            </button>
          </div>
          <div className="flex justify-center items-end gap-6">
            <WalkerCharacter />
            <DogCharacter />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #0A1F12 0%, #1B4332 60%, #2B8A50 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex justify-center mb-6">
            <OwnerCharacter />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Ready to get started?</h2>
          <p className="mb-10 text-base" style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
            Join Lusaka's growing community of pet owners and trusted walkers on PawFleet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/register')}
              className="font-bold px-10 py-4 rounded-2xl text-base shadow-2xl active:scale-95 transition-all"
              style={{ background: '#fff', color: '#1B4332' }}>
              Create Account →
            </button>
            <button onClick={() => navigate('/login')}
              className="font-semibold px-10 py-4 rounded-2xl text-base transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.28)', color: '#fff' }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #e5e7eb' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <PawFleetLogo size={26} />
            <span className="text-sm font-extrabold" style={{ color: '#1B4332' }}>PawFleet</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>· Lusaka, Zambia</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/privacy-policy')} className="text-xs hover:underline" style={{ color: '#2B8A50' }}>
              Privacy & Terms
            </button>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>© 2026 PawFleet</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
