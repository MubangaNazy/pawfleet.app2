import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function FavouriteWalkers() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`pawfleet_favs_${currentUser?.id}`) || '[]'); }
    catch { return []; }
  });

  const toggleFav = (walkerId: string) => {
    const updated = favourites.includes(walkerId)
      ? favourites.filter(id => id !== walkerId)
      : [...favourites, walkerId];
    setFavourites(updated);
    localStorage.setItem(`pawfleet_favs_${currentUser?.id}`, JSON.stringify(updated));
  };

  // Walkers this owner has used (from completed walks)
  const usedWalkerIds = [...new Set(
    data.walks
      .filter(w => w.ownerId === currentUser?.id && w.status === 'completed' && w.walkerId)
      .map(w => w.walkerId!)
  )];
  const allWalkers = data.users.filter(u => u.role === 'walker' && (u.walkerStatus === 'active' || !u.walkerStatus));

  const favWalkers = allWalkers.filter(w => favourites.includes(w.id));
  const otherWalkers = allWalkers.filter(w => !favourites.includes(w.id));

  const getWalkerStats = (walkerId: string) => {
    const completed = data.walks.filter(w => w.walkerId === walkerId && w.status === 'completed');
    const rated = completed.filter(w => w.rating);
    const avg = rated.length ? (rated.reduce((s, w) => s + (w.rating || 0), 0) / rated.length).toFixed(1) : null;
    return { completed: completed.length, avg };
  };

  const WalkerCard = ({ walker }: { walker: typeof allWalkers[0] }) => {
    const stats = getWalkerStats(walker.id);
    const isFav = favourites.includes(walker.id);
    const hasUsed = usedWalkerIds.includes(walker.id);
    return (
      <div className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0 border-2 border-surface-border">
          {walker.imageUrl
            ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
            : <span className="text-xl font-bold" style={{ color: '#2B8A50' }}>{walker.name[0]}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm">{walker.name}</p>
          <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
            {stats.avg && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{stats.avg}</span>}
            <span>{stats.completed} walks</span>
            {hasUsed && <span className="text-primary font-semibold">· Booked before</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/owner/request" className="text-xs font-bold text-white px-3 py-1.5 rounded-xl" style={{ background: '#1B4332' }}>
            Book
          </Link>
          <button onClick={() => toggleFav(walker.id)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isFav ? 'bg-red-50' : 'hover:bg-surface-hover'}`}>
            <Heart className={`w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-ink-muted'}`} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-28">
      <div className="sticky top-0 z-10 bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink flex-1">Favourite Walkers</h1>
        <span className="text-xs text-ink-muted">{favourites.length} saved</span>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {favWalkers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">❤️ Your Favourites</p>
            <div className="space-y-2">{favWalkers.map(w => <WalkerCard key={w.id} walker={w} />)}</div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">
            {favWalkers.length > 0 ? '🐾 All Walkers' : '🐾 Available Walkers'}
          </p>
          {otherWalkers.length === 0
            ? <div className="text-center py-12"><Heart className="w-10 h-10 text-ink-muted mx-auto mb-2" /><p className="text-sm text-ink-muted">No walkers yet</p></div>
            : <div className="space-y-2">{otherWalkers.map(w => <WalkerCard key={w.id} walker={w} />)}</div>
          }
        </div>
      </div>
    </div>
  );
}
