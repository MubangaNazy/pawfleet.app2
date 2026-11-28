import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Phone, Lock, Mail, User as UserIcon,
  ArrowRight, Check, Shield, Camera, CreditCard, Store, MapPin,
} from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';
import { useApp } from '../context/AppContext';
import { prepareImage } from '../lib/image';
import ApplicationForm from '../components/apply/ApplicationForm';
import { applicationProblem, cleanApplication, type ApplicationValues, type ApplyService } from '../lib/applications';

const ROLE_ROUTES = { owner: '/owner', walker: '/walker' };

type Kind = 'owner' | 'walker' | 'groomer' | 'trainer' | 'breeder';
const KINDS: { value: Kind; emoji: string; label: string; desc: string; noun: string; title: string; subtitle: string }[] = [
  { value: 'owner',   emoji: '🐾', label: 'Pet Owner',  desc: 'Book walks & services', noun: 'account', title: 'Join PawFleet', subtitle: "Zambia's trusted dog care app 🇿🇲" },
  { value: 'walker',  emoji: '🦮', label: 'Dog Walker', desc: 'Walk dogs & earn',      noun: 'walker',  title: 'Become a Walker', subtitle: 'Earn by walking dogs near you' },
  { value: 'groomer', emoji: '✂️', label: 'Groomer',    desc: 'Person or business',     noun: 'groomer', title: 'Join as a Groomer', subtitle: 'Get grooming bookings from dog owners' },
  { value: 'trainer', emoji: '🎓', label: 'Dog Trainer', desc: 'Train dogs & earn',      noun: 'trainer', title: 'Join as a Trainer', subtitle: 'Get training requests from dog owners' },
  { value: 'breeder', emoji: '🏡', label: 'Breeder / Shelter', desc: 'List dogs for adoption', noun: 'breeder', title: 'Breeders & Shelters', subtitle: 'Get verified to list dogs on Adopt a Pet' },
];

