import { useEffect, useRef } from 'react';
import { DollarSign, Calendar, CheckCircle2, XCircle, Smartphone, Banknote, CreditCard, MapPin, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  walkId: string;
  onDismiss: () => void;
  onDecline?: () => void; // optional callback so parent can update its declined list
}

const METHOD_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  mobile_money: { icon: Smartphone, label: 'Mobile Money', color: '#2B8A50' },
  cash:         { icon: Banknote,   label: 'Cash Payment', color: '#E67E22' },
  bank:         { icon: CreditCard, label: 'Bank Transfer', color: '#0D9488' },
  online:       { icon: CreditCard, label: 'Online / Card', color: '#1B4332' },
};

// Persist per-user declined walk IDs in localStorage
function getDeclinedKey(userId: string) { return `pawfleet_declined_${userId}`; }
export function addDeclinedWalk(userId: string, walkId: string) {
  const key = getDeclinedKey(userId);
  const existing = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
  existing.add(walkId);
  localStorage.setItem(key, JSON.stringify([...existing]));
}
export function getDeclinedWalks(userId: string): Set<string> {
  return new Set<string>(JSON.parse(localStorage.getItem(getDeclinedKey(userId)) || '[]'));
}

// Continuous phone-ring using Web Audio API
function useRingtone(active: boolean) {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) return;

    let stopped = false;
    let timerId: ReturnType<typeof setTimeout>;

    const play = () => {
      if (stopped) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        // Two short bursts per ring (classic phone ring pattern)
        [[0, 0.35], [0.45, 0.8]].forEach(([start, end]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = 880; // A5 — bright phone tone
          gain.gain.setValueAtTime(0, ctx.currentTime + start);
          gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.02);
          gain.gain.setValueAtTime(0.28, ctx.currentTime + end - 0.04);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + end);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + end);
        });
        // Close context after burst finishes to free memory
        setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1200);
      } catch { /* AudioContext unavailable in this browser */ }

      // Repeat every 2.5 s
      timerId = setTimeout(play, 2500);
    };

    play();

    stopRef.current = () => {
      stopped = true;
      clearTimeout(timerId);
    };

    return () => {
      stopped = true;
      clearTimeout(timerId);
    };
  }, [active]);

  return stopRef;
}

export default function WalkRequestPopup({ walkId, onDismiss, onDecline }: Props) {
  const { data, currentUser, assignWalker, declineWalk } = useApp();
  const navigate = useNavigate();
  const stopRingtoneRef = useRingtone(true); // start immediately on mount

  const walk = data.walks.find(w => w.id === walkId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const owner = data.users.find(u => u.id === walk?.ownerId);
  const isGrooming = walk?.notes?.startsWith('GROOMING:');

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!walk) return null;

  const stopRingtone = () => stopRingtoneRef.current?.();

  const payment = (data as any).payments?.find((p: any) => p.walkId === walkId);
  const payMethod = payment?.paymentMethod || payment?.payment_method || 'mobile_money';
  const methodInfo = METHOD_ICONS[payMethod] || METHOD_ICONS.mobile_money;
  const MethodIcon = methodInfo.icon;

  const cleanNotes = walk.notes?.startsWith('GROOMING:')
    ? walk.notes.replace(/^GROOMING:\s*/, '').trim()
    : walk.notes?.trim();

  const pickupAddress = walk.startLocation?.address || owner?.phone || 'Owner will share location';

  const handleAccept = () => {
    stopRingtone();
    if (!currentUser) return;
    assignWalker(walkId, currentUser.id);
    onDismiss();
    navigate(`/walker/walk/${walkId}`);
  };

  const handleDecline = () => {
    stopRingtone();
    if (currentUser) addDeclinedWalk(currentUser.id, walkId);
    declineWalk(walkId);
    onDecline?.();
    onDismiss();
  };

  const handleDismiss = () => {
    stopRingtone();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out', maxHeight: '92vh', overflowY: 'auto' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Green header with pulsing ring indicator */}
        <div className="px-5 py-5 text-white text-center relative" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-white animate-ping absolute opacity-60" />
            <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 ml-1">
              Incoming {isGrooming ? 'Grooming' : 'Walk'} Request 📲
            </p>
          </div>
          <p className="text-3xl font-extrabold mt-2">K{walk.walkerEarning}</p>
          <p className="text-white/70 text-xs mt-0.5">Your earnings for this job</p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Dog + Owner */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0 border-2 border-primary/20">
              {dog?.imageUrl
                ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                : <span className="text-3xl">{isGrooming ? '✂️' : '🐕'}</span>}
            </div>
            <div>
              <p className="font-extrabold text-ink text-lg">{dog?.name || 'Unknown Dog'}</p>
              {dog?.breed && <p className="text-sm text-ink-muted">{dog.breed}{dog.age ? ` · ${dog.age} yrs` : ''}</p>}
              <p className="text-xs text-ink-muted mt-0.5">Owner: <span className="font-semibold text-ink">{owner?.name}</span></p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-[#EBF5EF] rounded-2xl px-3 py-2.5">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: '#1B4332' }} />
              <div>
                <p className="text-[10px] text-ink-muted">Date</p>
                <p className="text-xs font-bold text-ink">{format(new Date(walk.scheduledDate), 'EEE, MMM d')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#EBF5EF] rounded-2xl px-3 py-2.5">
              <DollarSign className="w-4 h-4 shrink-0" style={{ color: '#1B4332' }} />
              <div>
                <p className="text-[10px] text-ink-muted">You Earn</p>
                <p className="text-xs font-bold text-ink">K{walk.walkerEarning}</p>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-surface-border">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
              <MethodIcon className="w-4 h-4" style={{ color: methodInfo.color }} />
            </div>
            <div>
              <p className="text-[10px] text-ink-muted">Payment Method</p>
              <p className="text-xs font-bold text-ink">{methodInfo.label}</p>
            </div>
          </div>

          {/* Pickup location */}
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-2xl border border-surface-border">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#EBF5EF' }}>
              <MapPin className="w-4 h-4" style={{ color: '#1B4332' }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-ink-muted">Pickup Location</p>
              <p className="text-xs font-semibold text-ink">{pickupAddress}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">Map shown after you accept</p>
            </div>
          </div>

          {/* Owner notes */}
          {cleanNotes && (
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-2xl bg-amber-50 border border-amber-200">
              <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-amber-600 font-bold mb-0.5">Owner's Note</p>
                <p className="text-xs text-amber-800 leading-relaxed">{cleanNotes}</p>
              </div>
            </div>
          )}

          {isGrooming && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-2xl px-3 py-2">
              <span className="text-sm">✂️</span>
              <p className="text-xs font-semibold text-purple-700">Full Grooming Session</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={handleDecline}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all">
              <XCircle className="w-4 h-4" />
              {isGrooming ? 'Decline Grooming' : 'Decline Walk'}
            </button>
            <button onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <CheckCircle2 className="w-4 h-4" />
              {isGrooming ? 'Accept Grooming' : 'Accept Walk'}
            </button>
          </div>

          <button onClick={handleDismiss} className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors">
            View later (ringtone stops)
          </button>
        </div>
      </div>
    </div>
  );
}
