import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PrivateRoute() {
  const { accessToken, loading, user } = useAuth();

  if (loading) {
    return null; // or a spinner if you have one
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (user != null && !user.profileComplete) {
    return <Navigate to="/setup-profile" replace />;
  }
  return <Outlet />;
}
