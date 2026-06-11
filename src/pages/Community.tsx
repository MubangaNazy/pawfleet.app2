import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Tab = 'walkers' | 'owners';

export default function Community() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('walkers');

  // ── Top Walkers ──────────────────────────────────────────────
  const walkerUsers = data.users.filter(u => u.role === 'walker');

  const walkerRanks = walkerUsers
    .map(walker => {
      const completedWalks = data.walks.filter(
        w => w.walkerId === walker.id && w.status === 'completed'
      );
      const ratedWalks = completedWalks.filter(w => w.rating != null);
      const avgRating =
        ratedWalks.length > 0
          ? ratedWalks.reduce((sum, w) => sum + (w.rating ?? 0), 0) / ratedWalks.length
          : null;
      return {
        user: walker,
        completedCount: completedWalks.length,
        avgRating,
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount);

  const maxWalkerWalks = walkerRanks[0]?.completedCount || 1;

  // ── Top Owners ───────────────────────────────────────────────
  const ownerUsers = data.users.filter(u => u.role === 'owner');

  const ownerRanks = ownerUsers
    .map(owner => {
      const ownerWalks = data.walks.filter(w => w.ownerId === owner.id);
      const ownerDogs = data.dogs.filter(d => d.ownerId === owner.id);
      const totalSpent = ownerWalks
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + (w.ownerCost ?? w.price), 0);
      return {
        user: owner,
        totalWalks: ownerWalks.length,
        totalSpent,
        dogs: ownerDogs,
      };
    })
    .sort((a, b) => b.totalWalks - a.totalWalks);

  const rankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-ink-muted bg-surface-secondary border border-surface-border">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/80 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-300" />
              Community
            </h1>
            <p className="text-white/70 text-xs">PawFleet Leaderboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-white/15 backdrop-blur">
          {(['walkers', 'owners'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-white text-ink shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              {t === 'walkers' ? 'Top Walkers' : 'Dog Owners'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
        {tab === 'walkers' && (
          <>
            {walkerRanks.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-sm">No walkers yet.</div>
            ) : (
              walkerRanks.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const progressPct = maxWalkerWalks > 0
                  ? (entry.completedCount / maxWalkerWalks) * 100
                  : 0;
                const initial = entry.user.name[0]?.toUpperCase() || '?';

                return (
                  <div
                    key={entry.user.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isTop3
                        ? 'bg-white border-primary/30 shadow-md'
                        : 'bg-white border-surface-border shadow-sm'
                    }`}
                    style={isTop3 ? { borderLeft: `4px solid ${rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : '#CD7F32'}` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-9 flex items-center justify-center shrink-0">
                        {rankBadge(rank)}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white font-bold text-base"
                        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
                      >
                        {entry.user.imageUrl
                          ? <img src={entry.user.imageUrl} alt={entry.user.name} className="w-full h-full object-cover" />
                          : initial
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{entry.user.name}</p>
                        <p className="text-xs text-ink-muted">
                          {entry.completedCount} walk{entry.completedCount !== 1 ? 's' : ''} completed
                          {entry.avgRating != null && (
                            <span className="ml-2 text-amber-500 font-medium">
                              ★ {entry.avgRating.toFixed(1)}
                            </span>
                          )}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-1.5 w-full h-1.5 bg-[#EBF5EF] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progressPct}%`,
                              background: rank === 1 ? '#F59E0B' : '#2B8A50',
                            }}
                          />
                        </div>
                      </div>

                      {/* Walks count badge */}
                      <div
                        className="shrink-0 text-center px-2.5 py-1.5 rounded-xl"
                        style={{ background: '#EBF5EF' }}
                      >
                        <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>
                          {entry.completedCount}
                        </p>
                        <p className="text-[9px] text-ink-muted leading-none mt-0.5">walks</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === 'owners' && (
          <>
            {ownerRanks.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-sm">No owners yet.</div>
            ) : (
              ownerRanks.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const initial = entry.user.name[0]?.toUpperCase() || '?';

                return (
                  <div
                    key={entry.user.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isTop3
                        ? 'bg-white border-primary/30 shadow-md'
                        : 'bg-white border-surface-border shadow-sm'
                    }`}
                    style={isTop3 ? { borderLeft: `4px solid ${rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : '#CD7F32'}` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-9 flex items-center justify-center shrink-0">
                        {rankBadge(rank)}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white font-bold text-base"
                        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
                      >
                        {entry.user.imageUrl
                          ? <img src={entry.user.imageUrl} alt={entry.user.name} className="w-full h-full object-cover" />
                          : initial
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{entry.user.name}</p>
                        <p className="text-xs text-ink-muted">
                          {entry.totalWalks} walk{entry.totalWalks !== 1 ? 's' : ''} booked
                          <span className="ml-2 font-medium" style={{ color: '#2B8A50' }}>
                            K{(entry.totalSpent / 1000).toFixed(1)}k spent
                          </span>
                        </p>
                        {entry.dogs.length > 0 && (
                          <p className="text-[11px] text-ink-muted mt-0.5 truncate">
                            🐕 {entry.dogs.map(d => d.name).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Walks count badge */}
                      <div
                        className="shrink-0 text-center px-2.5 py-1.5 rounded-xl"
                        style={{ background: '#EBF5EF' }}
                      >
                        <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>
                          {entry.totalWalks}
                        </p>
                        <p className="text-[9px] text-ink-muted leading-none mt-0.5">walks</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
