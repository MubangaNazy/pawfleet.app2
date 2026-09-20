import { useState } from 'react';
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** "Delete my account": a quiet row on the profile screen and a confirmation that spells out what happens. */
export default function DeleteAccountRow() {
  const { deleteAccount, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!currentUser || currentUser.role === 'admin') return null;

  const close = () => { if (!busy && !done) { setOpen(false); setWord(''); setError(''); } };

  const confirm = async () => {
    setBusy(true);
    setError('');
    const res = await deleteAccount();
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Something went wrong. Please try again.'); return; }
    setDone(true);
    setTimeout(() => { window.location.replace('/login'); }, 2500);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-red-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4 text-danger" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Delete my account</p>
          <p className="text-xs text-ink-muted">Remove your login and personal details</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={close}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {done ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">👋</div>
                <h3 className="font-extrabold text-ink text-lg mb-1">Your account is deleted</h3>
                <p className="text-sm text-ink-muted">Thank you for being part of PawFleet. Taking you to the login screen…</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  </div>
                  <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-surface-hover">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-extrabold text-ink text-lg">Delete your account?</h3>
                <p className="text-sm text-ink-secondary mt-1 mb-4">This cannot be undone.</p>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                    <p className="font-bold text-red-700 mb-1">Deleted straight away</p>
                    <p className="text-red-700/90">Your login, name, phone, email, photos, ID card photo, pets without booking history, messages you sent, notifications and community posts.</p>
                  </div>
                  <div className="rounded-2xl bg-surface-secondary px-4 py-3">
                    <p className="font-bold text-ink mb-1">Kept without your details</p>
                    <p className="text-ink-secondary">Completed walks and payments stay as anonymous records, with names, addresses, notes and routes removed. Other people's earnings and our accounting depend on them.</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <p className="font-bold text-amber-800 mb-1">Open bookings</p>
                    <p className="text-amber-800/90">Bookings you have not finished will be cancelled.</p>
                  </div>
                </div>

                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mt-5 mb-1.5">Type DELETE to confirm</label>
                <input value={word} onChange={e => setWord(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="DELETE"
                  className="w-full border-2 border-surface-border rounded-xl px-4 py-3 text-sm font-bold tracking-widest text-ink focus:outline-none focus:border-danger" />

                {error && <p className="text-xs font-medium text-danger mt-3 leading-relaxed">{error}</p>}

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={close} disabled={busy}
                    className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary disabled:opacity-50">Keep my account</button>
                  <button type="button" onClick={confirm} disabled={busy || word.trim() !== 'DELETE'}
                    className="flex-1 py-3 rounded-2xl bg-danger text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : 'Delete forever'}
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
