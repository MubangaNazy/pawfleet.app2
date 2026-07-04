import { useState, useEffect, useRef } from 'react';
import { Trophy, Star, Dog, TrendingUp, Award, MessageCircle, Facebook, Send, Heart, Camera, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

type Tab = 'feed' | 'walkers' | 'owners';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7F32'];

const ROLE_CHANNELS: Record<string, { label: string; whatsapp: string; facebook: string }> = {
  walker:    { label: 'PawFleet Walkers',        whatsapp: '', facebook: '' },
  owner:     { label: "PawFleet Dog Owners",     whatsapp: '', facebook: '' },
  shopowner: { label: 'PawFleet Shop Owners',    whatsapp: '', facebook: '' },
};
const GENERAL_CHANNEL = { label: 'PawFleet General Community', whatsapp: '', facebook: '' };

interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_image?: string;
  content: string;
  image_url?: string;
  likes: number;
  liked_by?: string[];
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function roleLabel(role: string) {
  if (role === 'walker') return '🦮 Walker';
  if (role === 'owner') return '🐾 Owner';
  if (role === 'admin') return '⚡ Admin';
  if (role === 'shopowner') return '🛍 Shop';
  return role;
}

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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#25D366' }}>
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1877F2' }}>
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
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const role = currentUser?.role || 'owner';
  const roleChannel = ROLE_CHANNELS[role];

  // Fetch posts + subscribe to realtime
  useEffect(() => {
    supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data: rows }) => {
        if (rows) setPosts(rows as CommunityPost[]);
      });

    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, payload => {
        setPosts(prev => [payload.new as CommunityPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, payload => {
        setPosts(prev => prev.map(p => p.id === (payload.new as CommunityPost).id ? payload.new as CommunityPost : p));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPreviewImg(compressed);
  };

  const submitPost = async () => {
    if (!draft.trim() && !previewImg) return;
    if (!currentUser) return;
    setPosting(true);
    const row = {
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_role: currentUser.role,
      author_image: currentUser.imageUrl || null,
      content: draft.trim(),
      image_url: previewImg || null,
      likes: 0,
      liked_by: [],
    };
    await supabase.from('community_posts').insert(row);
    setDraft('');
    setPreviewImg(null);
    setPosting(false);
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!currentUser) return;
    const likedBy: string[] = post.liked_by || [];
    const already = likedBy.includes(currentUser.id);
    const newLikedBy = already ? likedBy.filter(id => id !== currentUser.id) : [...likedBy, currentUser.id];
    const newLikes = already ? post.likes - 1 : post.likes + 1;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes, liked_by: newLikedBy } : p));
    await supabase.from('community_posts').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', post.id);
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
        <div className="flex gap-1.5 p-1 rounded-2xl bg-white/15">
          {([['feed', '💬 Feed'], ['walkers', '🦮 Walkers'], ['owners', '🐾 Owners']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t ? 'bg-white text-ink shadow-sm' : 'text-white/80 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* ── FEED TAB ── */}
        {tab === 'feed' && (
          <>
            {/* Compose box */}
            {currentUser && (
              <div className="bg-white rounded-2xl border border-surface-border p-4">
                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {currentUser.imageUrl
                      ? <img src={currentUser.imageUrl} alt="" className="w-full h-full object-cover" />
                      : initials(currentUser.name)}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="Share a tip, photo, or update with the community…"
                      rows={2}
                      className="w-full text-sm text-ink resize-none bg-[#F4F9F6] rounded-xl px-3 py-2.5 placeholder:text-ink-muted/60 focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': '#2B8A50' } as React.CSSProperties}
                    />
                    {previewImg && (
                      <div className="relative mt-2 rounded-xl overflow-hidden">
                        <img src={previewImg} alt="preview" className="w-full object-cover max-h-40" />
                        <button onClick={() => setPreviewImg(null)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <button onClick={() => photoRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-[#EBF5EF]">
                        <Camera className="w-3.5 h-3.5" />
                        Photo
                      </button>
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                      <button
                        onClick={submitPost}
                        disabled={posting || (!draft.trim() && !previewImg)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-40"
                        style={{ background: '#2B8A50' }}>
                        <Send className="w-3 h-3" />
                        {posting ? 'Posting…' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts feed */}
            {posts.length === 0 ? (
              <div className="py-16 text-center">
                <MessageCircle className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold text-ink mb-1">Be the first to post</p>
                <p className="text-xs text-ink-muted">Share a walk photo, tip, or hello with the community</p>
              </div>
            ) : (
              posts.map(post => {
                const liked = currentUser && (post.liked_by || []).includes(currentUser.id);
                return (
                  <div key={post.id} className="bg-white rounded-2xl border border-surface-border overflow-hidden">
                    <div className="flex items-start gap-3 p-3.5 pb-2">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                        {post.author_image
                          ? <img src={post.author_image} alt="" className="w-full h-full object-cover" />
                          : initials(post.author_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-ink truncate">{post.author_name}</span>
                          <span className="text-[10px] text-ink-muted shrink-0">{roleLabel(post.author_role)}</span>
                        </div>
                        <p className="text-[10px] text-ink-muted">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                    {post.content && (
                      <p className="px-3.5 pb-2.5 text-sm text-ink leading-relaxed">{post.content}</p>
                    )}
                    {post.image_url && (
                      <div className="overflow-hidden">
                        <img src={post.image_url} alt="post" className="w-full object-cover max-h-64" />
                      </div>
                    )}
                    <div className="flex items-center gap-1 px-3.5 py-2.5 border-t border-surface-border">
                      <button onClick={() => toggleLike(post)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${liked ? 'text-red-500 bg-red-50' : 'text-ink-muted hover:bg-surface-secondary'}`}>
                        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                        {post.likes > 0 ? post.likes : 'Like'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── WALKERS LEADERBOARD ── */}
        {tab === 'walkers' && (
          <>
            {walkerRanks.length >= 3 && (
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
            {walkerRanks.length === 0
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
                })}
          </>
        )}

        {/* ── OWNERS LEADERBOARD ── */}
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

        {/* Community Channels — shown below all tabs */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-ink">Join Our Community</h2>
          </div>
          {(roleChannel?.whatsapp || roleChannel?.facebook || GENERAL_CHANNEL.whatsapp || GENERAL_CHANNEL.facebook) ? (
            <div className="space-y-3">
              {roleChannel && (
                <ChannelCard name={roleChannel.label} whatsapp={roleChannel.whatsapp} facebook={roleChannel.facebook} />
              )}
              <ChannelCard name={GENERAL_CHANNEL.label} whatsapp={GENERAL_CHANNEL.whatsapp} facebook={GENERAL_CHANNEL.facebook} />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-surface-border">
              <div className="px-5 py-6 text-center" style={{ background: 'linear-gradient(135deg, #EBF5EF 0%, #F4F9F6 100%)' }}>
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3"
                  style={{ border: '1px solid rgba(43,138,80,0.15)' }}>
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-ink text-sm mb-1">Community groups launching soon</p>
                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  PawFleet WhatsApp & Facebook groups for{' '}
                  {role === 'walker' ? 'walkers' : role === 'owner' ? 'dog owners' : 'shop owners'} in Lusaka.
                  Message us to be added when they go live.
                </p>
                <a
                  href="https://wa.me/260574800304?text=Hi%20PawFleet%2C%20please%20add%20me%20to%20the%20community%20group!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#25D366' }}>
                  <MessageCircle className="w-4 h-4" />
                  Request to join
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 rounded-2xl p-4 border border-dashed border-primary/30 bg-[#EBF5EF] text-center space-y-1">
          <Award className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm font-bold text-ink">More features coming soon</p>
          <p className="text-xs text-ink-muted">Challenges, badges & community rewards</p>
        </div>
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
