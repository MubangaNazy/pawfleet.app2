import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { MessageCircle, ArrowLeft, ChevronRight, Search, UserPlus } from 'lucide-react';

export default function ChatInbox() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'walks' | 'people'>('walks');
  const [search, setSearch] = useState('');

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const statusOrder: Record<string, number> = { active: 0, assigned: 1, completed: 2 };

  const myWalks = data.walks
    .filter(w =>
      (w.ownerId === currentUser.id || w.walkerId === currentUser.id) &&
      (w.status === 'active' || w.status === 'assigned' || w.status === 'completed')
    )
    .sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
    });

  // All users except self, filtered by search
  const allUsers = data.users.filter(u =>
    u.id !== currentUser.id &&
    (search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const roleBase: Record<string, string> = {
    owner: '/owner', walker: '/walker', admin: '/admin',
    vet: '/vet', shopowner: '/shopowner',
  };
  const base = roleBase[currentUser.role] ?? '/owner';
  const dmPath = (uid: string) => `${base}/dm/${uid}`;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: '#F4F7F5' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-0"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        <div className="flex items-center gap-3 pb-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/80 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-white">Messages</h1>
          </div>
          <MessageCircle className="w-5 h-5 text-white/70" />
        </div>
        {/* Tab bar */}
        <div className="flex border-b border-white/20">
          {([['walks', 'Walk Chats'], ['people', 'Find People']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                tab === key ? 'text-white border-b-2 border-white' : 'text-white/55'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Walk Chats tab */}
      {tab === 'walks' && (
        <div className="flex-1 p-4 space-y-3">
          {myWalks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#EBF5EF' }}>
                <MessageCircle className="w-8 h-8" style={{ color: '#2B8A50' }} />
              </div>
              <p className="text-ink-muted text-sm font-medium">No walk conversations yet</p>
              <p className="text-ink-muted text-xs max-w-xs">Chats will appear here once you have active or completed walks.</p>
              <button onClick={() => setTab('people')}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                <UserPlus className="w-4 h-4" /> Find People to Chat
              </button>
            </div>
          ) : (
            myWalks.map(walk => {
              const dog = data.dogs.find(d => d.id === walk.dogId);
              const otherPerson = isOwner
                ? data.users.find(u => u.id === walk.walkerId)
                : data.users.find(u => u.id === walk.ownerId);
              const chatPath = `${base}/chat/${walk.id}`;
              const isGrooming = walk.notes?.startsWith('GROOMING:');
              return (
                <Link key={walk.id} to={chatPath}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-surface-border p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center border-2 border-primary/20">
                      {dog?.imageUrl ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🐕</span>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink truncate">
                        {otherPerson?.name || (isOwner ? 'Walker' : 'Owner')}
                      </p>
                      {isGrooming && (
                        <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full shrink-0">Grooming</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 truncate">
                      {dog?.name ? `${dog.name} · ` : ''}{format(new Date(walk.scheduledDate), 'EEE, MMM d · h:mm a')}
                    </p>
                    <span className={`inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                      walk.status === 'active' ? 'bg-green-100 text-green-700' : walk.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {walk.status.charAt(0).toUpperCase() + walk.status.slice(1)}
                    </span>
                  </div>
                  {walk.status === 'active' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-success px-2 py-0.5 rounded-full bg-success/10 shrink-0 mr-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />LIVE
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
                    <ChevronRight className="w-4 h-4" style={{ color: '#2B8A50' }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Find People tab */}
      {tab === 'people' && (
        <div className="flex-1 flex flex-col">
          {/* Search bar */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-3 bg-white border border-surface-border rounded-2xl px-4 py-3 shadow-sm">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 text-sm text-ink placeholder:text-ink-muted focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
            {allUsers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-ink-muted text-sm">No users found{search ? ` for "${search}"` : ''}</p>
              </div>
            ) : (
              allUsers.map(user => (
                <Link key={user.id} to={dmPath(user.id)}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-surface-border p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {user.imageUrl
                      ? <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                      : <span className="text-base">{user.name?.[0]?.toUpperCase() || '?'}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm truncate">{user.name || 'Unknown'}</p>
                    <p className="text-xs text-ink-muted capitalize mt-0.5">{user.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
                    <MessageCircle className="w-4 h-4" style={{ color: '#2B8A50' }} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
