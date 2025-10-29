// Consolidated Authentication Guard - supports both route and component guarding
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import env from '../config/env';

type GuardMode = 'route' | 'component' | 'external';

interface PrivateRouteProps {
  // Component mode props
  children?: React.ReactNode;

  // Configuration
  mode?: GuardMode;
  fallbackUrl?: string;
  requireProfile?: boolean;
  showSpinner?: boolean;
}

export default function PrivateRoute({
  children,
  mode = 'route',
  fallbackUrl,
  requireProfile = true,
  showSpinner = true,
}: PrivateRouteProps) {
  const { loading, user } = useAuth();

  // External redirect mode (original AuthGuard behavior)
  useEffect(() => {
    if (mode === 'external' && !loading && !user) {
      const redirectUrl = fallbackUrl || env.PUBLIC_SITE_URL || 'http://localhost:5173';
      window.location.href = redirectUrl;
    }
  }, [user, loading, fallbackUrl, mode]);

  // Loading state
  if (loading) {
    if (mode === 'route' && !showSpinner) {
      return null;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Authentication check - user object is the source of truth
  if (!user) {
    switch (mode) {
      case 'external':
        // External redirect handled by useEffect, show spinner while redirecting
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        );

      case 'component':
        // Component mode: don't render children
        return null;

      case 'route':
      default:
        // Route mode: navigate to login
        return <Navigate to="/login" replace />;
    }
  }

  // Profile completion check (if required)
  if (requireProfile && user != null && !user.profileComplete) {
    if (mode === 'route') {
      return <Navigate to="/setup-profile" replace />;
    }
    // For component mode, still render children but could add profile prompt
  }

  // Render content for authenticated users
  switch (mode) {
    case 'component':
    case 'external':
      return <>{children}</>;

    case 'route':
    default:
      return <Outlet />;
  }
}

// Convenience exports for backward compatibility
export function AuthGuard({
  children,
  fallbackUrl,
}: {
  children: React.ReactNode;
  fallbackUrl?: string;
}) {
  return (
    <PrivateRoute mode="external" fallbackUrl={fallbackUrl} requireProfile={false}>
      {children}
    </PrivateRoute>
  );
}
