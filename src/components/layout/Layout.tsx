import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, PawPrint } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useApp();

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-border shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-ink text-sm">PawFleet</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary text-xs font-bold">
            {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
