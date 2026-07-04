import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Phone, Lock, Mail, User as UserIcon,
  ArrowRight, Check, MapPin, DollarSign, Shield, Zap, Camera, CreditCard, PawPrint,
} from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';
import { useApp } from '../context/AppContext';

function PawPrints() {
  const paws = [
    { left: '8%', delay: '0s', size: 14, dur: '8s' },
    { left: '20%', delay: '2s', size: 10, dur: '10s' },
    { left: '70%', delay: '1s', size: 18, dur: '9s' },
    { left: '85%', delay: '3s', size: 12, dur: '7s' },
    { left: '45%', delay: '5s', size: 10, dur: '11s' },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {paws.map((p, i) => (
        <div key={i} className="absolute bottom-0 opacity-0"
          style={{ left: p.left, animation: `paw-drift ${p.dur} ease-in infinite ${p.delay}` }}>
          <PawPrint style={{ width: p.size, height: p.size, color: 'rgba(255,255,255,0.2)' }} />
        </div>
      ))}
    </div>
  );
}

function DogIllustration() {
  return (
    <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-2xl">
      <ellipse cx="140" cy="252" rx="70" ry="8" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="140" cy="190" rx="72" ry="55" fill="rgba(255,255,255,0.10)" />
      <path d="M208 170 Q245 140 238 110 Q233 96 224 100 Q218 116 224 135 Q220 155 205 175Z" fill="rgba(255,255,255,0.10)" />
      <rect x="95" y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="125" y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="155" y="220" width="18" height="38" rx="9" fill="rgba(255,255,255,0.10)" />
      <path d="M115 150 Q140 140 165 150 L162 175 Q140 168 118 175Z" fill="rgba(255,255,255,0.13)" />
      <ellipse cx="108" cy="94" rx="20" ry="32" fill="rgba(64,145,108,0.40)" transform="rotate(-18 108 94)" />
      <ellipse cx="172" cy="94" rx="20" ry="32" fill="rgba(64,145,108,0.40)" transform="rotate(18 172 94)" />
      <circle cx="140" cy="110" r="52" fill="rgba(255,255,255,0.14)" />
      <ellipse cx="140" cy="128" rx="24" ry="18" fill="rgba(255,255,255,0.12)" />
      <circle cx="122" cy="106" r="11" fill="white" opacity="0.92" />
      <circle cx="158" cy="106" r="11" fill="white" opacity="0.92" />
      <circle cx="124" cy="108" r="6" fill="#0f172a" />
      <circle cx="160" cy="108" r="6" fill="#0f172a" />
      <circle cx="127" cy="105" r="2.5" fill="white" />
      <circle cx="163" cy="105" r="2.5" fill="white" />
      <ellipse cx="140" cy="127" rx="10" ry="7" fill="rgba(255,255,255,0.85)" />
      <circle cx="136" cy="128" r="2" fill="rgba(15,23,42,0.4)" />
      <circle cx="144" cy="128" r="2" fill="rgba(15,23,42,0.4)" />
      <path d="M128 136 Q140 146 152 136" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="116" y="152" width="48" height="9" rx="4.5" fill="rgba(27,67,50,0.75)" />
      <circle cx="140" cy="156" r="4" fill="rgba(82,183,136,0.95)" />
    </svg>
  );
}

