import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import PawFleetLogo from '../ui/PawFleetLogo';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useApp } from '../../context/AppContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, data } = useApp();
  const isOwner  = currentUser?.role === 'owner';
  const isWalker = currentUser?.role === 'walker';

  const unreadCount = data.notifications.filter(
    n => n.userId === currentUser?.id && !n.read
  ).length;

  const notifPath = currentUser?.role === 'admin'
    ? '/admin/notifications'
    : currentUser?.role === 'walker'
    ? '/walker/notifications'
    : currentUser?.role === 'owner'
    ? '/owner/notifications'
    : '/shopowner/notifications';

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-border shrink-0">
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
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-xs font-bold">
              {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Content — add bottom padding on mobile for owners and walkers to clear bottom nav */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${(isOwner || isWalker) ? 'pb-16 lg:pb-0' : ''}`}>
          <Outlet />
          <div className="hidden lg:block text-center py-3 border-t border-surface-border">
            <p className="text-[11px] text-ink-muted">Made by <span className="font-semibold text-primary">Pegasus AI</span></p>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav (owners + walkers) */}
      <BottomNav />
    </div>
  );
}