// Photo answers are kept as data: URLs here; register() uploads them once the account exists.
function photoAnswers(_service: ApplyService, v: ApplicationValues): ApplicationValues {
  return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string' && x.startsWith('data:')));
}

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const fileRef    = useRef<HTMLInputElement>(null);
  const nrcFileRef = useRef<HTMLInputElement>(null);

  // What they are signing up as. Walkers and groomers share the provider account type in the database,
  // but each applies for its own service, approved separately by an admin.
  const [kind, setKind]               = useState<Kind>('owner');
  const role: 'owner' | 'walker'      = kind === 'walker' || kind === 'groomer' || kind === 'trainer' ? 'walker' : 'owner';
  // Groomers, trainers and breeders fill in the application form for their service.
  const applyService: ApplyService | null = kind === 'groomer' ? 'grooming' : kind === 'trainer' ? 'training' : kind === 'breeder' ? 'breeder' : null;
  const [answers, setAnswers] = useState<ApplicationValues>({});
  const needsId                       = kind !== 'owner';
  const [isBusiness, setIsBusiness]   = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessArea, setBusinessArea] = useState('');
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [nrc, setNrc]                 = useState('');
  const [nrcImageUrl, setNrcImageUrl] = useState('');
  const [photoUrl, setPhotoUrl]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
  const [pendingApproval, setPending] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setPhotoUrl(await prepareImage(file, { maxDim: 600, maxBytes: 90_000 })); setError(''); }
    catch (err: any) { setError(err?.message || 'Could not use that photo. Please try another.'); }
  };

  const handleNrcImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Bigger than a profile photo so the card text stays readable, still far smaller than the original.
    try { setNrcImageUrl(await prepareImage(file, { maxDim: 1400, quality: 0.75, maxBytes: 300_000 })); setError(''); }
    catch (err: any) { setError(err?.message || 'Could not use that photo. Please try another.'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    if (password.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    if (needsId) {
      if (!photoUrl)       { setError(isBusiness ? 'Add your logo or a photo of your business.' : 'A profile photo is required.'); return; }
      if (!nrc.trim())     { setError(isBusiness ? 'Enter your NRC or business registration (PACRA) number.' : 'NRC number is required.'); return; }
      if (!nrcImageUrl)    { setError(isBusiness ? 'Add a photo of your NRC or registration certificate.' : 'A photo of your NRC card is required.'); return; }
      if ((isBusiness || kind === 'breeder') && kind !== 'walker' && !businessName.trim()) { setError(kind === 'breeder' ? 'Enter your kennel or shelter name.' : 'Enter your business name.'); return; }
      if (kind !== 'walker' && !businessArea.trim()) { setError('Enter your area, e.g. Kabulonga, Lusaka.'); return; }
    }
    if (applyService) {
      const problem = applicationProblem(applyService, answers, { isBusiness });
      if (problem) { setError(problem); return; }
    }
    const service = kind === 'walker' ? 'walking' : applyService;
    setLoading(true);
    const result = await register(name, phone, email, password, role, {
      photoUrl: photoUrl || undefined,
      nrc: needsId ? nrc.trim() : undefined,
      nrcImageUrl: needsId ? nrcImageUrl || undefined : undefined,
      approvals: service ? { [service]: 'applied' } : undefined,
      businessName: businessName.trim() || undefined,
      businessAddress: businessArea.trim() || undefined,
      businessType: kind === 'groomer' ? (isBusiness ? 'grooming_business' : 'groomer') : kind === 'breeder' ? (isBusiness ? 'shelter' : 'breeder') : kind === 'trainer' ? 'trainer' : undefined,
      applications: applyService
        ? { [applyService]: { ...cleanApplication(applyService, answers, { isBusiness }), ...photoAnswers(applyService, answers) } }
        : undefined,
    });
    setLoading(false);
    if (result.success) {
      if (result.pendingApproval) { setPending(true); return; }
      if (kind === 'breeder') { setPending(true); return; }
      if (result.user) navigate(ROLE_ROUTES[role as keyof typeof ROLE_ROUTES]);
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
                style={{ background: 'rgba(255,255,255,0.12)' }}>{KINDS.find(k => k.value === kind)?.emoji}</div>
              <h2 className="text-xl font-extrabold text-white mb-1">Application Submitted!</h2>
              <p className="text-white/55 text-sm">Your {KINDS.find(k => k.value === kind)?.noun} application is under review</p>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-3 mb-6">
                {['PawFleet checks your photo and documents', "We'll notify you in the app when you're approved", kind === 'breeder' ? 'Then you can list pets on Adopt a Pet' : kind === 'groomer' ? 'Then set your grooming price and start taking bookings' : kind === 'trainer' ? 'Then set your training price and start taking requests' : 'Log in any time to check — then start accepting walks!'].map((s, i) => (
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
              {KINDS.find(k => k.value === kind)?.title}
            </h1>
            <p className="text-white/60 text-sm mt-0.5">
              {KINDS.find(k => k.value === kind)?.subtitle}
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
          <div className="grid grid-cols-2 gap-2 mb-6">
            {KINDS.map(r => (
              <button key={r.value} type="button" onClick={() => { setKind(r.value); setIsBusiness(false); setError(''); setAnswers({}); }}
                className="p-3 rounded-2xl border-2 text-left transition-all"
                style={kind === r.value
                  ? { borderColor: '#1B4332', background: '#EBF5EF' }
                  : { borderColor: '#E5E7EB', background: 'white' }}>
                <p className="text-sm font-bold text-ink">{r.emoji} {r.label}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>

          {(kind === 'groomer' || kind === 'breeder') && (
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-2xl bg-gray-100">
              {[false, true].map(b => (
                <button key={String(b)} type="button" onClick={() => setIsBusiness(b)}
                  className={`h-10 rounded-xl text-xs font-bold ${isBusiness === b ? 'bg-white text-ink shadow-sm' : 'text-gray-500'}`}>
                  {kind === 'groomer' ? (b ? 'Grooming business' : 'Individual groomer') : (b ? 'Shelter / rescue' : 'Breeder')}
                </button>
              ))}
            </div>
          )}

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
            <p className="text-xs mt-2" style={{ color: needsId ? '#DC2626' : '#9CA3AF' }}>
              {needsId ? (isBusiness ? 'Logo or business photo required' : 'Profile photo required') : 'Profile photo (optional)'}
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Fields */}
            <div className="bg-[#F9FAFB] rounded-2xl divide-y divide-gray-100 border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-14">
                <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={isBusiness ? 'Contact person (full name)' : 'Full name'} required
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

            {/* Business / kennel details */}
            {(kind === 'groomer' || kind === 'breeder') && (
              <div className="bg-[#F9FAFB] rounded-2xl divide-y divide-gray-100 border border-gray-100 overflow-hidden">
                {(isBusiness || kind === 'breeder') && (
                  <div className="flex items-center gap-3 px-4 h-14">
                    <Store className="w-4 h-4 text-gray-400 shrink-0" />
                    <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                      placeholder={kind === 'breeder' ? (isBusiness ? 'Shelter / rescue name' : 'Kennel name') : 'Business name'}
                      className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 h-14">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="text" value={businessArea} onChange={e => setBusinessArea(e.target.value)}
                    placeholder="Area, e.g. Kabulonga, Lusaka"
                    className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                </div>
              </div>
            )}

            {/* Identity / registration */}
            {needsId && (
              <div className="rounded-2xl border-2 bg-white overflow-hidden" style={{ borderColor: '#2B8A50' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#EBF5EF' }}>
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-bold text-primary">{isBusiness ? 'Business Verification Required' : 'Identity Verification Required'}</p>
                </div>
                <div className="flex items-center gap-3 px-4 h-14 border-t border-gray-100">
                  <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                  <input type="text" value={nrc} onChange={e => setNrc(e.target.value)}
                    placeholder={isBusiness ? 'NRC or PACRA registration number' : 'NRC Number (e.g. 123456/78/9)'} required={needsId}
                    className="flex-1 h-full bg-transparent text-sm placeholder:text-gray-400 focus:outline-none" />
                </div>
                {/* NRC photo upload */}
                <div className="px-4 pt-3 pb-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2.5">
                    {isBusiness ? 'NRC or certificate photo' : 'NRC Card Photo'} <span className="text-red-500">*</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => nrcFileRef.current?.click()}
                      className="w-24 h-16 rounded-xl overflow-hidden cursor-pointer flex items-center justify-center shrink-0"
                      style={{
                        border: `2px dashed ${nrcImageUrl ? '#2B8A50' : '#D1D5DB'}`,
                        background: nrcImageUrl ? 'transparent' : '#F9FAFB',
                      }}>
                      {nrcImageUrl
                        ? <img src={nrcImageUrl} alt="NRC" className="w-full h-full object-cover" />
                        : <div className="flex flex-col items-center gap-1">
                            <Camera className="w-5 h-5 text-gray-400" />
                            <span className="text-[9px] font-medium text-gray-400">NRC photo</span>
                          </div>
                      }
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                        Take a clear photo of both sides of your NRC card
                      </p>
                      <button type="button" onClick={() => nrcFileRef.current?.click()}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: '#2B8A50', color: '#2B8A50' }}>
                        {nrcImageUrl ? 'Change Photo' : 'Upload NRC Photo'}
                      </button>
                    </div>
                  </div>
                  <input ref={nrcFileRef} type="file" accept="image/*" capture="environment"
                    className="hidden" onChange={handleNrcImage} />
                </div>
                <p className="px-4 pb-3 text-[11px] text-gray-400">Used for background verification only</p>
              </div>
            )}

            {applyService && (
              <ApplicationForm service={applyService} value={answers} onChange={setAnswers} ctx={{ isBusiness }} />
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span className="shrink-0">⚠️</span> {error}
              </div>
            )}

            {/* Review notice */}
            {needsId && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-xs"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <span className="text-base shrink-0">⏳</span>
                <div>
                  <p className="font-bold text-amber-800 mb-0.5">Application review takes 24–48 hrs</p>
                  <p className="text-amber-700 leading-relaxed">PawFleet checks your photo and documents before you can {kind === 'breeder' ? 'list pets' : 'take bookings'}. You can log in any time to check.</p>
                </div>
              </div>
            )}

            {/* Terms & Privacy */}
            <p className="text-xs text-gray-500 text-center leading-relaxed px-2">
              By creating an account, you agree to PawFleet's{' '}
              <Link to="/privacy-policy#terms" className="font-semibold hover:underline" style={{ color: '#2B8A50' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy-policy#privacy" className="font-semibold hover:underline" style={{ color: '#2B8A50' }}>Privacy Policy</Link>.
            </p>

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
                  {needsId ? 'Submitting application…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {needsId ? `Submit ${KINDS.find(k => k.value === kind)?.noun} application` : 'Create My Account'}
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
            <p className="text-xs text-gray-400 mt-2">Signing up as a vet clinic or a shop? Ask an admin to set up your account.</p>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            © 2025 PawFleet · Built for Zambia 🇿🇲
          </p>
        </div>
      </div>
    </div>
  );
}
