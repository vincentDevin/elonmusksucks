import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import env from '../config/env';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import PrivateRoute from '../components/PrivateRoute';
import HomeRedirect from '../components/HomeRedirect';
import ProfileSetup from '../pages/ProfileSetup';
import RequireAdmin from '../components/admin/RequireAdmin';
import MainLayout from '../components/MainLayout';

// Lazy-loaded authenticated routes for code splitting
const Timeline = lazy(() => import('../pages/Timeline'));
const AuthPredictions = lazy(() => import('../pages/Predictions'));
const AuthLeaderboard = lazy(() => import('../pages/Leaderboard'));
const Profile = lazy(() => import('../pages/Profile'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const Pong = lazy(() => import('../pages/Pong'));

// Redirect to public site component
const PublicSiteRedirect = () => {
  React.useEffect(() => {
    window.location.href = env.PUBLIC_SITE_URL || '/login';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

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
      {/* Home route - shows public landing or redirects if authenticated */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <MainLayout>
            <Login />
          </MainLayout>
        }
      />
      <Route
        path="/register"
        element={
          <MainLayout>
            <Register />
          </MainLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <MainLayout>
            <ForgotPassword />
          </MainLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <MainLayout>
            <ResetPassword />
          </MainLayout>
        }
      />
      <Route
        path="/setup-profile"
        element={
          <MainLayout>
            <ProfileSetup />
          </MainLayout>
        }
      />

      {/* Protected authenticated routes */}
      <Route element={<PrivateRoute />}>
        <Route
          path="/timeline"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Timeline />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/predictions"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <AuthPredictions />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/predictions/:id"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <AuthPredictions />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <AuthLeaderboard />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Profile />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Pong route */}
        <Route
          path="/pong"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Pong />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Admin-only route */}
        <Route
          path="/admin"
          element={
            <MainLayout>
              <RequireAdmin>
                <Suspense fallback={<RouteFallback />}>
                  <AdminDashboard />
                </Suspense>
              </RequireAdmin>
            </MainLayout>
          }
        />
      </Route>

      {/* Fallback - redirect unknown routes */}
      <Route
        path="*"
        element={accessToken ? <Navigate to="/timeline" replace /> : <PublicSiteRedirect />}
      />
    </Routes>
  );
}
