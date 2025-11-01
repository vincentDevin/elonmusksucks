/**
 * UnifiedBadge Component
 * Base badge component with PongTierBadge-inspired superior styling
 * Supports theme-aware colors, size variants, animations, and accessibility features
 */

import React from 'react';
import {
  type BadgeSize,
  type BadgeType,
  COMMON_BADGE_CONFIGS,
  BADGE_SIZE_CONFIG,
} from '../../types/badges';

type BadgeAnimation = 'shimmer' | 'pulse' | 'none';

interface UnifiedBadgeProps {
  type: BadgeType;
  text: string;
  icon?: string;
  size?: BadgeSize;
  color?: string;
  description?: string;
  className?: string;
  animated?: BadgeAnimation;
}

/**
 * Size variant configurations matching PongTierBadge pattern
 */
const SIZE_VARIANTS: Record<
  BadgeSize,
  {
    container: string;
    icon: string;
    text: string;
  }
> = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'text-sm',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1 text-sm',
    icon: 'text-base',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-1.5 text-base',
    icon: 'text-lg',
    text: 'text-base',
  },
};

export const UnifiedBadge: React.FC<UnifiedBadgeProps> = ({
  type,
  text,
  icon,
  size,
  color,
  description,
  className = '',
  animated = 'none',
}) => {
  // Get default configuration for this badge type
  const config = COMMON_BADGE_CONFIGS[type];
  const defaultSize = size || BADGE_SIZE_CONFIG[type];
  const sizeClasses = SIZE_VARIANTS[defaultSize];

  // Use provided color or fall back to config color
  const badgeColor =
    color || config?.color || 'bg-muted/50 text-tertiary dark:bg-muted/70 border-muted/30';
  const badgeIcon = icon || config?.icon;
  const badgeDescription = description || config?.description;

  // Animation classes
  const animationClass =
    animated === 'shimmer' ? 'badge-shimmer' : animated === 'pulse' ? 'badge-pulse' : '';

  return (
    <>
      <style>{`
        @keyframes badge-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes badge-pulse-glow {
          0%, 100% {
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 0 15px currentColor, 0 0 30px currentColor;
            filter: brightness(1.2);
          }
        }

        .badge-shimmer {
          position: relative;
          overflow: hidden;
        }

        .badge-shimmer::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: badge-shimmer 3s ease-in-out infinite;
          pointer-events: none;
        }

        .badge-pulse {
          animation: badge-pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      <span
        className={`
          inline-flex items-center space-x-1.5
          ${sizeClasses.container}
          rounded-full
          border
          font-medium
          transition-all duration-200
          ${badgeColor}
          ${animationClass}
          ${className}
        `.trim()}
        title={badgeDescription}
      >
        {badgeIcon && (
          <span className={sizeClasses.icon} aria-hidden="true">
            {badgeIcon}
          </span>
        )}
        <span className={sizeClasses.text}>{text}</span>
      </span>
    </>
  );
};

export default UnifiedBadge;
