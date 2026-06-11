import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PawPrint, Eye, EyeOff, Phone, Lock, Mail, User as UserIcon,
  ArrowRight, Check, MapPin, DollarSign, Shield, Zap, Camera, CreditCard, Hash,
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

  const [role, setRole]             = useState<'owner' | 'walker'>('owner');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [nrc, setNrc]               = useState('');
  const [referralCode, setReferral] = useState('');
  const [photoUrl, setPhotoUrl]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
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
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (role === 'walker') {
      if (!photoUrl) { setError('A profile photo is required for walkers.'); return; }
      if (!nrc.trim()) { setError('NRC number is required for walkers.'); return; }
      if (!referralCode.trim()) { setError('A referral code from your admin is required.'); return; }
    }
    setLoading(true);
    const result = await register(name, phone, email, password, role, {
      photoUrl: role === 'walker' ? photoUrl : undefined,
      nrc: role === 'walker' ? nrc.trim() : undefined,
      referralCode: role === 'walker' ? referralCode.trim().toUpperCase() : undefined,
    });
    setLoading(false);
    if (result.success) {
      if (result.pendingApproval) {
        setPending(true);
        return;
      }
      if (result.user) navigate(ROLE_ROUTES[role]);
      else setEmailSent(true);
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm fade-in-up">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            <span className="text-4xl">🦮</span>
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Application Submitted!</h2>
          <p className="text-ink-secondary text-sm leading-relaxed mb-4">
            Your walker application is under review. An admin will verify your details and approve your account shortly.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-2">What happens next:</p>
            <ol className="space-y-1.5">
              {['Admin reviews your photo & NRC', 'You get notified via email when approved', 'Log in and start accepting walks!'].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm fade-in-up">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center shadow-glow"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Check your email!</h2>
          <p className="text-ink-secondary text-sm mb-2 leading-relaxed">We sent a confirmation link to</p>
          <p className="font-semibold text-ink mb-6">{email}</p>
          <p className="text-ink-muted text-xs mb-6">Click the link in the email to activate your account, then sign in.</p>
          <Link to="/login" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* Left Hero */}
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
          <div className="fade-in-up-4">
            <p className="text-white/25 text-xs">© 2025 PawFleet</p>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-start justify-center bg-white p-6 sm:p-10 relative overflow-y-auto">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #C6E6D3 0%, transparent 55%), radial-gradient(circle at 20% 80%, #EBF5EF 0%, transparent 55%)' }} />

        <div className="relative w-full max-w-sm py-8">
          <div className="mb-6 lg:hidden fade-in-up">
            <PawFleetLogo size={42} showText />
          </div>

          <div className="mb-6 fade-in-up-1">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Create account</h2>
            <p className="text-ink-secondary mt-1.5 text-sm">Join PawFleet — it's free to sign up</p>
          </div>

          {/* Role selector */}
          <div className="mb-5 fade-in-up-2">
            <label className="block text-sm font-medium text-ink-secondary mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'owner', emoji: '🐾', label: 'Dog Owner', sub: 'I own a dog' },
                { value: 'walker', emoji: '🦮', label: 'Dog Walker', sub: 'I walk dogs' },
              ] as const).map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200
                    ${role === r.value
                      ? 'border-primary bg-primary-50 shadow-glow'
                      : 'border-surface-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-card-hover'
                    }`}>
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-sm font-semibold text-ink">{r.label}</span>
                  <span className="text-[11px] text-ink-muted">{r.sub}</span>
                  {role === r.value && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-0.5">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 fade-in-up-3">

            {/* Walker photo upload */}
            {role === 'walker' && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                  Profile Photo <span className="text-danger text-xs">*required</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-surface-border overflow-hidden flex items-center justify-center bg-surface-secondary shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}>
                    {photoUrl
                      ? <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      : <Camera className="w-6 h-6 text-ink-muted" />}
                  </div>
                  <div className="flex-1">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full py-2 rounded-xl border border-surface-border text-sm font-medium text-ink-secondary hover:bg-surface-hover transition-colors">
                      {photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <p className="text-[11px] text-ink-muted mt-1">Clear face photo required for verification</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Full Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="0977 000 000" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>

            {/* Walker-only fields */}
            {role === 'walker' && (
              <>
                {/* NRC */}
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                    NRC Number <span className="text-danger text-xs">*required</span>
                  </label>
                  <div className="relative group">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                    <input type="text" value={nrc} onChange={e => setNrc(e.target.value)}
                      placeholder="e.g. 123456/78/9" required={role === 'walker'}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1">Your National Registration Card number for identity verification</p>
                </div>

                {/* Referral code */}
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                    Admin Referral Code <span className="text-danger text-xs">*required</span>
                  </label>
                  <div className="relative group">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                    <input type="text" value={referralCode} onChange={e => setReferral(e.target.value.toUpperCase())}
                      placeholder="e.g. PAW-A1B2C3D4" required={role === 'walker'}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink uppercase placeholder:uppercase placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all font-mono tracking-wider" />
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1">Get this code from your PawFleet admin. Your application will be reviewed before approval.</p>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" required
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors focus:outline-none">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted group-focus-within:text-primary transition-colors" />
                <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat password" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <span className="shrink-0">⚠️</span>
                {error}
              </div>
            )}

            {role === 'walker' && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                <span className="shrink-0 mt-0.5">ℹ️</span>
                <span>Walker applications are reviewed by admin before you can start accepting walks. You'll be notified once approved.</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="gradient-btn w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  {role === 'walker' ? 'Submit Application' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center fade-in-up-4">
            <p className="text-sm text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in →</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-ink-muted mt-4">
            © 2025 PawFleet · Built for Zambia 🇿🇲<br />
            <span className="text-ink-muted/60">Made by <span className="font-semibold">Pegasus AI</span></span>
          </p>
        </div>
      </div>
    </div>
  );
}
