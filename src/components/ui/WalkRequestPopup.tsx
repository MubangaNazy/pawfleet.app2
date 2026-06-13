import { useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  walkId: string;
  onDismiss: () => void;
}

export default function WalkRequestPopup({ walkId, onDismiss }: Props) {
  const { data, currentUser, assignWalker, declineWalk } = useApp();
  const navigate = useNavigate();

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

  const handleAccept = () => {
    if (!currentUser) return;
    assignWalker(walkId, currentUser.id);
    onDismiss();
    navigate(`/walker/walk/${walkId}`);
  };

  const handleDecline = () => {
    declineWalk(walkId);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Green header */}
        <div className="px-5 py-5 text-white text-center" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">New {isGrooming ? 'Grooming' : 'Walk'} Request</p>
          </div>
          <p className="text-2xl font-extrabold">K{walk.walkerEarning}</p>
          <p className="text-white/70 text-xs mt-0.5">Your earnings</p>
        </div>

        {/* Dog info */}
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0 border-2 border-primary/20">
              {dog?.imageUrl
                ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                : <span className="text-3xl">{isGrooming ? '✂️' : '🐕'}</span>}
            </div>
            <div>
              <p className="font-extrabold text-ink text-lg">{dog?.name || 'Unknown Dog'}</p>
              {dog?.breed && <p className="text-sm text-ink-muted">{dog.breed}</p>}
              <p className="text-xs text-ink-muted mt-0.5">Owner: {owner?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                <p className="text-[10px] text-ink-muted">Earn</p>
                <p className="text-xs font-bold text-ink">K{walk.walkerEarning}</p>
              </div>
            </div>
          </div>

          {isGrooming && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-2xl px-3 py-2">
              <span className="text-sm">✂️</span>
              <p className="text-xs font-semibold text-purple-700">Grooming Session</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={handleDecline}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all">
              <XCircle className="w-4 h-4" /> Decline
            </button>
            <button onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <CheckCircle2 className="w-4 h-4" /> Accept
            </button>
          </div>

          <button onClick={onDismiss} className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors">
            View later
          </button>
        </div>
      </div>
    </div>
  );
}
