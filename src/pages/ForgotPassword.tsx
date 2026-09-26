import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); setBusy(false); return; }
      setSent(true);
    } catch {
      setError("We can't reach PawFleet right now. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F4F9F6]">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <PawFleetLogo size={44} showText />
        </div>

        {sent ? (
          <div className="bg-white rounded-3xl shadow-sm border border-surface-border p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" style={{ color: '#2B8A50' }} />
            </div>
            <h2 className="font-extrabold text-ink text-lg">Check your email</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset the password. It works once and expires in 30 minutes.
            </p>
            <Link to="/login" className="inline-block text-sm font-bold text-primary mt-2">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-3xl shadow-sm border border-surface-border p-6 space-y-4">
            <div>
              <h2 className="font-extrabold text-ink text-xl mb-1">Reset your password</h2>
              <p className="text-sm text-ink-muted">Enter the email on your account and we'll send you a reset link.</p>
            </div>
            <div className="relative group input-focus rounded-xl">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all"
              />
            </div>
            {error && <p className="text-sm text-danger font-medium">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
            </button>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-ink-muted hover:text-ink">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
