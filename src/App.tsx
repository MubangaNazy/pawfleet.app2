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
const SelfWalk         = lazy(() => import('./pages/owner/SelfWalk'));
const DogTraining      = lazy(() => import('./pages/owner/DogTraining'));
const Marketplace      = lazy(() => import('./pages/owner/Marketplace'));
const PetHealth        = lazy(() => import('./pages/owner/PetHealth'));

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
const DirectMessage     = lazy(() => import('./pages/DirectMessage'));
const Community         = lazy(() => import('./pages/Community'));
const PrivacyPolicy     = lazy(() => import('./pages/PrivacyPolicy'));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccount'));

// ── Splash screen shown while Supabase connects ──────────────────────────────
function WalkingFigureSVG() {
  return (
    <svg width="264" height="116" viewBox="0 0 264 116" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="132" cy="113" rx="120" ry="4" fill="rgba(0,0,0,0.15)" />

      {/* ── PERSON (centered at x=65) ── */}

      {/* Afro — full round natural hair above the head */}
      <ellipse cx="65" cy="6" rx="16" ry="14" fill="rgba(255,255,255,0.88)" />

      {/* Head */}
      <circle cx="65" cy="16" r="12" fill="rgba(255,255,255,0.96)" />

      {/* Torso — shirt-shaped body, not a stick */}
      <path d="M53 28 Q57 25 65 26 Q73 25 77 28 L80 54 Q65 59 50 54 Z" fill="rgba(255,255,255,0.93)" />

      {/* Left arm — swings backward when left leg is forward */}
      <line x1="56" y1="33" x2="44" y2="53" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="20 56 33;-20 56 33;20 56 33"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Right arm — swings forward, holds leash */}
      <line x1="74" y1="33" x2="87" y2="53" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="-20 74 33;20 74 33;-20 74 33"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Left leg — starts forward */}
      <line x1="60" y1="54" x2="51" y2="88" stroke="rgba(255,255,255,0.93)" strokeWidth="10" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="-22 60 54;22 60 54;-22 60 54"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Right leg — starts backward */}
      <line x1="70" y1="54" x2="79" y2="88" stroke="rgba(255,255,255,0.93)" strokeWidth="10" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="22 70 54;-22 70 54;22 70 54"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Leash — curve from right hand to dog collar */}
      <path d="M87 53 Q148 26 180 61" stroke="rgba(255,255,255,0.50)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* ── DOG (golden retriever silhouette, x≈200) ── */}

      {/* Body */}
      <ellipse cx="200" cy="76" rx="32" ry="17" fill="rgba(255,255,255,0.93)" />

      {/* Neck */}
      <path d="M218 65 Q225 69 225 77" stroke="rgba(255,255,255,0.93)" strokeWidth="14" strokeLinecap="round" fill="none" />

      {/* Head — round */}
      <ellipse cx="223" cy="59" rx="18" ry="16" fill="rgba(255,255,255,0.93)" />

      {/* Floppy ear */}
      <path d="M229 48 Q240 43 241 55 Q240 66 230 65 Q222 62 222 57 Z" fill="rgba(255,255,255,0.74)" />

      {/* Muzzle */}
      <ellipse cx="236" cy="65" rx="11" ry="7" fill="rgba(255,255,255,0.93)" />

      {/* Nose */}
      <ellipse cx="243" cy="62" rx="5" ry="3.2" fill="rgba(8,38,22,0.78)" />

      {/* Eye */}
      <circle cx="226" cy="54" r="3.2" fill="rgba(8,38,22,0.78)" />
      <circle cx="225" cy="53" r="1.1" fill="rgba(255,255,255,0.60)" />

      {/* Tail — wags joyfully */}
      <path d="M168 71 Q155 54 162 39" stroke="rgba(255,255,255,0.93)" strokeWidth="6.5" strokeLinecap="round" fill="none">
        <animateTransform attributeName="transform" type="rotate"
          values="-20 168 71;27 168 71;-20 168 71"
          keyTimes="0;0.5;1" dur="0.44s" repeatCount="indefinite" />
      </path>

      {/* Dog front-left leg */}
      <line x1="209" y1="92" x2="205" y2="111" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="-18 209 92;18 209 92;-18 209 92"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Dog front-right leg */}
      <line x1="220" y1="92" x2="226" y2="111" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="18 220 92;-18 220 92;18 220 92"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Dog back-left leg */}
      <line x1="180" y1="91" x2="174" y2="111" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="18 180 91;-18 180 91;18 180 91"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>

      {/* Dog back-right leg */}
      <line x1="193" y1="92" x2="197" y2="111" stroke="rgba(255,255,255,0.93)" strokeWidth="8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="-18 193 92;18 193 92;-18 193 92"
          keyTimes="0;0.5;1" dur="0.75s" repeatCount="indefinite" />
      </line>
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
        @keyframes pf-walker-appear {
          from { opacity: 0; transform: translateY(14px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pf-green-exit {
          0%,55%  { transform: translateY(0); }
          100%    { transform: translateY(-108%); }
        }
        .pf-logo-pop   { animation: pf-logo-pop 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .pf-text       { animation: pf-fade-up 0.5s ease 1.05s both; }
        .pf-tag        { animation: pf-fade-up 0.5s ease 1.28s both; }
        .pf-walker     { animation: pf-walker-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) 1.5s both; }
        .pf-green-exit { animation: pf-green-exit 1s cubic-bezier(0.76,0,0.24,1) 2.8s both; }
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

        {/* Person + dog walking in place — centered at the bottom */}
        <div className="pf-walker" style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <WalkingFigureSVG />
        </div>
      </div>
    </div>
  );
}

// ── Page fallback while chunks load ─────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F4F9F6', zIndex: 40 }}>
      <style>{`
        @keyframes pf-nose-bounce {
          0%, 100% { transform: translateY(0); }
          45%      { transform: translateY(-10px); }
        }
        @keyframes pf-dot-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.7); }
          40%           { opacity: 1;   transform: scale(1); }
        }
        .pf-nose { animation: pf-nose-bounce 1.1s ease-in-out infinite; }
        .pf-pdot { animation: pf-dot-pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* Paw icon bouncing */}
      <div className="pf-nose mb-5">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="26" fill="#1B4332"/>
          {/* paw pads */}
          <ellipse cx="26" cy="30" rx="8" ry="6.5" fill="white" opacity="0.95"/>
          <ellipse cx="15" cy="24" rx="4" ry="5" fill="white" opacity="0.85"/>
          <ellipse cx="37" cy="24" rx="4" ry="5" fill="white" opacity="0.85"/>
          <ellipse cx="19" cy="16" rx="3" ry="3.8" fill="white" opacity="0.75"/>
          <ellipse cx="33" cy="16" rx="3" ry="3.8" fill="white" opacity="0.75"/>
        </svg>
      </div>

      {/* "Sniffing…" text */}
      <p style={{ fontWeight: 700, fontSize: 15, color: '#1B4332', letterSpacing: '0.02em', marginBottom: 14 }}>
        Sniffing around…
      </p>

      {/* Animated dots */}
      <div style={{ display: 'flex', gap: 7 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="pf-pdot" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#2B8A50',
            animationDelay: `${i * 0.2}s`,
          }} />
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
  if (!currentUser) return <Navigate to="/login" replace />;
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
      <Route path="/delete-account" element={<DeleteAccountPage />} />
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
        <Route path="chats"         element={<ChatInbox />} />
        <Route path="community"     element={<Community />} />
        <Route path="dashboard"   element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="/admin/dm/:userId" element={<ProtectedRoute role="admin"><DirectMessage /></ProtectedRoute>} />

      {/* ── Walker ── */}
      <Route path="/walker" element={<ProtectedRoute role="walker"><Layout /></ProtectedRoute>}>
        <Route index              element={<WalkerDashboard />} />
        <Route path="walks"       element={<WalkerMyWalks />} />
        <Route path="schedule"    element={<WalkerSchedule />} />
        <Route path="earnings"    element={<WalkerEarnings />} />
        <Route path="badges"      element={<WalkerBadges />} />
        <Route path="map"         element={<WalkerMap />} />
        <Route path="profile"     element={<WalkerProfile />} />
        <Route path="guide"       element={<WalkerDogGuide />} />
        <Route path="history"     element={<WalkerHistory />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chats"       element={<ChatInbox />} />
        <Route path="community"   element={<Community />} />
        <Route path="shop"        element={<OwnerShop />} />
        <Route path="settings"    element={<WalkerSettings />} />
        <Route path="privacy"     element={<WalkerPrivacy />} />
        <Route path="dashboard"   element={<Navigate to="/walker" replace />} />
        <Route path="my-walks"    element={<Navigate to="/walker/walks" replace />} />
      </Route>

      {/* Walker full-screen (outside Layout) */}
      <Route path="/walker/live/:walkId"  element={<ProtectedRoute role="walker"><WalkerLiveWalk /></ProtectedRoute>} />
      <Route path="/walker/chat/:walkId"  element={<ProtectedRoute role="walker"><Chat /></ProtectedRoute>} />
      <Route path="/walker/dm/:userId"   element={<ProtectedRoute role="walker"><DirectMessage /></ProtectedRoute>} />
      <Route path="/walker/walk/:walkId"  element={<ProtectedRoute role="walker"><WalkerWalkDetail /></ProtectedRoute>} />
      <Route path="/walker/nav/:walkId"   element={<ProtectedRoute role="walker"><WalkerNav /></ProtectedRoute>} />

      {/* ── Shop Owner ── */}
      <Route path="/shopowner" element={<ProtectedRoute role="shopowner"><Layout /></ProtectedRoute>}>
        <Route index                element={<ShopOwnerDashboard />} />
        <Route path="products"      element={<ShopOwnerMyProducts />} />
        <Route path="orders"        element={<ShopOwnerOrders />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="analytics"     element={<ShopOwnerAnalytics />} />
        <Route path="map"           element={<WalkerMap />} />
        <Route path="profile"       element={<ShopOwnerProfile />} />
        <Route path="community"     element={<Community />} />
        <Route path="chats"         element={<ChatInbox />} />
      </Route>
      <Route path="/shopowner/dm/:userId" element={<ProtectedRoute role="shopowner"><DirectMessage /></ProtectedRoute>} />

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
        <Route path="my-walk"      element={<SelfWalk />} />
        <Route path="dog-training" element={<DogTraining />} />
        <Route path="marketplace"  element={<Marketplace />} />
        <Route path="pet-health"   element={<PetHealth />} />
      </Route>

      {/* Owner full-screen (outside Layout) */}
      <Route path="/owner/chat/:walkId" element={<ProtectedRoute role="owner"><Chat /></ProtectedRoute>} />
      <Route path="/owner/dm/:userId"   element={<ProtectedRoute role="owner"><DirectMessage /></ProtectedRoute>} />

      {/* ── Vet ── */}
      <Route path="/vet" element={<ProtectedRoute role="vet"><Layout /></ProtectedRoute>}>
        <Route index                          element={<VetDashboard />} />
        <Route path="appointments"            element={<VetAppointments />} />
        <Route path="appointments/:walkId"    element={<VetAppointmentDetail />} />
        <Route path="schedule"               element={<VetSchedule />} />
        <Route path="analytics"              element={<VetAnalytics />} />
        <Route path="map"                    element={<WalkerMap />} />
        <Route path="profile"                 element={<VetProfile />} />
        <Route path="notifications"           element={<NotificationsPage />} />
        <Route path="chats"                   element={<ChatInbox />} />
        <Route path="community"               element={<Community />} />
      </Route>
      <Route path="/vet/dm/:userId" element={<ProtectedRoute role="vet"><DirectMessage /></ProtectedRoute>} />

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
