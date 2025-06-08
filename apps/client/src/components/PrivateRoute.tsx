import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PrivateRoute() {
  const { accessToken, loading } = useAuth();

  if (loading) {
    return null; // or a spinner if you have one
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
