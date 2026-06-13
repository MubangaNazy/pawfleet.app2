import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { CartProvider } from './context/CartContext';
import { ShopProvider } from './context/ShopContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';

// Admin pages
import AdminDashboard   from './pages/admin/Dashboard';
import AdminWalks       from './pages/admin/Walks';
import AdminCreateWalk  from './pages/admin/CreateWalk';
import AdminMapView     from './pages/admin/MapView';
import AdminWalkers     from './pages/admin/Walkers';
import AdminOwners      from './pages/admin/Owners';
import AdminPayments    from './pages/admin/Payments';
import AdminShopManager from './pages/admin/ShopManager';
import AdminAnalytics   from './pages/admin/Analytics';
import AdminProfitMgmt  from './pages/admin/ProfitManagement';

// Walker pages
import WalkerDashboard   from './pages/walker/Dashboard';
import WalkerMyWalks     from './pages/walker/MyWalks';
import WalkerEarnings    from './pages/walker/Earnings';
import WalkerBadges      from './pages/walker/Badges';
import WalkerWalkDetail  from './pages/walker/WalkDetail';
import WalkerHistory     from './pages/walker/WalkHistory';

// Owner pages
import OwnerDashboard  from './pages/owner/Dashboard';
import OwnerRequestWalk from './pages/owner/RequestWalk';
import OwnerHistory    from './pages/owner/History';
import OwnerDogs       from './pages/owner/Dogs';
import DogProfile      from './pages/owner/DogProfile';
import OwnerServices   from './pages/owner/Services';
import OwnerShop       from './pages/owner/Shop';
import OwnerProfile    from './pages/owner/Profile';
import WalkTracker     from './pages/owner/WalkTracker';
import OwnerSchedule   from './pages/owner/Schedule';
import OwnerCart       from './pages/owner/Cart';
import FavouriteWalkers from './pages/owner/FavouriteWalkers';
import PrivacySafety    from './pages/owner/PrivacySafety';
import PaymentMethods   from './pages/owner/PaymentMethods';

// Shared / full-screen
import WalkerSchedule  from './pages/walker/Schedule';
import WalkerLiveWalk  from './pages/walker/LiveWalk';
import WalkerProfile   from './pages/walker/Profile';
import WalkerDogGuide  from './pages/walker/DogGuide';
import Chat            from './pages/Chat';

// Shop Owner
import ShopOwnerDashboard     from './pages/shopowner/Dashboard';
import ShopOwnerMyProducts    from './pages/shopowner/MyProducts';
import ShopOwnerOrders        from './pages/shopowner/Orders';
import ShopOwnerNotifications from './pages/shopowner/Notifications';

// Shared notifications page
import NotificationsPage from './pages/Notifications';
import ChatInbox from './pages/ChatInbox';
import Community from './pages/Community';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string | string[] }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(currentUser.role)) return <Navigate to={ROLE_ROUTES[currentUser.role] || '/owner'} replace />;
  }
  return <>{children}</>;
}

const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin', walker: '/walker', owner: '/owner', shopowner: '/shopowner',
};

function RoleRedirect() {
  const { currentUser } = useApp();
  if (!currentUser) return <Landing />;
  return <Navigate to={ROLE_ROUTES[currentUser.role] || '/owner'} replace />;
}

