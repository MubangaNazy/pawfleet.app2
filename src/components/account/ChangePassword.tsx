import { useState } from 'react';
import { KeyRound, X, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/** "Change password": a row for the profile screen. Works for anyone logged in, no old password needed. */
export default function ChangePasswordRow() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const close = () => { if (!busy) { setOpen(false); setPw(''); setConfirm(''); setError(''); setDone(false); } };

  const submit = async () => {
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) { setError(err.message || 'Could not change your password. Please try again.'); return; }
    setDone(true);
    setTimeout(close, 1800);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
          <KeyRound className="w-4 h-4" style={{ color: '#2B8A50' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Change password</p>
          <p className="text-xs text-ink-muted">Update your login password</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={close}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {done ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7" style={{ color: '#2B8A50' }} />
                </div>
                <h3 className="font-extrabold text-ink text-lg">Password changed</h3>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-extrabold text-ink text-lg">Change password</h3>
                  <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-surface-hover">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">New password</label>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 6 characters" autoFocus
                  className="w-full border-2 border-surface-border rounded-xl px-4 py-3 text-sm text-ink mb-3 focus:outline-none focus:border-primary" />

                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Confirm new password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again"
                  className="w-full border-2 border-surface-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary" />

                {error && <p className="text-xs font-medium text-danger mt-3">{error}</p>}

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={close} disabled={busy}
                    className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={submit} disabled={busy || !pw || !confirm}
                    className="flex-1 py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
