import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PawPrint, Eye, EyeOff, Phone, Lock,
  MapPin, DollarSign, Shield, Zap, ArrowRight, Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

/* ─── Types ─── */
type DemoRole = { label: string; sub: string; identifier: string; password: string; role: Role; emoji: string; gradient: string };

const DEMOS: DemoRole[] = [
  { label: 'Admin',  sub: 'Business owner',   identifier: '0977000001', password: 'admin123',  role: 'admin',  emoji: '👑', gradient: 'from-green-800 to-green-950' },
  { label: 'Walker', sub: 'Dog walker agent',  identifier: '0977000002', password: 'walker123', role: 'walker', emoji: '🦮', gradient: 'from-emerald-500 to-green-700' },
  { label: 'Owner',  sub: 'Dog owner',         identifier: '0977000004', password: 'owner123',  role: 'owner',  emoji: '🐾', gradient: 'from-green-400 to-emerald-600' },
];
const ROLE_ROUTES: Record<Role, string> = { admin: '/admin', walker: '/walker', owner: '/owner' };

/* ─── Floating Preview Cards ─── */
function FloatingCard1() {
  return (
    <div className="glass-card rounded-2xl p-4 w-56 float-a select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-400/20 flex items-center justify-center">
          <PawPrint className="w-3.5 h-3.5 text-emerald-300" />
        </div>
        <span className="text-white/90 text-xs font-semibold">Active Walks</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative" />
        </span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">3</div>
      <div className="text-white/50 text-xs mb-3">walks in progress right now</div>
      <div className="space-y-1.5">
        {[
          { name: 'Rex', walker: 'Bwalya', pct: 75 },
          { name: 'Coco', walker: 'Mutinta', pct: 40 },
        ].map(w => (
          <div key={w.name} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px]">🐕</div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-white/70 mb-0.5">
                <span>{w.name}</span><span>{w.pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${w.pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingCard2() {
  return (
    <div className="glass-card rounded-2xl p-4 w-48 float-b select-none">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center">
          <DollarSign className="w-3.5 h-3.5 text-amber-300" />
        </div>
        <span className="text-white/80 text-[11px] font-medium">Monthly Revenue</span>
      </div>
      <div className="text-2xl font-bold text-white">ZMW 4,500</div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-emerald-400 text-xs font-semibold">↑ 18%</span>
        <span className="text-white/40 text-xs">vs last month</span>
      </div>
      <div className="mt-3 flex gap-1">
        {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-white/10 flex items-end" style={{ height: 28 }}>
            <div className="w-full rounded-sm bg-amber-400/60" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingCard3() {
  return (
    <div className="glass-card rounded-2xl px-4 py-3 w-60 float-c select-none">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">✅</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">Rex's walk completed!</p>
          <p className="text-white/50 text-[10px]">Bwalya · 35 mins · Lusaka</p>
        </div>
        <span className="text-white/30 text-[10px]">now</span>
      </div>
    </div>
  );
}

/* ─── Dog Illustration SVG ─── */
function DogIllustration() {
  return (
    <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-2xl">
      {/* Shadow */}
      <ellipse cx="140" cy="252" rx="70" ry="8" fill="rgba(0,0,0,0.25)" />
      {/* Body */}
      <ellipse cx="140" cy="190" rx="72" ry="55" fill="rgba(255,255,255,0.10)" />
      {/* Tail */}
      <path d="M208 170 Q245 140 238 110 Q233 96 224 100 Q218 116 224 135 Q220 155 205 175Z"
        fill="rgba(255,255,255,0.10)" />
      {/* Left leg */}
      <rect x="95"  y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.12)" />
      {/* Right leg */}
      <rect x="125" y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.12)" />
      {/* Right back leg */}
      <rect x="155" y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.10)" />
      {/* Neck */}
      <path d="M115 150 Q140 140 165 150 L162 175 Q140 168 118 175Z" fill="rgba(255,255,255,0.13)" />
      {/* Left ear */}
      <ellipse cx="108" cy="94" rx="20" ry="32" fill="rgba(167,139,250,0.35)" transform="rotate(-18 108 94)" />
      {/* Right ear */}
      <ellipse cx="172" cy="94" rx="20" ry="32" fill="rgba(167,139,250,0.35)" transform="rotate(18 172 94)" />
      {/* Head */}
      <circle cx="140" cy="110" r="52" fill="rgba(255,255,255,0.14)" />
      {/* Snout */}
      <ellipse cx="140" cy="128" rx="24" ry="18" fill="rgba(255,255,255,0.12)" />
      {/* Left eye white */}
      <circle cx="122" cy="106" r="11" fill="white" opacity="0.92" />
      {/* Right eye white */}
      <circle cx="158" cy="106" r="11" fill="white" opacity="0.92" />
      {/* Left pupil */}
      <circle cx="124" cy="108" r="6" fill="#0f172a" />
      {/* Right pupil */}
      <circle cx="160" cy="108" r="6" fill="#0f172a" />
      {/* Eye shine L */}
      <circle cx="127" cy="105" r="2.5" fill="white" />
      {/* Eye shine R */}
      <circle cx="163" cy="105" r="2.5" fill="white" />
      {/* Nose */}
      <ellipse cx="140" cy="127" rx="10" ry="7" fill="rgba(255,255,255,0.85)" />
      {/* Nostrils */}
      <circle cx="136" cy="128" r="2" fill="rgba(15,23,42,0.4)" />
      <circle cx="144" cy="128" r="2" fill="rgba(15,23,42,0.4)" />
      {/* Smile */}
      <path d="M128 136 Q140 146 152 136" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Collar */}
      <rect x="116" y="152" width="48" height="9" rx="4.5" fill="rgba(99,102,241,0.6)" />
      <circle cx="140" cy="156" r="4" fill="rgba(251,191,36,0.9)" />
      {/* Paw on leg */}
      <ellipse cx="104" cy="257" rx="9" ry="5" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="134" cy="258" rx="9" ry="5" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

/* ─── Floating Paw Prints ─── */
function PawPrints() {
  const paws = [
    { left: '8%',  delay: '0s',  size: 14, dur: '8s' },
    { left: '20%', delay: '2s',  size: 10, dur: '10s' },
    { left: '70%', delay: '1s',  size: 18, dur: '9s' },
    { left: '85%', delay: '3s',  size: 12, dur: '7s' },
    { left: '45%', delay: '5s',  size: 10, dur: '11s' },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {paws.map((p, i) => (
        <div
          key={i}
          className="absolute bottom-0 opacity-0"
          style={{ left: p.left, animation: `paw-drift ${p.dur} ease-in infinite ${p.delay}` }}
        >
          <PawPrint style={{ width: p.size, height: p.size, color: 'rgba(255,255,255,0.2)' }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Login Component ─── */
export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [activeDemoIdx, setActiveDemoIdx] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const user = login(identifier, password);
    if (user) navigate(ROLE_ROUTES[user.role]);
    else { setError('Invalid credentials. Try a demo account below.'); setLoading(false); }
  };

  const fillDemo = (demo: DemoRole, idx: number) => {
    setIdentifier(demo.identifier);
    setPassword(demo.password);
    setError('');
    setActiveDemoIdx(idx);
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ══════════ LEFT HERO PANEL ══════════ */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 40%, #0a2418 70%, #071a0e 100%)' }}>

        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', animation: 'orb-spin 20s linear infinite' }} />
          <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animation: 'orb-spin 25s linear infinite reverse' }} />
          <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)' }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Floating paw prints */}
        <PawPrints />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col h-full p-10">

          {/* Logo */}
          <div className="flex items-center gap-3 fade-in-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A572F, #2B8A50)' }}>
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PawFleet</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/60 border border-white/10">
              ZAMBIA 🇿🇲
            </span>
          </div>

          {/* Center section: headline + dog */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-4">
            <div className="text-center fade-in-up-1">
              <h1 className="text-5xl font-extrabold leading-tight mb-3">
                <span className="gradient-text">Smarter dog</span>
                <br />
                <span className="text-white">walking, managed.</span>
              </h1>
              <p className="text-white/50 text-base max-w-sm mx-auto leading-relaxed">
                The all-in-one platform for professional dog walking businesses in Zambia.
              </p>
            </div>

            {/* Dog illustration */}
            <div className="w-52 mx-auto fade-in-up-2" style={{ animation: 'floatA 6s ease-in-out infinite' }}>
              <DogIllustration />
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center fade-in-up-3">
              {[
                { icon: <MapPin className="w-3 h-3" />, label: 'GPS Tracking' },
                { icon: <DollarSign className="w-3 h-3" />, label: 'ZMW Payments' },
                { icon: <Shield className="w-3 h-3" />, label: 'Role-based Access' },
                { icon: <Zap className="w-3 h-3" />, label: 'Live Updates' },
              ].map(f => (
                <div key={f.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/70 bg-white/8 border border-white/10 backdrop-blur-sm">
                  <span className="text-green-400">{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between fade-in-up-4">
            <p className="text-white/25 text-xs">© 2025 PawFleet</p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['🧑🏿', '👩🏾', '🧑🏽', '👩🏿'].map((e, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <span className="text-white/40 text-xs">Trusted by 200+ owners</span>
            </div>
          </div>
        </div>

        {/* ─── Floating UI Cards ─── */}
        {/* Card 1: top-left area */}
        <div className="absolute top-[12%] left-8 z-20">
          <FloatingCard1 />
        </div>
        {/* Card 2: mid-right area */}
        <div className="absolute top-[38%] right-6 z-20">
          <FloatingCard2 />
        </div>
        {/* Card 3: bottom */}
        <div className="absolute bottom-[18%] left-[50%] -translate-x-1/2 z-20">
          <FloatingCard3 />
        </div>
      </div>

      {/* ══════════ RIGHT FORM PANEL ══════════ */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F6F0] p-6 sm:p-10 relative overflow-hidden">

        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #e0e7ff 0%, transparent 50%), radial-gradient(circle at 20% 80%, #dbeafe 0%, transparent 50%)' }} />

        <div className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden fade-in-up">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1A572F, #2B8A50)' }}>
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-ink block leading-none">PawFleet</span>
              <span className="text-[10px] text-ink-muted">Dog Walking Management</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 fade-in-up-1">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Welcome back</h2>
            <p className="text-ink-secondary mt-1.5 text-sm">Sign in to your workspace to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 fade-in-up-2">
            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phone or Email</label>
              <div className="relative group input-focus rounded-xl">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="0977000001 or email"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Password</label>
              <div className="relative group input-focus rounded-xl">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors focus:outline-none">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <span className="shrink-0">⚠️</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="gradient-btn w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6 fade-in-up-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-xs text-ink-muted font-medium">try a demo account</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          {/* Demo account cards */}
          <div className="space-y-2.5 fade-in-up-4">
            {DEMOS.map((demo, idx) => (
              <button
                key={demo.role}
                onClick={() => fillDemo(demo, idx)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left group
                  ${activeDemoIdx === idx
                    ? 'border-primary bg-primary-50 shadow-glow'
                    : 'border-surface-border bg-white hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5'
                  }`}
              >
                {/* Gradient icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${demo.gradient} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                  {demo.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{demo.label}</p>
                  <p className="text-xs text-ink-muted truncate">{demo.sub} · pw: {demo.label.toLowerCase()}123</p>
                </div>
                {activeDemoIdx === idx ? (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] text-ink-muted mt-5 fade-in-up-4">
            © 2025 PawFleet · Built for Zambia 🇿🇲
          </p>
        </div>
      </div>
    </div>
  );
}
