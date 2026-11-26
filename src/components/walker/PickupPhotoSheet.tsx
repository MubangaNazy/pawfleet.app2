import { useRef, useState } from 'react';
import { Camera, Loader2, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sendWalkPhoto, sendWalkText } from '../../lib/walkPhotos';
import type { Walk } from '../../types';

const SKIP_REASONS = ['Camera not working', 'Owner handed over in person', 'Dog too anxious for a photo', 'Other'];

/**
 * Shown when a walker starts a walk. A photo of the dog at pickup goes to the owner's chat with a
 * notification, so the owner always sees who has their dog and when. Skipping needs a reason, which
 * is also sent to the owner.
 */
export default function PickupPhotoSheet({ walk, onContinue, onClose }: {
  walk: Walk;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { currentUser, data, sendNotification } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skipping, setSkipping] = useState(false);
  const dog = data.dogs.find(d => d.id === walk.dogId);
  const dogName = dog?.name || 'the dog';
  const walkerName = currentUser?.name || 'Your walker';

  const notifyOwner = (title: string, body: string) => {
    if (walk.ownerId) sendNotification(walk.ownerId, 'walk_pickup', title, body, { walkId: walk.id });
  };

  const onPhoto = async (file?: File) => {
    if (!file || !currentUser) return;
    setBusy(true);
    setError('');
    const r = await sendWalkPhoto(walk.id, currentUser.id, file);
    if (r.error) { setBusy(false); setError(r.error); return; }
    await sendWalkText(walk.id, currentUser.id, `📍 ${dog?.name || 'Your dog'} picked up at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Walk starting now.`);
    notifyOwner(`🐕 ${dog?.name || 'Your dog'} has been picked up`, `${walkerName} sent a pickup photo. Open the chat to see it and track the walk live.`);
    setBusy(false);
    onContinue();
  };

  const skip = async (reason: string) => {
    if (!currentUser) return;
    setBusy(true);
    await sendWalkText(walk.id, currentUser.id, `📍 ${dog?.name || 'Your dog'} picked up — no photo (${reason.toLowerCase()}). Walk starting now.`);
    notifyOwner(`🐕 ${dog?.name || 'Your dog'} has been picked up`, `${walkerName} started the walk without a photo: ${reason}.`);
    setBusy(false);
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 space-y-4">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Pickup photo</h2>
            <p className="text-sm text-ink-muted">Take a quick photo of {dogName} so the owner knows they're with you.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-[#EBF5EF] px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-ink">The photo goes straight to the owner's chat with a notification.</p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; onPhoto(f); }} />

        {error && <p className="text-sm text-danger text-center">{error}</p>}

        {!skipping ? (
          <>
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              className="w-full h-14 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Camera className="w-5 h-5" /> Take photo & start walk</>}
            </button>
            <button onClick={() => setSkipping(true)} disabled={busy} className="w-full py-2 text-xs text-ink-muted">
              Can't take a photo?
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Why no photo? (the owner will see this)</p>
            {SKIP_REASONS.map(r => (
              <button key={r} onClick={() => skip(r)} disabled={busy}
                className="w-full h-11 rounded-xl border border-surface-border text-sm text-ink text-left px-4 hover:bg-surface-secondary disabled:opacity-50">
                {r}
              </button>
            ))}
            <button onClick={() => setSkipping(false)} disabled={busy} className="w-full py-2 text-xs text-primary font-semibold">← Take a photo instead</button>
          </div>
        )}
      </div>
    </div>
  );
}
