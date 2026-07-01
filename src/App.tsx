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

const WalkerNav        = lazy(() => import('./pages/walker/WalkerNav'));
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
const AdminDogs        = lazy(() => import('./pages/admin/Dogs'));

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
const TrackHub         = lazy(() => import('./pages/owner/TrackHub'));
const HomeGrooming     = lazy(() => import('./pages/owner/HomeGrooming'));
const WalkerMap        = lazy(() => import('./pages/owner/WalkerMap'));
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
const VetSchedule           = lazy(() => import('./pages/vet/Schedule'));
const VetAnalytics          = lazy(() => import('./pages/vet/Analytics'));
const VetProfile            = lazy(() => import('./pages/vet/Profile'));

const NotificationsPage = lazy(() => import('./pages/Notifications'));
const ChatInbox         = lazy(() => import('./pages/ChatInbox'));
const Chat              = lazy(() => import('./pages/Chat'));
const Community         = lazy(() => import('./pages/Community'));
const PrivacyPolicy     = lazy(() => import('./pages/PrivacyPolicy'));

// ── Splash screen shown while Supabase connects ──────────────────────────────
function WalkerSVG() {
  return (
    <svg width="200" height="108" viewBox="0 0 200 108" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="105" cy="104" rx="82" ry="4" fill="rgba(0,0,0,0.15)"/>
      {/* Person — head */}
      <circle cx="30" cy="14" r="12" fill="rgba(255,255,255,0.92)"/>
      {/* Person — torso */}
      <path d="M22 27 Q30 31 38 27 L41 55 Q30 58 19 55 Z" fill="rgba(255,255,255,0.92)"/>
      {/* Person — arm forward (holding leash) */}
      <path d="M38 35 L58 44" stroke="rgba(255,255,255,0.92)" strokeWidth="6" strokeLinecap="round"/>
      {/* Person — arm back */}
      <path d="M22 35 L11 48" stroke="rgba(255,255,255,0.92)" strokeWidth="6" strokeLinecap="round"/>
      {/* Person — leg forward */}
      <path d="M24 55 L16 86 L23 86 L30 60" fill="rgba(255,255,255,0.92)"/>
      {/* Person — leg back */}
      <path d="M36 55 L45 83 L38 84 L30 59" fill="rgba(255,255,255,0.92)"/>
      {/* Leash */}
      <path d="M58 44 Q86 32 110 54" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Dog — body */}
      <ellipse cx="148" cy="72" rx="28" ry="15" fill="rgba(255,255,255,0.92)"/>
      {/* Dog — neck */}
      <path d="M164 60 Q170 66 170 72" stroke="rgba(255,255,255,0.92)" strokeWidth="11" strokeLinecap="round"/>
      {/* Dog — head */}
      <ellipse cx="166" cy="56" rx="16" ry="14" fill="rgba(255,255,255,0.92)"/>
      {/* Dog — ear */}
      <path d="M174 46 C183 38 187 49 182 59 Q177 67 170 59 Z" fill="rgba(255,255,255,0.8)"/>
      {/* Dog — snout */}
      <ellipse cx="178" cy="62" rx="9" ry="6" fill="rgba(255,255,255,0.92)"/>
      {/* Dog — nose */}
      <ellipse cx="185" cy="59" rx="4" ry="3" fill="#0d3322"/>
      {/* Dog — tail */}
      <path d="M120 66 Q107 50 113 37" stroke="rgba(255,255,255,0.92)" strokeWidth="5.5" strokeLinecap="round"/>
      {/* Dog — front legs */}
      <path d="M154 87 L149 102" stroke="rgba(255,255,255,0.92)" strokeWidth="6.5" strokeLinecap="round"/>
      <path d="M164 87 L170 102" stroke="rgba(255,255,255,0.92)" strokeWidth="6.5" strokeLinecap="round"/>
      {/* Dog — back legs */}
      <path d="M128 83 L121 99" stroke="rgba(255,255,255,0.92)" strokeWidth="6.5" strokeLinecap="round"/>
      <path d="M140 85 L143 101" stroke="rgba(255,255,255,0.92)" strokeWidth="6.5" strokeLinecap="round"/>
    </svg>
  );
}

function AppLoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden', background: 'white' }}>
      <style>{`
        @keyframes pf-logo-pop {
          0%   { opacity: 0; transform: scale(0.25) translateY(50px); }
          55%  { opacity: 1; transform: scale(1.1) translateY(-10px); }
          78%  { transform: scale(0.97) translateY(3px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pf-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pf-walker-slide {
          from { transform: translateX(-240px); }
          to   { transform: translateX(calc(100vw + 240px)); }
        }
        @keyframes pf-green-exit {
          0%,55%  { transform: translateY(0); }
          100%    { transform: translateY(-108%); }
        }
        .pf-logo-pop   { animation: pf-logo-pop 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .pf-text       { animation: pf-fade-up 0.5s ease 1.05s both; }
        .pf-tag        { animation: pf-fade-up 0.5s ease 1.28s both; }
        .pf-walker     { animation: pf-walker-slide 3s ease-in-out 0.5s both; }
        .pf-green-exit { animation: pf-green-exit 1s cubic-bezier(0.76,0,0.24,1) 2.4s both; }
      `}</style>

      {/* White base — revealed when green lifts */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="PawFleet" style={{ width: 80, height: 80, borderRadius: '22%' }}/>
        <p style={{ fontWeight: 800, fontSize: 38, color: '#1B4332', marginTop: 18, letterSpacing: '-0.025em' }}>PawFleet</p>
      </div>

      {/* Forest green overlay — springs logo, walks figure, then slides up */}
      <div className="pf-green-exit" style={{ position: 'absolute', inset: 0, background: '#1B4332', overflow: 'hidden', zIndex: 10 }}>
        {/* Decorative radial glows */}
        <div style={{ position: 'absolute', top: '-25%', right: '-15%', width: '65vw', height: '65vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,183,136,0.22) 0%, transparent 70%)' }}/>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(43,138,80,0.28) 0%, transparent 70%)' }}/>

        {/* Logo + name centred */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pf-logo-pop">
            <img src="/logo.png" alt="PawFleet" style={{ width: 104, height: 104, borderRadius: '22%', boxShadow: '0 16px 56px rgba(0,0,0,0.35)' }}/>
          </div>
          <p className="pf-text" style={{ fontWeight: 800, fontSize: 44, color: 'white', marginTop: 22, letterSpacing: '-0.025em' }}>PawFleet</p>
          <p className="pf-tag" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Zambia</p>
        </div>

        {/* Person + dog walking across the bottom */}
        <div className="pf-walker" style={{ position: 'absolute', bottom: 40, left: 0 }}>
          <WalkerSVG />
        </div>
      </div>
    </div>
  );
}

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
  const [minDone, setMinDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 2900);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minDone) return <AppLoadingScreen />;

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
        <Route path="dogs"        element={<AdminDogs />} />
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
      <Route path="/walker/nav/:walkId"   element={<ProtectedRoute role="walker"><WalkerNav /></ProtectedRoute>} />

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
        <Route path="track"           element={<TrackHub />} />
        <Route path="track/:walkId"   element={<WalkTracker />} />
        <Route path="grooming"        element={<HomeGrooming />} />
        <Route path="walker-map"      element={<WalkerMap />} />
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
        <Route path="schedule"               element={<VetSchedule />} />
        <Route path="analytics"              element={<VetAnalytics />} />
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
