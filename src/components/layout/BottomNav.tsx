import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Scissors, ShoppingBag, User, Calendar, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';

const ownerNav = [
  { to: '/owner',           icon: Home,        label: 'Home',     exact: true },
  { to: '/owner/schedule',  icon: Calendar,    label: 'Schedule' },
  { to: '/owner/services',  icon: Scissors,    label: 'Services' },
  { to: '/owner/shop',      icon: ShoppingBag, label: 'Shop' },
  { to: '/owner/profile',   icon: User,        label: 'Profile' },
];

const walkerNav = [
  { to: '/walker',          icon: Home,        label: 'Home',    exact: true },
  { to: '/walker/walks',    icon: MessageCircle,label: 'Walks' },
  { to: '/walker/schedule', icon: Calendar,    label: 'Schedule' },
  { to: '/walker/profile',  icon: User,        label: 'Profile' },
];

export function BottomNav() {
  const { currentUser } = useApp();
  const { count } = useCart();

  const isOwner = currentUser?.role === 'owner';
  const isWalker = currentUser?.role === 'walker';

  if (!isOwner && !isWalker) return null;

  const navItems = isOwner ? ownerNav : walkerNav;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-border safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-ink-muted hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-ink-muted'}`} />
                  {/* Cart badge on Shop icon */}
                  {isOwner && item.to === '/owner/shop' && count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
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
