// apps/client/src/components/BaseCard.tsx
// -----------------------------------------------------------------------------
// Base card component providing consistent styling and behavior patterns
// Based on PredictionCard styling as the designated style source of truth
// Supports multiple variants, status badges, and responsive design
// -----------------------------------------------------------------------------

import React, { ReactNode } from 'react';

type CardVariant = 'full' | 'compact' | 'mini';
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral';

interface StatusBadge {
  text: string;
  icon?: string;
  type: StatusType;
}

interface BaseCardProps {
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;

  // Status badge configuration
  status?: StatusBadge;
  hotActivity?: boolean; // Shows "🔥 Hot" indicator

  // Header content
  title?: string;
  subtitle?: string;

  // Action buttons
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
    disabled?: boolean;
  };

  // Layout options
  as?: 'div' | 'article' | 'li';
  hoverable?: boolean;
  bordered?: boolean;
}

export default function BaseCard({
  children,
  variant = 'full',
  className = '',
  onClick,
  status,
  hotActivity = false,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  as: Component = 'div',
  hoverable = true,
  bordered = true,
}: BaseCardProps) {
  const isFullSize = variant === 'full';
  const isCompact = variant === 'compact';
  const isMini = variant === 'mini';

  // Status badge styling
  const getStatusColors = (type: StatusType) => {
    switch (type) {
      case 'success':
        return 'bg-success text-success-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'error':
        return 'bg-error text-error-foreground';
      case 'info':
        return 'bg-info text-info-foreground';
      case 'accent':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-content';
    }
  };

  // Dynamic classes based on variant
  const cardClasses = `
    relative bg-surface transition-all duration-200
    ${bordered ? 'border border-muted' : ''}
    ${hoverable ? 'hover:shadow-md hover:border-muted/60' : ''}
    ${isFullSize ? 'p-5 rounded-2xl shadow hover:shadow-lg' : ''}
    ${isCompact ? 'p-4 rounded-xl shadow-sm' : ''}
    ${isMini ? 'p-3 rounded-lg shadow-sm' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  const titleClasses = `
    font-semibold mb-2 text-content
    ${isFullSize ? 'text-xl' : ''}
    ${isCompact ? 'text-lg line-clamp-2' : ''}
    ${isMini ? 'text-base line-clamp-1' : ''}
    ${status || hotActivity ? (isFullSize ? 'pr-24' : isCompact ? 'pr-16' : 'pr-12') : ''}
  `.trim();

  const subtitleClasses = `
    text-sm text-tertiary mb-3
    ${isMini ? 'text-xs mb-2' : ''}
  `.trim();

  const badgeClasses = `
    absolute px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
    ${isFullSize ? 'top-4 right-4 px-3' : ''}
    ${isCompact ? 'top-3 right-3' : ''}
    ${isMini ? 'top-2 right-2 px-1.5 text-xs' : ''}
  `.trim();

  return (
    <Component className={cardClasses} onClick={onClick}>
      {/* Status Badge and Activity Indicators */}
      {(status || hotActivity) && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {status && (
            <span className={`${badgeClasses} ${getStatusColors(status.type)}`}>
              {status.icon && <span>{status.icon}</span>}
              {status.text}
            </span>
          )}
          {hotActivity && (
            <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full font-semibold animate-pulse">
              🔥 Hot
            </span>
          )}
        </div>
      )}

      {/* Header Section */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className={titleClasses}>{title}</h3>}
          {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">{children}</div>

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className={`mt-4 flex gap-2 ${isMini ? 'flex-col' : ''}`}>
          {primaryAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                primaryAction.onClick();
              }}
              disabled={primaryAction.loading}
              className={`
                ${isMini ? 'w-full' : 'flex-1'}
                px-3 py-2 bg-info hover:bg-info/90 text-background text-sm font-medium
                rounded-lg transition-all duration-200 hover:scale-105
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                ${isFullSize ? 'py-3 px-6 font-bold shadow-lg hover:shadow-xl' : ''}
              `}
            >
              <span className="flex items-center justify-center gap-2">
                {primaryAction.icon && <span>{primaryAction.icon}</span>}
                <span>{primaryAction.loading ? 'Loading...' : primaryAction.label}</span>
              </span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                secondaryAction.onClick();
              }}
              disabled={secondaryAction.disabled}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                bg-secondary hover:bg-secondary/90 text-background hover:scale-105
              `}
            >
              <span className="flex items-center justify-center gap-1">
                {secondaryAction.icon && <span>{secondaryAction.icon}</span>}
                <span>{secondaryAction.label}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </Component>
  );
}

// Convenience components for common card patterns
export function ArticleCard(props: Omit<BaseCardProps, 'as'>) {
  return <BaseCard {...props} as="article" />;
}

export function ListCard(props: Omit<BaseCardProps, 'as'>) {
  return <BaseCard {...props} as="li" />;
}

// Hook for status badge creation
export function useStatusBadge(
  resolved?: boolean,
  expiresAt?: Date | string,
  isActive?: boolean,
): StatusBadge | undefined {
  if (resolved) {
    return { text: 'Resolved', icon: '✅', type: 'success' };
  }

  const now = Date.now();
  const expires = expiresAt ? new Date(expiresAt).getTime() : 0;
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

  if (expires && now > expires) {
    return { text: 'Expired', icon: '⏰', type: 'error' };
  } else if (expires && hoursLeft <= 2) {
    return { text: 'Ending Soon', icon: '🔥', type: 'warning' };
  } else if (expires && hoursLeft <= 24) {
    return { text: 'Final Day', icon: '⚡', type: 'info' };
  } else if (isActive) {
    return { text: 'Open', icon: '🟢', type: 'success' };
  }

  return undefined;
}
