import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Predictions from '../pages/Predictions';
import Leaderboard from '../pages/Leaderboard';
import PrivateRoute from '../components/PrivateRoute';
import Home from '../pages/Home';

export default function AppRoutes() {
  const { accessToken } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={<Home />} />
      <Route path="/login"  element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={accessToken ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  )
}