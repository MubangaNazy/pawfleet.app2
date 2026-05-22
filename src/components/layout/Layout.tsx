import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import PawFleetLogo from '../ui/PawFleetLogo';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useApp } from '../../context/AppContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useApp();
  const isOwner = currentUser?.role === 'owner';

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
          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-xs font-bold">
            {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </header>

        {/* Content — add bottom padding on mobile for owners to clear the bottom nav */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isOwner ? 'pb-16 lg:pb-0' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (owners only) */}
      <BottomNav />
    </div>
  );
}
