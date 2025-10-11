// apps/client/src/components/prediction/FloatingCreatePredictionWidget.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import { useAuth } from '../../contexts/AuthContext';

interface FloatingCreatePredictionWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  hideOnMobile?: boolean;
}

/**
 * Floating widget for creating predictions from any page
 * Matches QuickThemeSwitcher visual style
 * Admin only - conditionally rendered based on user role
 */
export const FloatingCreatePredictionWidget: React.FC<FloatingCreatePredictionWidgetProps> = ({
  className = '',
  position = 'bottom-right',
  hideOnMobile = true,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const { openCreateModal } = usePredictionMarket();

  // Only show for admin users
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  // Detect if we're on the dashboard to adjust positioning
  const isOnDashboard = location.pathname === '/dashboard';

  // Adjust position based on dashboard context
  const getPositionClasses = () => {
    if (isOnDashboard && position === 'bottom-right') {
      // Position as part of the dashboard FAB group
      // Above QuickThemeSwitcher which adjusts to bottom-[160px] on dashboard
      return 'bottom-[220px] right-8';
    }
    // Default positioning: 70px from bottom (above QuickThemeSwitcher at bottom-2 = 8px)
    return {
      'bottom-right': 'bottom-[70px] right-4',
      'bottom-left': 'bottom-[70px] left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    }[position];
  };

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} ${hideOnMobile ? 'hidden sm:block' : ''} ${className}`}
    >
      {/* Main Toggle Button - Matches QuickThemeSwitcher style exactly */}
      <button
        onClick={() => openCreateModal()}
        className={`
          ${isOnDashboard ? 'w-12 h-12' : 'w-12 h-12'} rounded-full transition-all duration-200
          flex items-center justify-center backdrop-blur-sm
          ${
            isOnDashboard
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-accent text-white hover:bg-accent/90'
          }
          border-2 border-primary/40
          hover:scale-110
        `}
        style={{
          boxShadow:
            '0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Create prediction"
        title="Create Prediction"
      >
        <span className="text-xl">📊</span>
      </button>
    </div>
  );
};

export default FloatingCreatePredictionWidget;
