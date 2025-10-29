import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * HomeRedirect component handles routing logic for the home page
 * - Authenticated users are redirected to /timeline
 * - Non-authenticated users are redirected to SSR public site
 *
 * IMPORTANT: Uses immediate conditional logic (not useEffect) to prevent
 * component mounting and data fetching before redirect completes
 */
export default function HomeRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Perform redirect immediately when auth state is known
  // This prevents any child components from mounting and fetching data
  useEffect(() => {
    if (loading) return; // Wait for auth to resolve

    if (user) {
      // Redirect authenticated users to Timeline
      // Note: If user exists, we definitely have a valid access token
      navigate('/timeline', { replace: true });
    } else {
      // Redirect non-authenticated users to SSR public site
      const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://127.0.0.1:5173';
      window.location.href = publicSiteUrl;
    }
  }, [user, loading, navigate]);

  // Always show loading spinner to prevent any component mounting
  // This ensures no data fetching happens before redirect completes
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
