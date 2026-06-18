import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { CartProvider } from './context/CartContext';
import { ShopProvider } from './context/ShopContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import SplashScreen from './components/SplashScreen';
// Login / Register / Landing are needed immediately — keep static
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';

// ── Lazy-loaded pages (split into separate chunks) ──────────────────────────
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'));
const AdminWalks       = lazy(() => import('./pages/admin/Walks'));
const AdminCreateWalk  = lazy(() => import('./pages/admin/CreateWalk'));
const AdminMapView     = lazy(() => import('./pages/admin/MapView'));
const AdminWalkers     = lazy(() => import('./pages/admin/Walkers'));
const AdminOwners      = lazy(() => import('./pages/admin/Owners'));
const AdminPayments    = lazy(() => import('./pages/admin/Payments'));
const AdminShopManager = lazy(() => import('./pages/admin/ShopManager'));
const AdminAnalytics   = lazy(() => import('./pages/admin/Analytics'));
const AdminProfitMgmt  = lazy(() => import('./pages/admin/ProfitManagement'));

const WalkerDashboard  = lazy(() => import('./pages/walker/Dashboard'));
const WalkerMyWalks    = lazy(() => import('./pages/walker/MyWalks'));
const WalkerEarnings   = lazy(() => import('./pages/walker/Earnings'));
const WalkerBadges     = lazy(() => import('./pages/walker/Badges'));
const WalkerWalkDetail = lazy(() => import('./pages/walker/WalkDetail'));
const WalkerHistory    = lazy(() => import('./pages/walker/WalkHistory'));
const WalkerSchedule   = lazy(() => import('./pages/walker/Schedule'));
const WalkerLiveWalk   = lazy(() => import('./pages/walker/LiveWalk'));
const WalkerProfile    = lazy(() => import('./pages/walker/Profile'));
const WalkerDogGuide   = lazy(() => import('./pages/walker/DogGuide'));
const WalkerSettings   = lazy(() => import('./pages/walker/Settings'));
const WalkerPrivacy    = lazy(() => import('./pages/walker/Privacy'));

const AdminProfile     = lazy(() => import('./pages/admin/Profile'));

const OwnerDashboard   = lazy(() => import('./pages/owner/Dashboard'));
const OwnerRequestWalk = lazy(() => import('./pages/owner/RequestWalk'));
const OwnerHistory     = lazy(() => import('./pages/owner/History'));
const OwnerDogs        = lazy(() => import('./pages/owner/Dogs'));
const DogProfile       = lazy(() => import('./pages/owner/DogProfile'));
const OwnerServices    = lazy(() => import('./pages/owner/Services'));
const OwnerShop        = lazy(() => import('./pages/owner/Shop'));
const OwnerCart        = lazy(() => import('./pages/owner/Cart'));
const OwnerProfile     = lazy(() => import('./pages/owner/Profile'));
const VetBooking       = lazy(() => import('./pages/owner/VetBooking'));
const WalkTracker      = lazy(() => import('./pages/owner/WalkTracker'));
const OwnerSchedule    = lazy(() => import('./pages/owner/Schedule'));
const FavouriteWalkers = lazy(() => import('./pages/owner/FavouriteWalkers'));
const PrivacySafety    = lazy(() => import('./pages/owner/PrivacySafety'));
const PaymentMethods   = lazy(() => import('./pages/owner/PaymentMethods'));

const ShopOwnerDashboard     = lazy(() => import('./pages/shopowner/Dashboard'));
const ShopOwnerMyProducts    = lazy(() => import('./pages/shopowner/MyProducts'));
const ShopOwnerOrders        = lazy(() => import('./pages/shopowner/Orders'));
const ShopOwnerNotifications = lazy(() => import('./pages/shopowner/Notifications'));
const ShopOwnerProfile       = lazy(() => import('./pages/shopowner/Profile'));
const ShopOwnerAnalytics     = lazy(() => import('./pages/shopowner/Analytics'));

const VetDashboard          = lazy(() => import('./pages/vet/Dashboard'));
const VetAppointments       = lazy(() => import('./pages/vet/Appointments'));
const VetAppointmentDetail  = lazy(() => import('./pages/vet/AppointmentDetail'));
const VetProfile            = lazy(() => import('./pages/vet/Profile'));

const NotificationsPage = lazy(() => import('./pages/Notifications'));
const ChatInbox         = lazy(() => import('./pages/ChatInbox'));
const Chat              = lazy(() => import('./pages/Chat'));
const Community         = lazy(() => import('./pages/Community'));
const PrivacyPolicy     = lazy(() => import('./pages/PrivacyPolicy'));

