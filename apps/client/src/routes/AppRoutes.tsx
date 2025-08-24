// Rollback: Remove Suspense boundaries and restore direct route rendering
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Predictions from '../pages/Predictions';
import Leaderboard from '../pages/Leaderboard';
import EnhancedLeaderboard from '../pages/EnhancedLeaderboard';
import PrivateRoute from '../components/PrivateRoute';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import ProfileSetup from '../pages/ProfileSetup';
import AdminDashboard from '../pages/AdminDashboard';
import Pong from '../pages/Pong';
import { AdminProvider } from '../contexts/AdminContext';

// Suspense fallback component
const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRoutes() {
  const { accessToken, user } = useAuth();

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
        <Route path="/profile/:userId" element={<Profile />} />

        {/* Pong route - enabled by default */}
        <Route path="/pong" element={<Pong />} />

        {/* Admin-only route */}
        <Route
          path="/admin"
          element={
            user?.role === 'ADMIN' ? (
              <AdminProvider>
                <AdminDashboard />
              </AdminProvider>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={accessToken ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
