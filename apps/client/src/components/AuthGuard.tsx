import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

/**
 * AuthGuard component that redirects non-authenticated users to the SSR public site
 * Used for pages that should only be accessible to logged-in users
 */
export default function AuthGuard({ children, fallbackUrl }: AuthGuardProps) {
  const { accessToken, loading } = useAuth();

  useEffect(() => {
    // If not authenticated, redirect to SSR public site or custom fallback
    if (!loading && !accessToken) {
      const redirectUrl =
        fallbackUrl ||
        (process.env.NODE_ENV === 'production'
          ? 'https://public.elonmusksucks.net' // Update for production
          : 'http://127.0.0.1:5173');
      window.location.href = redirectUrl;
    }
  }, [accessToken, loading, fallbackUrl]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render children for authenticated users
  return <>{children}</>;
}
