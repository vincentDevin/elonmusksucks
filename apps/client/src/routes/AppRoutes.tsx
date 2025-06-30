import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Predictions from '../pages/Predictions';
import Leaderboard from '../pages/Leaderboard';
import PrivateRoute from '../components/PrivateRoute';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import ProfileSetup from '../pages/ProfileSetup';
import AdminDashboard from '../pages/AdminDashboard';
import { AdminProvider } from '../contexts/AdminContext';

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile/:userId" element={<Profile />} />

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
