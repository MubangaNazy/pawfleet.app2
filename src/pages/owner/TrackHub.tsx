import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Navigation, Plus, ChevronRight, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TrackHub() {
  const { currentUser, data } = useApp();
  const navigate = useNavigate();

  const myDogs   = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const myWalks  = data.walks.filter(w => w.ownerId === currentUser?.id);
  const activeWalk   = myWalks.find(w => w.status === 'active');
  const assignedWalks = myWalks
    .filter(w => w.status === 'assigned')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  const pendingWalks = myWalks.filter(w => w.status === 'pending');
  const completedWalks = myWalks.filter(w => w.status === 'completed');

  // Redirect to live tracker if there's an active walk
  useEffect(() => {
    if (activeWalk) navigate(`/owner/track/${activeWalk.id}`, { replace: true });
  }, [activeWalk?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dogLastWalk = (dogId: string) => {
    const walks = myWalks.filter(w => w.dogId === dogId && w.status === 'completed');
    if (!walks.length) return null;
    return walks.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
  };

  if (activeWalk) return null;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* Hero gradient */}
      <div className="relative overflow-hidden px-5 pt-7 pb-8"
        style={{ background: 'linear-gradient(145deg, #1B4332 0%, #2B8A50 55%, #52B788 100%)' }}>
        <div className="absolute top-0 right-0 w-52 h-52 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(35%,-35%)' }} />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(-30%, 35%)' }} />

        <div className="relative">
          <p className="text-white/60 text-sm font-medium mb-0.5">PawFleet</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Track & Book</h1>
          <p className="text-white/60 text-sm mt-1">Your dogs · Walks · Services</p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Walks done', value: completedWalks.length },
              { label: 'Upcoming', value: assignedWalks.length + pendingWalks.length },
              { label: 'Dogs', value: myDogs.length },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/60 text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* No active walk indicator */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-surface-border bg-white">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <p className="text-sm text-ink-muted flex-1">No walk in progress right now</p>
          <Link to="/owner/request"
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            Book now
          </Link>
        </div>

        {/* Upcoming / assigned walks */}
        {(assignedWalks.length > 0 || pendingWalks.length > 0) && (
          <div>
            <p className="text-sm font-bold text-ink mb-3">Upcoming Walks</p>
            <div className="space-y-2">
              {[...assignedWalks, ...pendingWalks].slice(0, 5).map(walk => {
                const dog    = data.dogs.find(d => d.id === walk.dogId);
                const walker = data.users.find(u => u.id === walk.walkerId);
                return (
                  <button key={walk.id} type="button"
                    onClick={() => navigate(`/owner/track/${walk.id}`)}
                    className="w-full flex items-center gap-3 p-4 bg-white border border-surface-border rounded-2xl text-left hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-secondary shrink-0 flex items-center justify-center">
                      {dog?.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                        : <span className="text-2xl">🐕</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-sm">{dog?.name ?? 'Unknown'}'s Walk</p>
                      <p className="text-xs text-ink-muted truncate">
                        {walk.status === 'assigned' && walker
                          ? `Walker: ${walker.name}`
                          : 'Finding a walker…'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {format(parseISO(walk.scheduledDate), 'EEE d MMM · h:mm a')}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: walk.status === 'assigned' ? '#EBF5EF' : '#FEF3C7' }}>
                      <Navigation className="w-4 h-4"
                        style={{ color: walk.status === 'assigned' ? '#1B4332' : '#D97706' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Book a service */}
        <div>
          <p className="text-sm font-bold text-ink mb-3">Book a Service</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/owner/request',  emoji: '🦮', label: 'Dog Walk',       bg: '#EBF5EF' },
              { to: '/owner/grooming', emoji: '✂️', label: 'Home Grooming',  bg: '#FFF3E0' },
              { to: '/owner/vet',      emoji: '🏥', label: 'Vet Visit',      bg: '#E8F4FD' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-border rounded-2xl hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: item.bg }}>
                  {item.emoji}
                </div>
                <p className="text-xs font-bold text-ink leading-tight">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Dog profiles */}
        {myDogs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink">Your Dogs</p>
              <Link to="/owner/dogs" className="text-xs font-semibold" style={{ color: '#2B8A50' }}>Manage →</Link>
            </div>
            <div className="space-y-3">
              {myDogs.map(dog => {
                const last = dogLastWalk(dog.id);
                const days = last ? differenceInDays(new Date(), parseISO(last.scheduledDate)) : null;
                const overdue = days === null || days > 2;
                return (
                  <div key={dog.id}
                    className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-secondary shrink-0">
                      {dog.imageUrl
                        ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🐕</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-ink">{dog.name}</p>
                      <p className="text-xs text-ink-muted">{dog.breed}</p>
                      <p className="text-xs mt-1.5 font-medium"
                        style={{ color: overdue ? '#D97706' : '#2B8A50' }}>
                        {days === null ? '🐾 No walks yet'
                          : days === 0 ? '✅ Walked today'
                          : `⏱ ${days}d since last walk`}
                      </p>
                    </div>
                    <Link to="/owner/request"
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white"
                      style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                      <Plus className="w-5 h-5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {myDogs.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">🐾</div>
            <p className="font-extrabold text-ink text-lg">Add your first dog</p>
            <p className="text-ink-muted text-sm mt-2 mb-6">Register your pet to start booking walks and services</p>
            <Link to="/owner/dogs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              Add a Dog
            </Link>
          </div>
        )}

        {/* Walk history link */}
        <Link to="/owner/history"
          className="flex items-center justify-between p-4 bg-white border border-surface-border rounded-2xl hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5EF' }}>
              <RefreshCw className="w-4 h-4" style={{ color: '#1B4332' }} />
            </div>
            <div>
              <p className="font-bold text-ink text-sm">Walk History</p>
              <p className="text-xs text-ink-muted">{completedWalks.length} completed</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </Link>
      </div>
    </div>
  );
}
