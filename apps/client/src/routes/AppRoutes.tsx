// Rollback: Remove Suspense boundaries and restore direct route rendering
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Leaderboard from '../pages/Leaderboard';
import PrivateRoute from '../components/PrivateRoute';
import Home from '../pages/Home';
import ProfileSetup from '../pages/ProfileSetup';
import RequireAdmin from '../components/admin/RequireAdmin';

// Lazy-loaded major routes for code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Predictions = lazy(() => import('../pages/Predictions'));
const EnhancedLeaderboard = lazy(() => import('../pages/EnhancedLeaderboard'));
const Profile = lazy(() => import('../pages/Profile'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const Pong = lazy(() => import('../pages/Pong'));

// Suspense fallback component
const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRoutes() {
  const { accessToken } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup-profile" element={<ProfileSetup />} />

      {/* Protected */}
      <Route element={<PrivateRoute />}>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/predictions"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Predictions />
            </Suspense>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <Suspense fallback={<RouteFallback />}>
              <EnhancedLeaderboard />
            </Suspense>
          }
        />
        <Route path="/leaderboard/classic" element={<Leaderboard />} />
        <Route
          path="/profile/:userId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Profile />
            </Suspense>
          }
        />

        {/* Pong route - enabled by default */}
        <Route
          path="/pong"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Pong />
            </Suspense>
          }
        />

        {/* Admin-only route */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Suspense fallback={<RouteFallback />}>
                <AdminDashboard />
              </Suspense>
            </RequireAdmin>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={accessToken ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