// ── Page fallback while chunks load ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

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
  admin: '/admin', walker: '/walker', owner: '/owner', shopowner: '/shopowner', vet: '/vet',
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
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, borderRadius: 999, background: '#EBF5EF', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #1B4332, #52B788)', animation: 'trailGrow 2.4s ease-in-out infinite' }} />
          </div>
          <div style={{ position: 'absolute', bottom: 7, fontSize: 22, lineHeight: 1, animation: 'dogWalk 2.4s linear infinite', display: 'inline-block' }}>🐕</div>
        </div>

        <p className="text-[10px] text-ink-muted/50 mt-1">Made by Pegasus AI</p>
      </div>
    );
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/landing"        element={<Landing />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/"               element={<RoleRedirect />} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
        <Route index              element={<AdminDashboard />} />
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
        <Route path="profile"       element={<AdminProfile />} />
        <Route path="dashboard"   element={<Navigate to="/admin" replace />} />
      </Route>

      {/* ── Walker ── */}
      <Route path="/walker" element={<ProtectedRoute role="walker"><Layout /></ProtectedRoute>}>
        <Route index              element={<WalkerDashboard />} />
        <Route path="walks"       element={<WalkerMyWalks />} />
        <Route path="schedule"    element={<WalkerSchedule />} />
        <Route path="earnings"    element={<WalkerEarnings />} />
        <Route path="badges"      element={<WalkerBadges />} />
        <Route path="profile"     element={<WalkerProfile />} />
        <Route path="guide"       element={<WalkerDogGuide />} />
        <Route path="history"     element={<WalkerHistory />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chats"       element={<ChatInbox />} />
        <Route path="community"   element={<Community />} />
        <Route path="settings"    element={<WalkerSettings />} />
        <Route path="privacy"     element={<WalkerPrivacy />} />
        <Route path="dashboard"   element={<Navigate to="/walker" replace />} />
        <Route path="my-walks"    element={<Navigate to="/walker/walks" replace />} />
      </Route>

      {/* Walker full-screen (outside Layout) */}
      <Route path="/walker/live/:walkId"  element={<ProtectedRoute role="walker"><WalkerLiveWalk /></ProtectedRoute>} />
      <Route path="/walker/chat/:walkId"  element={<ProtectedRoute role="walker"><Chat /></ProtectedRoute>} />
      <Route path="/walker/walk/:walkId"  element={<ProtectedRoute role="walker"><WalkerWalkDetail /></ProtectedRoute>} />

      {/* ── Shop Owner ── */}
      <Route path="/shopowner" element={<ProtectedRoute role="shopowner"><Layout /></ProtectedRoute>}>
        <Route index                element={<ShopOwnerDashboard />} />
        <Route path="products"      element={<ShopOwnerMyProducts />} />
        <Route path="orders"        element={<ShopOwnerOrders />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="analytics"     element={<ShopOwnerAnalytics />} />
        <Route path="profile"       element={<ShopOwnerProfile />} />
        <Route path="community"     element={<Community />} />
      </Route>

      {/* ── Owner ── */}
      <Route path="/owner" element={<ProtectedRoute role="owner"><Layout /></ProtectedRoute>}>
        <Route index              element={<OwnerDashboard />} />
        <Route path="request"     element={<OwnerRequestWalk />} />
        <Route path="schedule"    element={<OwnerSchedule />} />
        <Route path="history"     element={<OwnerHistory />} />
        <Route path="dogs"        element={<OwnerDogs />} />
        <Route path="dogs/:dogId" element={<DogProfile />} />
        <Route path="services"    element={<OwnerServices />} />
        <Route path="shop"        element={<OwnerShop />} />
        <Route path="cart"        element={<OwnerCart />} />
        <Route path="profile"     element={<OwnerProfile />} />
        <Route path="vet-booking" element={<VetBooking />} />
        <Route path="track/:walkId" element={<WalkTracker />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chats"       element={<ChatInbox />} />
        <Route path="community"   element={<Community />} />
        <Route path="dashboard"   element={<Navigate to="/owner" replace />} />
        <Route path="request-walk" element={<Navigate to="/owner/request" replace />} />
        <Route path="favourites"  element={<FavouriteWalkers />} />
        <Route path="privacy"     element={<PrivacySafety />} />
        <Route path="profile/payment" element={<PaymentMethods />} />
      </Route>

      {/* Owner full-screen (outside Layout) */}
      <Route path="/owner/chat/:walkId" element={<ProtectedRoute role="owner"><Chat /></ProtectedRoute>} />

      {/* ── Vet ── */}
      <Route path="/vet" element={<ProtectedRoute role="vet"><Layout /></ProtectedRoute>}>
        <Route index                          element={<VetDashboard />} />
        <Route path="appointments"            element={<VetAppointments />} />
        <Route path="appointments/:walkId"    element={<VetAppointmentDetail />} />
        <Route path="profile"                 element={<VetProfile />} />
        <Route path="notifications"           element={<NotificationsPage />} />
      </Route>

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
