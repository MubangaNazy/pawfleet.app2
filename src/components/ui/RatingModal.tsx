import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Props {
  walkId: string;
  walkerName: string;
  onClose: () => void;
}

export default function RatingModal({ walkId, walkerName, onClose }: Props) {
  const { addRating } = useApp();
  const [stars, setStars]     = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  const handleSubmit = () => {
    if (!stars) return;
    setSaving(true);
    addRating(walkId, stars, comment.trim() || undefined);
    setTimeout(() => { setSaving(false); setDone(true); }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />

        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-extrabold text-ink text-base">Rate Your Walk 🌟</p>
            <p className="text-sm text-ink-muted">How did {walkerName} do?</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl">🌟</div>
            <p className="font-bold text-ink">Thank you for your review!</p>
            <p className="text-sm text-ink-muted">{walkerName} has been notified.</p>
            <button onClick={onClose}
              className="mt-2 px-8 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5 mt-5">
            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setStars(s)}
                  className="transition-transform active:scale-90">
                  <Star className={`w-10 h-10 transition-colors ${
                    s <= (hovered || stars)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-surface-border fill-surface-border'
                  }`} />
                </button>
              ))}
            </div>

            {stars > 0 && (
              <p className="text-center text-sm font-semibold text-ink-secondary">
                {['','Poor 😕','Fair 😐','Good 🙂','Great 😊','Excellent! 🤩'][stars]}
              </p>
            )}

            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="Leave a comment (optional)…"
              className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none" />

            <button type="button" onClick={handleSubmit} disabled={!stars || saving}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              {saving
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving…</>
                : <><Star className="w-4 h-4" /> Submit Review</>}
            </button>

            <button onClick={onClose}
              className="w-full py-2 text-xs text-ink-muted hover:text-ink transition-colors">
              Rate later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
