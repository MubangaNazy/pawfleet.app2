import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Phone, Lock, Mail, User as UserIcon,
  ArrowRight, Check, Shield, Camera, CreditCard,
} from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';
import { useApp } from '../context/AppContext';

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
      if (!photoUrl)   { setError('A profile photo is required for walkers.'); return; }
      if (!nrc.trim()) { setError('NRC number is required for walkers.'); return; }
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
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 text-center"
              style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 55%, #0a2418 100%)' }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ background: 'rgba(255,255,255,0.12)' }}>🦮</div>
              <h2 className="text-xl font-extrabold text-white mb-1">Application Submitted!</h2>
              <p className="text-white/55 text-sm">Your walker profile is under review</p>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-3 mb-6">
                {['Admin reviews your photo & NRC', "You'll be notified by email when approved", 'Log in and start accepting walks!'].map((s, i) => (
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
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 text-center"
              style={{ background: 'linear-gradient(145deg, #071a0e 0%, #0f3020 55%, #0a2418 100%)' }}>
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
              <div className="p-3.5 rounded-xl mb-5 text-xs text-amber-800"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
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
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F9F6' }}>

      {/* Hero photo */}
      <div className="relative shrink-0" style={{ height: '38vh', minHeight: 220 }}>
        <img src="/images/pf-walk-women.png" alt=""
          className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(7,26,14,0.80) 0%, rgba(15,48,32,0.65) 60%, rgba(7,26,14,0.45) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(7,26,14,0.30))' }} />
        <div className="absolute inset-0 flex flex-col justify-between px-6 py-5">
          <PawFleetLogo size={32} showText textWhite />
          <div>
            <h1 className="text-[28px] font-extrabold text-white tracking-tight leading-tight">
              {role === 'walker' ? 'Become a Walker' : 'Join PawFleet'}
            </h1>
            <p className="text-white/60 text-sm mt-0.5">
              {role === 'walker' ? 'Earn by walking dogs in Lusaka' : "Zambia's trusted dog walking app 🇿🇲"}
            </p>
          </div>
        </div>
      </div>

      {/* White bottom card */}
      <div className="flex-1 bg-white rounded-t-[28px] relative z-10 -mt-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-5 pt-5 pb-12">

          {/* Drag pill */}
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

          {/* Role toggle */}
          <div className="flex p-1 rounded-2xl mb-6"
            style={{ background: '#EBF5EF' }}>
            {(['owner', 'walker'] as const).map(r => (
              <button key={r} type="button" onClick={() => { setRole(r); setError(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={role === r
                  ? { background: '#1B4332', color: 'white', boxShadow: '0 2px 10px rgba(27,67,50,0.35)' }
                  : { color: '#6B7280' }}>
                {r === 'owner' ? '🐾 Dog Owner' : '🦮 Dog Walker'}
              </button>
            ))}
          </div>

          {/* Avatar upload */}
          <div className="flex flex-col items-center mb-6">
            <div onClick={() => fileRef.current?.click()}
              className="relative w-[84px] h-[84px] rounded-full cursor-pointer shrink-0"
              style={{
                background: photoUrl ? 'transparent' : 'linear-gradient(135deg, #EBF5EF, #D1FAE5)',
                boxShadow: '0 0 0 4px white, 0 0 0 6px #EBF5EF',
              }}>
              {photoUrl
                ? <img src={photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Camera className="w-7 h-7" style={{ color: '#2B8A50' }} />
                    <span className="text-[9px] font-bold" style={{ color: '#2B8A50' }}>PHOTO</span>
                  </div>
              }
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: '#2B8A50' }}>
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: role === 'walker' ? '#DC2626' : '#9CA3AF' }}>
              {role === 'walker' ? 'Profile photo required' : 'Profile photo (optional)'}
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Fields */}
            <div className="bg-[#F9FAFB] rounded-2xl divide-y divide-gray-100 border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-14">
                <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name" required
                  className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 px-4 h-14">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Phone (0977 000 000)" required
                  className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 px-4 h-14">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" required
                  className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 px-4 h-14">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min. 6 chars)" required
                  className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-3 px-4 h-14">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm password" required
                  className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                {confirmPw && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${confirmPw === password ? 'bg-green-500' : 'bg-red-400'}`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Walker NRC */}
            {role === 'walker' && (
              <div className="rounded-2xl border-2 bg-white overflow-hidden" style={{ borderColor: '#2B8A50' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#EBF5EF' }}>
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-bold text-primary">Identity Verification Required</p>
                </div>
                <div className="flex items-center gap-3 px-4 h-14 border-t border-gray-100">
                  <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="text" value={nrc} onChange={e => setNrc(e.target.value)}
                    placeholder="NRC Number (e.g. 123456/78/9)" required={role === 'walker'}
                    className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                </div>
                <p className="px-4 pb-3 text-[11px] text-gray-400">Used for background verification only</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span className="shrink-0">⚠️</span> {error}
              </div>
            )}

            {/* Walker review notice */}
            {role === 'walker' && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-xs"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <span className="text-base shrink-0">⏳</span>
                <div>
                  <p className="font-bold text-amber-800 mb-0.5">Application review takes 24–48 hrs</p>
                  <p className="text-amber-700 leading-relaxed">Admin will verify your photo & NRC. You'll be emailed once approved.</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-14 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)', boxShadow: '0 8px 24px rgba(27,67,50,0.28)' }}>
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

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold hover:underline" style={{ color: '#2B8A50' }}>Sign in →</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            © 2025 PawFleet · Built for Zambia 🇿🇲
          </p>
        </div>
      </div>
    </div>
  );
}