function AppContent() {
  const { loading } = useApp();
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #1A572F, #2B8A50)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" strokeLinecap="round" />
            <path d="M8 12s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
            <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <p className="text-base font-bold text-ink">PawFleet</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs text-ink-muted">Starting up PawFleet…</p>

        {/* Dog walking animation */}
        <style>{`
          @keyframes dogWalk {
            0%   { left: 4%;  transform: scaleX(1); }
            44%  { left: 78%; transform: scaleX(1); }
            50%  { left: 78%; transform: scaleX(-1); }
            94%  { left: 4%;  transform: scaleX(-1); }
            100% { left: 4%;  transform: scaleX(1); }
          }
          @keyframes trailGrow {
            0%   { width: 4%; }
            44%  { width: 82%; }
            50%  { width: 82%; }
            94%  { width: 4%; }
            100% { width: 4%; }
          }
        `}</style>
        <div style={{ position: 'relative', width: 160, height: 40 }}>
          {/* Trail bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, borderRadius: 999, background: '#EBF5EF', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #1B4332, #52B788)', animation: 'trailGrow 2.4s ease-in-out infinite' }} />
          </div>
          {/* Dog */}
          <div style={{ position: 'absolute', bottom: 7, fontSize: 22, lineHeight: 1, animation: 'dogWalk 2.4s linear infinite', display: 'inline-block' }}>🐕</div>
        </div>

        <p className="text-[10px] text-ink-muted/50 mt-1">Made by Pegasus AI</p>
      </div>
    );
  }
  return <AppRoutes />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/landing"  element={<Landing />} />
      <Route path="/"         element={<RoleRedirect />} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
        <Route index          element={<AdminDashboard />} />
        <Route path="walks"       element={<AdminWalks />} />
        <Route path="create-walk" element={<AdminCreateWalk />} />
        <Route path="map"         element={<AdminMapView />} />
        <Route path="walkers"     element={<AdminWalkers />} />
        <Route path="owners"      element={<AdminOwners />} />
        <Route path="payments"    element={<AdminPayments />} />
        <Route path="shop"        element={<AdminShopManager />} />
        <Route path="analytics"   element={<AdminAnalytics />} />
        <Route path="profit"      element={<AdminProfitMgmt />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="dashboard"   element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ── Walker ── */}
      <Route path="/walker" element={<ProtectedRoute role="walker"><Layout /></ProtectedRoute>}>
        <Route index          element={<WalkerDashboard />} />
        <Route path="walks"     element={<WalkerMyWalks />} />
        <Route path="schedule"  element={<WalkerSchedule />} />
        <Route path="earnings"  element={<WalkerEarnings />} />
        <Route path="badges"    element={<WalkerBadges />} />
        <Route path="profile"   element={<WalkerProfile />} />
        <Route path="guide"     element={<WalkerDogGuide />} />
        <Route path="history"   element={<WalkerHistory />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chats"         element={<ChatInbox />} />
        <Route path="community"     element={<Community />} />
        <Route path="dashboard" element={<Navigate to="/walker" replace />} />
        <Route path="my-walks"  element={<Navigate to="/walker/walks" replace />} />
      </Route>

      {/* Walker full-screen (outside Layout) */}
      <Route path="/walker/live/:walkId"  element={<ProtectedRoute role="walker"><WalkerLiveWalk /></ProtectedRoute>} />
      <Route path="/walker/chat/:walkId"  element={<ProtectedRoute role="walker"><Chat /></ProtectedRoute>} />
      <Route path="/walker/walk/:walkId"  element={<ProtectedRoute role="walker"><WalkerWalkDetail /></ProtectedRoute>} />

      {/* ── Shop Owner ── */}
      <Route path="/shopowner" element={<ProtectedRoute role="shopowner"><Layout /></ProtectedRoute>}>
        <Route index                    element={<ShopOwnerDashboard />} />
        <Route path="products"          element={<ShopOwnerMyProducts />} />
        <Route path="orders"            element={<ShopOwnerOrders />} />
        <Route path="notifications"     element={<NotificationsPage />} />
        <Route path="analytics"         element={<Navigate to="/shopowner" replace />} />
      </Route>

      {/* ── Owner ── */}
      <Route path="/owner" element={<ProtectedRoute role="owner"><Layout /></ProtectedRoute>}>
        <Route index          element={<OwnerDashboard />} />
        <Route path="request"   element={<OwnerRequestWalk />} />
        <Route path="schedule"  element={<OwnerSchedule />} />
        <Route path="history"   element={<OwnerHistory />} />
        <Route path="dogs"      element={<OwnerDogs />} />
        <Route path="dogs/:dogId" element={<DogProfile />} />
        <Route path="services"  element={<OwnerServices />} />
        <Route path="shop"      element={<OwnerShop />} />
        <Route path="cart"      element={<OwnerCart />} />
        <Route path="profile"   element={<OwnerProfile />} />
        <Route path="track/:walkId" element={<WalkTracker />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chats"         element={<ChatInbox />} />
        <Route path="community"     element={<Community />} />
        <Route path="dashboard"     element={<Navigate to="/owner" replace />} />
        <Route path="request-walk"  element={<Navigate to="/owner/request" replace />} />
        <Route path="favourites"    element={<FavouriteWalkers />} />
        <Route path="privacy"       element={<PrivacySafety />} />
        <Route path="profile/payment" element={<PaymentMethods />} />
      </Route>

      {/* Owner full-screen (outside Layout) */}
      <Route path="/owner/chat/:walkId" element={<ProtectedRoute role="owner"><Chat /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('pawfleet_onboarded'));

  const handleSplashDone = () => {
    localStorage.setItem('pawfleet_onboarded', '1');
    setShowSplash(false);
  };

  return (
    <BrowserRouter>
      <AppProvider>
        <CartProvider>
          <ShopProvider>
            <ToastProvider>
              {showSplash && <SplashScreen onDone={handleSplashDone} />}
              <AppContent />
            </ToastProvider>
          </ShopProvider>
        </CartProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
