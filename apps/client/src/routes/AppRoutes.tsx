import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Timeline = lazy(() => import('../pages/Timeline'));
const AuthPredictions = lazy(() => import('../pages/Predictions'));
const AuthLeaderboard = lazy(() => import('../pages/Leaderboard'));
const Profile = lazy(() => import('../pages/Profile'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const Pong = lazy(() => import('../pages/Pong'));

// Lazy-loaded public routes (using converted SSR components)
const PublicLanding = lazy(() => import('../pages/public/PublicLanding'));
const PublicPredictions = lazy(() => import('../pages/public/PublicPredictions'));
const PublicLeaderboard = lazy(() => import('../pages/public/PublicLeaderboard'));
const PublicTimeline = lazy(() => import('../pages/public/PublicTimeline'));

import HashtagFeed from '../components/posts/HashtagFeed';

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

      {/* Public routes - accessible to all */}
      <Route
        path="/public"
        element={
          <MainLayout>
            <Suspense fallback={<RouteFallback />}>
              <PublicLanding />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/public/predictions"
        element={
          <MainLayout>
            <Suspense fallback={<RouteFallback />}>
              <PublicPredictions />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/public/leaderboard"
        element={
          <MainLayout>
            <Suspense fallback={<RouteFallback />}>
              <PublicLeaderboard />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/public/timeline"
        element={
          <MainLayout>
            <Suspense fallback={<RouteFallback />}>
              <PublicTimeline />
            </Suspense>
          </MainLayout>
        }
      />

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
          path="/dashboard"
          element={
            <MainLayout>
              <Suspense fallback={<RouteFallback />}>
                <Dashboard />
              </Suspense>
            </MainLayout>
          }
        />
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

        {/* Hashtag feed route */}
        <Route
          path="/hashtag/:tag"
          element={
            <MainLayout>
              <HashtagFeed />
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
      <Route path="*" element={<Navigate to={accessToken ? '/dashboard' : '/public'} replace />} />
    </Routes>
  );
}
