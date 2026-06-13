import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { MessageCircle, ArrowLeft, ChevronRight } from 'lucide-react';

export default function ChatInbox() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';

  // All walks this user is part of with relevant statuses
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

  // Determine if there are any messages for a given walkId
  const walkIdsWithMessages = new Set(
    (data as any).messages
      ? (data as any).messages.map((m: any) => m.walkId)
      : []
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/80 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-white">Messages</h1>
          <p className="text-white/70 text-xs">{myWalks.length} conversation{myWalks.length !== 1 ? 's' : ''}</p>
        </div>
        <MessageCircle className="w-5 h-5 text-white/70" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {myWalks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#EBF5EF' }}
            >
              <MessageCircle className="w-8 h-8" style={{ color: '#2B8A50' }} />
            </div>
            <p className="text-ink-muted text-sm font-medium">No conversations yet</p>
            <p className="text-ink-muted text-xs text-center max-w-xs">
              Chat will appear here once you have active or completed walks.
            </p>
          </div>
        ) : (
          myWalks.map(walk => {
            const dog = data.dogs.find(d => d.id === walk.dogId);
            const otherPerson = isOwner
              ? data.users.find(u => u.id === walk.walkerId)
              : data.users.find(u => u.id === walk.ownerId);

            const chatPath = isOwner
              ? `/owner/chat/${walk.id}`
              : `/walker/chat/${walk.id}`;

            const hasMessages = walkIdsWithMessages.has(walk.id);
            const isGrooming = walk.notes?.startsWith('GROOMING:');

            return (
              <Link
                key={walk.id}
                to={chatPath}
                className="flex items-center gap-4 bg-white rounded-2xl border border-surface-border p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center border-2 border-primary/20">
                    {dog?.imageUrl
                      ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                      : <span className="text-3xl">🐕</span>
                    }
                  </div>
                  {hasMessages && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink truncate">
                      {otherPerson?.name || (isOwner ? 'Walker' : 'Owner')}
                    </p>
                    {isGrooming && (
                      <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full shrink-0">
                        Grooming
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 truncate">
                    {dog?.name ? `${dog.name} · ` : ''}{format(new Date(walk.scheduledDate), 'EEE, MMM d · h:mm a')}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                      walk.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : walk.status === 'assigned'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {walk.status.charAt(0).toUpperCase() + walk.status.slice(1)}
                  </span>
                </div>

                {/* LIVE badge */}
                {walk.status === 'active' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-success px-2 py-0.5 rounded-full bg-success/10 shrink-0 mr-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />LIVE
                  </span>
                )}

                {/* Arrow / Chat button */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#EBF5EF' }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: '#2B8A50' }} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
