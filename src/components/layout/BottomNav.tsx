import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, User, Calendar, Navigation, DollarSign, MapPin, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';

const ownerNav = [
  { to: '/owner',          icon: Home,        label: 'Home',    exact: true },
  { to: '/owner/schedule', icon: Calendar,    label: 'Schedule' },
  { to: '/owner/track',    icon: Navigation,  label: 'Track',   center: true },
  { to: '/owner/shop',     icon: ShoppingBag, label: 'Shop' },
  { to: '/owner/profile',  icon: User,        label: 'Profile' },
];

const walkerNav = [
  { to: '/walker',          icon: Home,       label: 'Home',    exact: true },
  { to: '/walker/walks',    icon: MapPin,     label: 'Walks' },
  { to: '/walker/guide',    icon: BookOpen,   label: 'Guide',   center: true },
  { to: '/walker/earnings', icon: DollarSign, label: 'Earn' },
  { to: '/walker/profile',  icon: User,       label: 'Profile' },
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
    if (isOwner && to === '/owner/track' && activeOwnerWalk) {
      e.preventDefault();
      navigate(`/owner/track/${activeOwnerWalk.id}`);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-area-pb overflow-visible"
      style={{ background: 'white', borderTop: '1px solid #E5E7EB' }}
    >
      <div className="flex items-end justify-around px-1 pt-1 pb-2">
        {navItems.map((item) => {
          const isCenter = 'center' in item && item.center === true;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={(e) => handleNavClick(item.to, e)}
              className="relative flex flex-col items-center"
            >
              {({ isActive }) => (
                isCenter ? (
                  /* ── Raised center button ── */
                  <div className="flex flex-col items-center -mt-7">
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center border-4 border-white transition-transform active:scale-90"
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, #0F2D20, #1B4332)'
                          : 'linear-gradient(145deg, #1B4332, #2B8A50)',
                        boxShadow: '0 4px 16px rgba(27,67,50,0.38)',
                      }}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                      {activeOwnerWalk && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 leading-none"
                      style={{ color: isActive ? '#1B4332' : '#6B7280' }}>
                      {item.label}
                    </span>
                  </div>
                ) : (
                  /* ── Regular tab ── */
                  <div
                    className={`relative flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                      isWalker ? 'px-2 py-1.5' : 'px-3.5 py-1.5'
                    } rounded-2xl`}
                    style={isActive ? {
                      background: 'linear-gradient(145deg, #1B4332, #2B8A50)',
                      boxShadow: '0 3px 10px rgba(27,67,50,0.32)',
                    } : {}}
                  >
                    <div className="relative">
                      <item.icon
                        className={`w-[22px] h-[22px] ${isActive ? 'text-white' : 'text-gray-400'}`}
                      />
                      {/* Cart badge */}
                      {isOwner && item.to === '/owner/shop' && count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </div>
                )
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
