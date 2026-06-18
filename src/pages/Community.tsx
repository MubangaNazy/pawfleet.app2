import { useState } from 'react';
import { Trophy, Star, Dog, TrendingUp, Award, MessageCircle, Facebook } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Tab = 'walkers' | 'owners';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7F32'];

// Community channel links — update these when groups are created
const ROLE_CHANNELS: Record<string, { label: string; whatsapp: string; facebook: string }> = {
  walker:    { label: 'PawFleet Walkers',        whatsapp: '', facebook: '' },
  owner:     { label: "PawFleet Dog Owners",     whatsapp: '', facebook: '' },
  shopowner: { label: 'PawFleet Shop Owners',    whatsapp: '', facebook: '' },
};
const GENERAL_CHANNEL = { label: 'PawFleet General Community', whatsapp: '', facebook: '' };

function ChannelCard({ name, whatsapp, facebook }: { name: string; whatsapp: string; facebook: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-border">
        <p className="font-bold text-sm text-ink">{name}</p>
      </div>
      <div className="flex divide-x divide-surface-border">
        <a
          href={whatsapp || undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { if (!whatsapp) e.preventDefault(); }}
          className={`flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors ${whatsapp ? 'hover:bg-green-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#25D366' }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-semibold text-ink">WhatsApp</p>
          <p className="text-[10px]" style={{ color: whatsapp ? '#25D366' : '#9CA3AF' }}>
            {whatsapp ? 'Join group' : 'Coming soon'}
          </p>
        </a>
        <a
          href={facebook || undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { if (!facebook) e.preventDefault(); }}
          className={`flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors ${facebook ? 'hover:bg-blue-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#1877F2' }}>
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-semibold text-ink">Facebook</p>
          <p className="text-[10px]" style={{ color: facebook ? '#1877F2' : '#9CA3AF' }}>
            {facebook ? 'Join group' : 'Coming soon'}
          </p>
        </a>
      </div>
    </div>
  );
}

