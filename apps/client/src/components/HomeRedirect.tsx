import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * HomeRedirect component handles routing logic for the home page
 * - Authenticated users are redirected to /timeline (social hub)
 * - Anonymous users are redirected to the public SSR site
 */
export default function HomeRedirect() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if user is fully authenticated (has both token and user data)
    if (accessToken && user) {
      // Redirect authenticated users to Timeline (social hub)
      navigate('/timeline', { replace: true });
    } else if (!accessToken) {
      // Redirect non-authenticated users to the public SSR site
      const publicSiteUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://public.elonmusksucks.net' // Update this for production
          : 'http://127.0.0.1:5173';
      window.location.href = publicSiteUrl;
    }
  }, [accessToken, user, navigate]);

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
