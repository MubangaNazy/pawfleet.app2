import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Something went wrong. Please try again.'); setBusy(false); return; }
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError("We can't reach PawFleet right now. Check your connection and try again.");
    }
    setBusy(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F4F9F6] text-center gap-3">
        <p className="font-bold text-ink">This reset link is invalid.</p>
        <Link to="/forgot-password" className="text-sm font-bold text-primary">Request a new one</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F4F9F6]">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <PawFleetLogo size={44} showText />
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-surface-border p-6">
          {done ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" style={{ color: '#2B8A50' }} />
              </div>
              <h2 className="font-extrabold text-ink text-lg">Password reset</h2>
              <p className="text-sm text-ink-muted">Taking you to login…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h2 className="font-extrabold text-ink text-xl mb-1">Choose a new password</h2>
                <p className="text-sm text-ink-muted">Must be at least 6 characters.</p>
              </div>
              <div className="relative group input-focus rounded-xl">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                  autoFocus
                  placeholder="New password"
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative group input-focus rounded-xl">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all"
                />
              </div>
              {error && <p className="text-sm text-danger font-medium">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