export default function Community() {
  const { data, currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('walkers');

  const role = currentUser?.role || 'owner';
  const showLeaderboard = role === 'walker' || role === 'owner';
  const roleChannel = ROLE_CHANNELS[role];

  const walkerRanks = data.users
    .filter(u => u.role === 'walker')
    .map(walker => {
      const completed = data.walks.filter(w => w.walkerId === walker.id && w.status === 'completed');
      const rated = completed.filter(w => w.rating != null);
      const avgRating = rated.length ? rated.reduce((s, w) => s + (w.rating ?? 0), 0) / rated.length : null;
      const earned = completed.reduce((s, w) => s + (w.walkerEarning || 0), 0);
      return { user: walker, completedCount: completed.length, avgRating, earned };
    })
    .sort((a, b) => b.completedCount - a.completedCount || (b.avgRating ?? 0) - (a.avgRating ?? 0));

  const ownerRanks = data.users
    .filter(u => u.role === 'owner')
    .map(owner => {
      const walks = data.walks.filter(w => w.ownerId === owner.id);
      const dogs = data.dogs.filter(d => d.ownerId === owner.id);
      const spent = walks.filter(w => w.status === 'completed').reduce((s, w) => s + (w.ownerCost ?? w.price), 0);
      return { user: owner, totalWalks: walks.length, spent, dogs };
    })
    .sort((a, b) => b.totalWalks - a.totalWalks);

  const maxWalks = walkerRanks[0]?.completedCount || 1;
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Hero header */}
      <div className="px-5 pt-8 pb-5" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Community</h1>
            <p className="text-white/70 text-xs">Lusaka's PawFleet family</p>
          </div>
        </div>

        {showLeaderboard && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'Walkers', value: data.users.filter(u => u.role === 'walker').length },
                { label: 'Walks Done', value: data.walks.filter(w => w.status === 'completed').length },
                { label: 'Dogs', value: data.dogs.length },
              ].map(s => (
                <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
                  <p className="text-xl font-extrabold text-white">{s.value}</p>
                  <p className="text-white/70 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-2xl bg-white/15">
              {(['walkers', 'owners'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tab === t ? 'bg-white text-ink shadow-sm' : 'text-white/80 hover:text-white'
                  }`}>
                  {t === 'walkers' ? '🦮 Top Walkers' : '🐾 Dog Owners'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        {showLeaderboard && (
          <>
            {/* Top 3 podium (walkers) */}
            {tab === 'walkers' && walkerRanks.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[walkerRanks[1], walkerRanks[0], walkerRanks[2]].map((entry, podiumIdx) => {
                  const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                  const height = podiumIdx === 1 ? 'h-20' : 'h-14';
                  return (
                    <div key={entry.user.id} className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                        {entry.user.imageUrl
                          ? <img src={entry.user.imageUrl} alt={entry.user.name} className="w-full h-full object-cover" />
                          : initials(entry.user.name)}
                      </div>
                      <p className="text-[10px] font-bold text-ink text-center leading-tight truncate w-full px-1">
                        {entry.user.name.split(' ')[0]}
                      </p>
                      <div className={`w-full ${height} rounded-t-xl flex items-center justify-center text-xl`}
                        style={{ background: `${MEDAL_COLORS[rank - 1]}22`, borderTop: `3px solid ${MEDAL_COLORS[rank - 1]}` }}>
                        {MEDAL[rank - 1]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Walker list */}
            {tab === 'walkers' && (
              walkerRanks.length === 0
                ? <EmptyState text="No walkers have completed any walks yet." />
                : walkerRanks.map((entry, idx) => {
                    const rank = idx + 1;
                    const pct = (entry.completedCount / maxWalks) * 100;
                    return (
                      <div key={entry.user.id}
                        className="bg-white rounded-2xl border overflow-hidden"
                        style={{ borderColor: rank <= 3 ? MEDAL_COLORS[rank - 1] + '55' : '#E5E7EB', borderLeftWidth: rank <= 3 ? 4 : 1, borderLeftColor: rank <= 3 ? MEDAL_COLORS[rank - 1] : '#E5E7EB' }}>
                        <div className="flex items-center gap-3 p-3.5">
                          <div className="w-8 text-center shrink-0">
                            {rank <= 3
                              ? <span className="text-xl">{MEDAL[rank - 1]}</span>
                              : <span className="text-sm font-bold text-ink-muted">#{rank}</span>}
                          </div>
                          <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                            {entry.user.imageUrl
                              ? <img src={entry.user.imageUrl} alt={entry.user.name} className="w-full h-full object-cover" />
                              : initials(entry.user.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ink truncate">{entry.user.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-ink-muted">{entry.completedCount} walks</span>
                              {entry.avgRating != null && (
                                <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {entry.avgRating.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rank === 1 ? '#F59E0B' : '#2B8A50' }} />
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>K{entry.earned}</p>
                            <p className="text-[9px] text-ink-muted">earned</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
            )}

            {/* Owner list */}
            {tab === 'owners' && (
              ownerRanks.length === 0
                ? <EmptyState text="No owners have booked walks yet." />
                : ownerRanks.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <div key={entry.user.id}
                        className="bg-white rounded-2xl border overflow-hidden"
                        style={{ borderColor: rank <= 3 ? MEDAL_COLORS[rank - 1] + '55' : '#E5E7EB', borderLeftWidth: rank <= 3 ? 4 : 1, borderLeftColor: rank <= 3 ? MEDAL_COLORS[rank - 1] : '#E5E7EB' }}>
                        <div className="flex items-center gap-3 p-3.5">
                          <div className="w-8 text-center shrink-0">
                            {rank <= 3
                              ? <span className="text-xl">{MEDAL[rank - 1]}</span>
                              : <span className="text-sm font-bold text-ink-muted">#{rank}</span>}
                          </div>
                          <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2B8A50, #52B788)' }}>
                            {entry.user.imageUrl
                              ? <img src={entry.user.imageUrl} alt={entry.user.name} className="w-full h-full object-cover" />
                              : initials(entry.user.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ink truncate">{entry.user.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-ink-muted">{entry.totalWalks} walks booked</span>
                              {entry.dogs.length > 0 && (
                                <span className="text-[11px] text-ink-muted flex items-center gap-0.5">
                                  <Dog className="w-2.5 h-2.5" />
                                  {entry.dogs.map(d => d.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>K{entry.spent}</p>
                            <p className="text-[9px] text-ink-muted">spent</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
            )}
          </>
        )}

        {/* Community Channels */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-ink">Join Our Community</h2>
          </div>
          <div className="space-y-3">
            {roleChannel && (
              <ChannelCard
                name={roleChannel.label}
                whatsapp={roleChannel.whatsapp}
                facebook={roleChannel.facebook}
              />
            )}
            <ChannelCard
              name={GENERAL_CHANNEL.label}
              whatsapp={GENERAL_CHANNEL.whatsapp}
              facebook={GENERAL_CHANNEL.facebook}
            />
          </div>
          <p className="text-[11px] text-ink-muted text-center mt-3">
            Community groups coming soon — check back for updates!
          </p>
        </div>

        {showLeaderboard && (
          <div className="mt-2 rounded-2xl p-4 border border-dashed border-primary/30 bg-[#EBF5EF] text-center space-y-1">
            <Award className="w-6 h-6 text-primary mx-auto" />
            <p className="text-sm font-bold text-ink">More features coming soon</p>
            <p className="text-xs text-ink-muted">Tips, reviews, community challenges & badges</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <TrendingUp className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-30" />
      <p className="text-sm text-ink-muted">{text}</p>
    </div>
  );
}
