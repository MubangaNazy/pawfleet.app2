import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
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
        {/* Legacy redirects */}
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="/walker" element={<ProtectedRoute role="walker"><Layout /></ProtectedRoute>}>
        <Route index element={<WalkerDashboard />} />
        <Route path="walks" element={<WalkerMyWalks />} />
        <Route path="earnings" element={<WalkerEarnings />} />
        <Route path="badges" element={<WalkerBadges />} />
        {/* Legacy redirects */}
        <Route path="dashboard" element={<Navigate to="/walker" replace />} />
        <Route path="my-walks" element={<Navigate to="/walker/walks" replace />} />
      </Route>

      <Route path="/owner" element={<ProtectedRoute role="owner"><Layout /></ProtectedRoute>}>
        <Route index element={<OwnerDashboard />} />
        <Route path="request" element={<OwnerRequestWalk />} />
        <Route path="history" element={<OwnerHistory />} />
        <Route path="dogs" element={<OwnerDogs />} />
        <Route path="dogs/:dogId" element={<DogProfile />} />
        {/* Legacy redirects */}
        <Route path="dashboard" element={<Navigate to="/owner" replace />} />
        <Route path="request-walk" element={<Navigate to="/owner/request" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
