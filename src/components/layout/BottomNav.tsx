import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Scissors, ShoppingBag, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ownerNav = [
  { to: '/owner',          icon: Home,        label: 'Home',     exact: true },
  { to: '/owner/services', icon: Scissors,    label: 'Services' },
  { to: '/owner/shop',     icon: ShoppingBag, label: 'Shop' },
  { to: '/owner/profile',  icon: User,        label: 'Profile' },
];

export function BottomNav() {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'owner') return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {ownerNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-ink-muted hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-ink-muted'}`} />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-ink-muted'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
