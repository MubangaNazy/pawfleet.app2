import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminWalks from './pages/admin/Walks';
import AdminCreateWalk from './pages/admin/CreateWalk';
import AdminMapView from './pages/admin/MapView';
import AdminWalkers from './pages/admin/Walkers';
import AdminOwners from './pages/admin/Owners';
import AdminPayments from './pages/admin/Payments';

// Walker pages
import WalkerDashboard from './pages/walker/Dashboard';
import WalkerMyWalks from './pages/walker/MyWalks';
import WalkerEarnings from './pages/walker/Earnings';
import WalkerBadges from './pages/walker/Badges';

// Owner pages
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerRequestWalk from './pages/owner/RequestWalk';
import OwnerHistory from './pages/owner/History';
import OwnerDogs from './pages/owner/Dogs';
import DogProfile from './pages/owner/DogProfile';
import OwnerServices from './pages/owner/Services';
import OwnerShop from './pages/owner/Shop';
import OwnerProfile from './pages/owner/Profile';
import WalkTracker from './pages/owner/WalkTracker';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string | string[] }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(currentUser.role)) return <Navigate to={`/${currentUser.role}`} replace />;
  }
  return <>{children}</>;
}

function RoleRedirect() {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={`/${currentUser.role}`} replace />;
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
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs text-ink-muted">Connecting to database…</p>
      </div>
    );
  }
  return <AppRoutes />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="walks" element={<AdminWalks />} />
        <Route path="create-walk" element={<AdminCreateWalk />} />
        <Route path="map" element={<AdminMapView />} />
        <Route path="walkers" element={<AdminWalkers />} />
        <Route path="owners" element={<AdminOwners />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="/walker" element={<ProtectedRoute role="walker"><Layout /></ProtectedRoute>}>
        <Route index element={<WalkerDashboard />} />
        <Route path="walks" element={<WalkerMyWalks />} />
        <Route path="earnings" element={<WalkerEarnings />} />
        <Route path="badges" element={<WalkerBadges />} />
        <Route path="dashboard" element={<Navigate to="/walker" replace />} />
        <Route path="my-walks" element={<Navigate to="/walker/walks" replace />} />
      </Route>

      <Route path="/owner" element={<ProtectedRoute role="owner"><Layout /></ProtectedRoute>}>
        <Route index element={<OwnerDashboard />} />
        <Route path="request" element={<OwnerRequestWalk />} />
        <Route path="history" element={<OwnerHistory />} />
        <Route path="dogs" element={<OwnerDogs />} />
        <Route path="dogs/:dogId" element={<DogProfile />} />
        <Route path="services" element={<OwnerServices />} />
        <Route path="shop" element={<OwnerShop />} />
        <Route path="profile" element={<OwnerProfile />} />
        <Route path="track/:walkId" element={<WalkTracker />} />
        {/* Legacy redirects */}
        <Route path="dashboard" element={<Navigate to="/owner" replace />} />
        <Route path="request-walk" element={<Navigate to="/owner/request" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !localStorage.getItem('pawfleet_onboarded');
  });

  const handleSplashDone = () => {
    localStorage.setItem('pawfleet_onboarded', '1');
    setShowSplash(false);
  };

  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          {showSplash && <SplashScreen onDone={handleSplashDone} />}
          <AppContent />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
