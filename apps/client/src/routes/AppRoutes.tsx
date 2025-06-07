import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Predictions from '../pages/Predictions';
import Leaderboard from '../pages/Leaderboard';
import PrivateRoute from '../components/PrivateRoute';

export default function AppRoutes() {
  const { accessToken } = useAuth();

  return (
    <Routes>
      {/* Public homepage */}
      <Route path="/" element={<Home />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>

      {/* Redirect unknown paths */}
      <Route path="*" element={<Navigate to={accessToken ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
