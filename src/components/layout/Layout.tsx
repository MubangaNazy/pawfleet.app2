import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import PawFleetLogo from '../ui/PawFleetLogo';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import RatingModal from '../ui/RatingModal';
import { useApp } from '../../context/AppContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { currentUser, data, markNotificationRead } = useApp();
  const isOwner  = currentUser?.role === 'owner';
  const isWalker = currentUser?.role === 'walker';

  // Auto rating popup for owners — fires when a walk_completed notification arrives
  const [ratingInfo, setRatingInfo] = useState<{ walkId: string; walkerName: string } | null>(null);
  const shownRatingsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOwner || !currentUser) return;
    const unreadCompleted = data.notifications.filter(
      n => n.userId === currentUser.id &&
        n.type === 'walk_completed' &&
        !n.read &&
        n.data?.walkId &&
        !shownRatingsRef.current.has(n.id)
    );
    if (unreadCompleted.length === 0) return;
    const latest = unreadCompleted[0];
    const walkId = latest.data!.walkId;
    const walk = data.walks.find(w => w.id === walkId);
    // Only prompt if walk is completed and not yet rated
    if (!walk || walk.status !== 'completed' || walk.rating) return;
    const walker = data.users.find(u => u.id === walk.walkerId);
    shownRatingsRef.current.add(latest.id);
    markNotificationRead(latest.id);
    setRatingInfo({ walkId, walkerName: walker?.name || 'Your walker' });
  }, [data.notifications, data.walks, data.users, isOwner, currentUser]);

  const unreadCount = data.notifications.filter(
    n => n.userId === currentUser?.id && !n.read
  ).length;

  const notifPath = currentUser?.role === 'admin'
    ? '/admin/notifications'
    : currentUser?.role === 'walker'
    ? '/walker/notifications'
    : currentUser?.role === 'owner'
    ? '/owner/notifications'
    : currentUser?.role === 'vet'
    ? '/vet/notifications'
    : '/shopowner/notifications';

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header — padding-top absorbs the iOS status bar / Dynamic Island */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-border shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            type="button"
            title="Open menu"
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <PawFleetLogo size={28} showText />
          <div className="flex items-center gap-2">
            <Link to={notifPath} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            {(() => {
              const profilePath =
                currentUser?.role === 'shopowner' ? '/shopowner/profile' :
                currentUser?.role === 'owner'     ? '/owner/profile' :
                currentUser?.role === 'walker'    ? '/walker/profile' :
                currentUser?.role === 'vet'       ? '/vet/profile' :
                '/admin/profile';
              return (
                <Link to={profilePath}
                  className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-xs font-bold hover:bg-primary-100 transition-colors overflow-hidden shrink-0">
                  {currentUser?.imageUrl
                    ? <img src={currentUser.imageUrl} alt={currentUser?.name} className="w-full h-full object-cover" />
                    : currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Link>
              );
            })()}
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${(isOwner || isWalker) ? 'pb-16 lg:pb-0' : ''}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <Outlet />
              <div className="hidden lg:block text-center py-3 border-t border-surface-border">
                <p className="text-[11px] text-ink-muted">Made by <span className="font-semibold text-primary">Pegasus AI</span></p>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav (owners + walkers) */}
      <BottomNav />

      {/* Auto rating popup for owners after walk completes */}
      {ratingInfo && (
        <RatingModal
          walkId={ratingInfo.walkId}
          walkerName={ratingInfo.walkerName}
          onClose={() => setRatingInfo(null)}
        />
      )}
    </div>
  );
}
