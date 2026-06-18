import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, User, Calendar, Navigation, DollarSign, MapPin, BarChart2, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';

const ownerNav = [
  { to: '/owner',          icon: Home,        label: 'Home',     exact: true },
  { to: '/owner/schedule', icon: Calendar,    label: 'Schedule' },
  { to: '/owner/history',  icon: Navigation,  label: 'Track' },
  { to: '/owner/shop',     icon: ShoppingBag, label: 'Shop' },
  { to: '/owner/profile',  icon: User,        label: 'Profile' },
];

const walkerNav = [
  { to: '/walker',           icon: Home,       label: 'Home',     exact: true },
  { to: '/walker/walks',     icon: MapPin,     label: 'Walks' },
  { to: '/walker/history',   icon: BarChart2,  label: 'History' },
  { to: '/walker/earnings',  icon: DollarSign, label: 'Earnings' },
  { to: '/walker/guide',     icon: BookOpen,   label: 'Guide' },
  { to: '/walker/profile',   icon: User,       label: 'Profile' },
];

export function BottomNav() {
  const { currentUser, data } = useApp();
  const { count } = useCart();
  const navigate = useNavigate();

  const isOwner  = currentUser?.role === 'owner';
  const isWalker = currentUser?.role === 'walker';

  if (!isOwner && !isWalker) return null;

  const navItems = isOwner ? ownerNav : walkerNav;

  const activeOwnerWalk = isOwner
    ? data.walks.find(w => w.ownerId === currentUser?.id && w.status === 'active')
    : null;

  const handleNavClick = (to: string, e: React.MouseEvent) => {
    if (isOwner && to === '/owner/history' && activeOwnerWalk) {
      e.preventDefault();
      navigate(`/owner/track/${activeOwnerWalk.id}`);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-area-pb"
      style={{ background: 'white', borderTop: '1px solid #E5E7EB' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={(e) => handleNavClick(item.to, e)}
            className={({ isActive }) =>
              `relative flex flex-col items-center transition-all ${isActive ? 'text-white' : 'text-ink-muted hover:text-ink'}`
            }
          >
            {({ isActive }) => (
              <div
                className={`relative flex flex-col items-center gap-0.5 rounded-full transition-all ${isWalker ? 'px-2.5 py-1.5' : 'px-4 py-1.5'}`}
                style={isActive ? { background: '#1B4332' } : {}}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-ink-muted'}`} />
                  {isOwner && item.to === '/owner/shop' && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-white' : 'text-ink-muted'}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