const ROLE_ROUTES = { owner: '/owner', walker: '/walker' };

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [role, setRole]           = useState<'owner' | 'walker'>('owner');
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [nrc, setNrc]             = useState('');
  const [photoUrl, setPhotoUrl]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pendingApproval, setPending] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    if (role === 'walker') {
      if (!photoUrl)      { setError('A profile photo is required for walkers.'); return; }
      if (!nrc.trim())    { setError('NRC number is required for walkers.'); return; }
    }
    setLoading(true);
    const result = await register(name, phone, email, password, role, {
      photoUrl: photoUrl || undefined,
      nrc: role === 'walker' ? nrc.trim() : undefined,
    });
    setLoading(false);
    if (result.success) {
      if (result.pendingApproval) { setPending(true); return; }
      if (result.user) navigate(ROLE_ROUTES[role]);
      else setEmailSent(true);
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  /* ── Pending approval screen ── */
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #EBF5EF 0%, #F4F9F6 100%)' }}>
        <div className="w-full max-w-sm fade-in-up">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 text-center" style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 55%, #0a2418 100%)' }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                🦮
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">Application Submitted!</h2>
              <p className="text-white/55 text-sm">Your walker profile is under review</p>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-3 mb-6">
                {['Admin reviews your photo & NRC', 'You\'ll be notified by email when approved', 'Log in and start accepting walks!'].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F4F9F6' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: '#2B8A50' }}>{i + 1}</div>
                    <p className="text-sm text-ink">{s}</p>
                  </div>
                ))}
              </div>
              <Link to="/login"
                className="w-full block py-3.5 rounded-2xl text-sm font-bold text-white text-center"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Email sent screen ── */
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #EBF5EF 0%, #F4F9F6 100%)' }}>
        <div className="w-full max-w-sm fade-in-up">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 text-center" style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 55%, #0a2418 100%)' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">Account Created!</h2>
              <p className="text-white/55 text-sm">Check your email to confirm</p>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-ink-secondary text-center mb-1">Confirmation sent to</p>
              <p className="font-bold text-ink text-center mb-5">{email}</p>
              <div className="p-3.5 rounded-xl mb-5 text-xs text-amber-800" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="font-bold mb-1">Didn't get it?</p>
                <p>Check your spam folder. You can also sign in directly — email confirmation may be disabled.</p>
              </div>
              <Link to="/login"
                className="w-full block py-3.5 rounded-2xl text-sm font-bold text-white text-center"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main registration form ── */
  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── Left hero (desktop only) ── */}
      <div className="hidden lg:flex flex-col w-[45%] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 40%, #0a2418 70%, #071a0e 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', animation: 'orb-spin 20s linear infinite' }} />
          <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animation: 'orb-spin 25s linear infinite reverse' }} />
        </div>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <PawPrints />
        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3 fade-in-left">
            <PawFleetLogo size={40} showText textWhite />
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/60 border border-white/10">
              ZAMBIA 🇿🇲
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-4">
            <div className="text-center fade-in-up-1">
              <h1 className="text-4xl font-extrabold leading-tight mb-3">
                <span className="gradient-text">Join the</span><br />
                <span className="text-white">PawFleet family.</span>
              </h1>
              <p className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
                Zambia's most trusted dog walking platform. Whether you own a dog or walk them — we've got you.
              </p>
            </div>
            <div className="w-48 mx-auto fade-in-up-2" style={{ animation: 'floatA 6s ease-in-out infinite' }}>
              <DogIllustration />
            </div>
            <div className="flex flex-wrap gap-2 justify-center fade-in-up-3">
              {[
                { icon: <MapPin className="w-3 h-3" />, label: 'GPS Tracking' },
                { icon: <DollarSign className="w-3 h-3" />, label: 'ZMW Payments' },
                { icon: <Shield className="w-3 h-3" />, label: 'Verified Walkers' },
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
          <p className="text-white/25 text-xs fade-in-up-4">© 2025 PawFleet</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #EBF5EF 0%, #F4F9F6 60%, #ffffff 100%)' }}>
        <div className="w-full max-w-sm px-5 py-8">

          {/* Mobile branded header card */}
          <div className="lg:hidden mb-6 rounded-2xl overflow-hidden shadow-md fade-in-up">
            <div className="relative px-5 py-7"
              style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 55%, #0a2418 100%)' }}>
              <PawFleetLogo size={36} showText textWhite />
              <p className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                {role === 'walker' ? 'Become a Walker 🦮' : 'Join PawFleet 🐾'}
              </p>
              <p className="text-white/55 text-xs mt-1 leading-relaxed">
                {role === 'walker'
                  ? 'Apply to walk dogs in your area'
                  : 'Create your free account today'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['📍 GPS Tracking', '✓ Verified Walkers', '⚡ Live Updates'].map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-medium text-white/65 bg-white/10 border border-white/10">{f}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-7 fade-in-up-1">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Create account</h2>
            <p className="text-ink-secondary mt-1.5 text-sm">Join PawFleet — it's free to sign up</p>
          </div>

          {/* Role selector */}
          <div className="mb-6 fade-in-up-2">
            <p className="text-xs font-semibold text-ink-secondary uppercase tracking-widest mb-3">I am a…</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  value: 'owner',
                  emoji: '🐾',
                  label: 'Dog Owner',
                  sub: 'Book walks for my dog',
                  color: '#2B8A50',
                  bg: 'linear-gradient(135deg, #EBF5EF, #D1FAE5)',
                },
                {
                  value: 'walker',
                  emoji: '🦮',
                  label: 'Dog Walker',
                  sub: 'Earn by walking dogs',
                  color: '#1B4332',
                  bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                },
              ] as const).map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                  className="relative flex flex-col items-center gap-1.5 py-5 px-3 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    background: role === r.value ? r.bg : 'white',
                    borderColor: role === r.value ? r.color : '#E5E7EB',
                    boxShadow: role === r.value ? `0 4px 18px ${r.color}22` : 'none',
                  }}>
                  {role === r.value && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: r.color }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-3xl">{r.emoji}</span>
                  <span className="text-sm font-bold text-ink">{r.label}</span>
                  <span className="text-[11px] text-ink-muted text-center leading-tight">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 fade-in-up-3">

            {/* Profile photo */}
            <div className="rounded-2xl p-4 border border-surface-border bg-white">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-widest mb-3">
                Profile Photo
                {role === 'walker'
                  ? <span className="ml-1 normal-case text-red-500 font-medium">· required</span>
                  : <span className="ml-1 normal-case text-ink-muted font-normal">· optional</span>}
              </p>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer shrink-0 transition-transform hover:scale-[1.03]"
                  style={{ background: photoUrl ? 'transparent' : 'linear-gradient(135deg, #EBF5EF, #D1FAE5)', border: '2px dashed #52B788' }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera className="w-6 h-6 text-primary" />
                        <span className="text-[9px] font-semibold text-primary">PHOTO</span>
                      </div>
                    )}
                  {photoUrl && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={{ borderColor: '#2B8A50', color: '#2B8A50', background: 'white' }}>
                    {photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">
                    {role === 'walker'
                      ? 'Clear face photo for identity verification'
                      : 'Helps walkers recognise you at pickup'}
                  </p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Fields */}
            <div className="rounded-2xl overflow-hidden border border-surface-border bg-white divide-y divide-surface-border">

              {/* Name */}
              <div className="flex items-center gap-3 px-4 h-14">
                <UserIcon className="w-4 h-4 text-ink-muted shrink-0" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name" required
                  className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 px-4 h-14">
                <Phone className="w-4 h-4 text-ink-muted shrink-0" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Phone number (0977 000 000)" required
                  className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 px-4 h-14">
                <Mail className="w-4 h-4 text-ink-muted shrink-0" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" required
                  className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
              </div>

              {/* Password */}
              <div className="flex items-center gap-3 px-4 h-14">
                <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min. 6 chars)" required
                  className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-ink-muted hover:text-ink transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="flex items-center gap-3 px-4 h-14">
                <Lock className="w-4 h-4 text-ink-muted shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm password" required
                  className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
                {confirmPw && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${confirmPw === password ? 'bg-green-500' : 'bg-red-400'}`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Walker NRC field */}
            {role === 'walker' && (
              <div className="rounded-2xl overflow-hidden border-2 bg-white"
                style={{ borderColor: '#2B8A50' }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #EBF5EF, #F4F9F6)' }}>
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-bold text-primary">Identity Verification Required</p>
                </div>
                <div className="flex items-center gap-3 px-4 h-14 border-t border-surface-border">
                  <CreditCard className="w-4 h-4 text-ink-muted shrink-0" />
                  <input type="text" value={nrc} onChange={e => setNrc(e.target.value)}
                    placeholder="NRC Number (e.g. 123456/78/9)" required={role === 'walker'}
                    className="flex-1 h-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none" />
                </div>
                <p className="px-4 pb-3 text-[11px] text-ink-muted">Your National Registration Card number — used for background verification only</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span className="shrink-0">⚠️</span>
                {error}
              </div>
            )}

            {/* Walker review notice */}
            {role === 'walker' && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-xs"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <span className="text-base shrink-0">⏳</span>
                <div>
                  <p className="font-bold text-amber-800 mb-0.5">Application review takes 24–48 hrs</p>
                  <p className="text-amber-700 leading-relaxed">An admin will verify your photo & NRC. You'll be emailed once approved and can start accepting walks immediately.</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-14 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)', boxShadow: '0 8px 24px rgba(27,67,50,0.30)' }}>
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {role === 'walker' ? 'Submitting application…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {role === 'walker' ? 'Submit Walker Application' : 'Create My Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center fade-in-up-4">
            <p className="text-sm text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-bold hover:underline" style={{ color: '#2B8A50' }}>Sign in →</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-ink-muted mt-5">
            © 2025 PawFleet · Built for Zambia 🇿🇲<br />
            <span className="opacity-60">Made by <span className="font-semibold">Pegasus AI</span></span>
          </p>
        </div>
      </div>
    </div>
  );
}
