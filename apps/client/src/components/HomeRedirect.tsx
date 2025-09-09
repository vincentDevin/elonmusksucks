import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * HomeRedirect component handles routing logic for the home page
 * - Authenticated users are redirected to /dashboard
 * - Non-authenticated users are redirected to /public (landing page)
 */
export default function HomeRedirect() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken && user) {
      // Redirect authenticated users to Dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // Redirect non-authenticated users to public landing page
      navigate('/public', { replace: true });
    }
  }, [accessToken, user, navigate]);

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
