import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, ListChecks, PlusCircle,
  Users, UserCog, CreditCard, Activity, DollarSign, Clock,
  LogOut, X, Dog, ChevronRight, Scissors, ShoppingBag, User, Calendar, Bell, Package, TrendingUp, History, Trophy, Stethoscope, ClipboardList,
} from 'lucide-react';
import PawFleetLogo from '../ui/PawFleetLogo';
import { useApp } from '../../context/AppContext';

interface SidebarProps { isOpen: boolean; onClose: () => void; }

const adminNav = [
  { to: '/admin',             icon: LayoutDashboard, label: 'Dashboard',   exact: true },
  { to: '/admin/walks',       icon: ListChecks,      label: 'All Walks' },
  { to: '/admin/create-walk', icon: PlusCircle,      label: 'Create Walk' },
  { to: '/admin/map',         icon: Map,             label: 'Live Map' },
  { to: '/admin/walkers',     icon: UserCog,         label: 'Walkers' },
  { to: '/admin/owners',      icon: Users,           label: 'Owners' },
  { to: '/admin/dogs',        icon: Dog,             label: 'All Pets' },
  { to: '/admin/payments',    icon: CreditCard,      label: 'Payments' },
  { to: '/admin/shop',        icon: ShoppingBag,     label: 'Shop Manager' },
  { to: '/admin/analytics',   icon: Activity,        label: 'Analytics' },
  { to: '/admin/profit',      icon: TrendingUp,      label: 'Profit Management' },
];

const walkerNav = [
  { to: '/walker',             icon: LayoutDashboard, label: 'Dashboard',    exact: true },
  { to: '/walker/walks',       icon: ListChecks,      label: 'My Walks' },
  { to: '/walker/schedule',    icon: Calendar,        label: 'Schedule' },
  { to: '/walker/earnings',    icon: DollarSign,      label: 'Earnings' },
  { to: '/walker/history',     icon: History,         label: 'History' },
  { to: '/walker/badges',      icon: Activity,        label: 'Achievements' },
  { to: '/walker/community',   icon: Trophy,          label: 'Community' },
];

const ownerNav = [
  { to: '/owner',              icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { to: '/owner/request',      icon: PlusCircle,      label: 'Book a Walk' },
  { to: '/owner/schedule',     icon: Calendar,        label: 'Schedule' },
  { to: '/owner/dogs',         icon: Dog,             label: 'My Dogs' },
  { to: '/owner/history',      icon: Clock,           label: 'Walk History' },
  { to: '/owner/services',     icon: Scissors,        label: 'Grooming & Walking' },
  { to: '/owner/vet-booking',  icon: Stethoscope,     label: 'Vet Care' },
  { to: '/owner/shop',         icon: ShoppingBag,     label: 'Shop' },
  { to: '/owner/profile',      icon: User,            label: 'Profile' },
  { to: '/owner/community',    icon: Trophy,          label: 'Community' },
];

const vetNav = [
  { to: '/vet',              icon: LayoutDashboard, label: 'Dashboard',     exact: true },
  { to: '/vet/appointments', icon: ClipboardList,   label: 'Appointments' },
  { to: '/vet/schedule',     icon: Calendar,        label: 'Schedule' },
  { to: '/vet/analytics',    icon: TrendingUp,      label: 'Analytics' },
  { to: '/vet/profile',      icon: User,            label: 'Clinic Profile' },
];

const shopownerNav = [
  { to: '/shopowner',               icon: LayoutDashboard, label: 'Dashboard',     exact: true },
  { to: '/shopowner/products',      icon: Package,         label: 'My Products' },
  { to: '/shopowner/orders',        icon: ShoppingBag,     label: 'Orders' },
  { to: '/shopowner/analytics',     icon: TrendingUp,      label: 'Analytics' },
  { to: '/shopowner/notifications', icon: Bell,            label: 'Notifications' },
  { to: '/shopowner/community',     icon: Users,           label: 'Community' },
  { to: '/shopowner/profile',       icon: User,            label: 'Shop Profile' },
];

const roleGradient: Record<string, string> = {
  admin:     'from-green-800 to-green-950',
  walker:    'from-emerald-500 to-green-700',
  owner:     'from-green-500 to-emerald-600',
  shopowner: 'from-teal-600 to-green-700',
  vet:       'from-teal-500 to-cyan-700',
};
const roleBadge: Record<string, string> = {
  admin:     'bg-green-50 text-green-800',
  walker:    'bg-emerald-50 text-emerald-700',
  owner:     'bg-green-50 text-green-700',
  shopowner: 'bg-teal-50 text-teal-700',
  vet:       'bg-cyan-50 text-cyan-700',
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  const navItems = currentUser?.role === 'admin'     ? adminNav
    : currentUser?.role === 'walker'    ? walkerNav
    : currentUser?.role === 'shopowner' ? shopownerNav
    : currentUser?.role === 'vet'       ? vetNav
    : ownerNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">

      {/* ── Logo ── */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        <PawFleetLogo size={36} showText className="flex-1 min-w-0" />
        <button type="button" title="Close menu" className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Thin accent line ── */}
      <div className="mx-4 h-px bg-gradient-to-r from-primary-100 via-primary-50 to-transparent mb-2" />

      {/* ── Nav ── */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150
              ${isActive
                ? 'bg-gradient-to-r from-primary/10 to-primary-50 text-primary border border-primary/15 shadow-sm'
                : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-ink-muted group-hover:text-ink'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-primary/60 shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User card ── */}
      <div className="p-3 border-t border-surface-border">
        <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-all cursor-default">
          {/* Avatar with gradient */}
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleGradient[currentUser?.role || 'owner']} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
          >
            {currentUser ? initials(currentUser.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate leading-tight">{currentUser?.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${roleBadge[currentUser?.role || 'owner']}`}>
              {currentUser?.role}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-danger hover:bg-danger-light transition-all opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] border-r border-surface-border h-screen sticky top-0 shrink-0 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 border-r border-surface-border z-50 transform transition-transform duration-300 ease-out lg:hidden shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
