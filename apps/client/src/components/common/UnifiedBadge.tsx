/**
 * UnifiedBadge Component
 * Theme-aware badge component with rarity-based styling and animations
 * Integrates with the unified theme system
 */

import React, { useMemo } from 'react';
import { useBadgeTheme } from '../../theme/hooks/useBadgeTheme';
import {
  type BadgeSize,
  type BadgeType,
  type BadgeRarity,
  BADGE_SIZE_CONFIG,
} from '../../types/badges';
import '../../theme/badge-animations.css';

interface UnifiedBadgeProps {
  type: BadgeType;
  text: string;
  icon?: string;
  size?: BadgeSize;
  rarity?: BadgeRarity;
  description?: string;
  className?: string;
  customColors?: {
    background?: string;
    gradient?: string;
    border?: string;
    text?: string;
    glow?: string;
    shadow?: string;
    lightSweep?: string;
  };
  variant?: 'solid' | 'glass';
}

/**
 * Size variant configurations
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
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'text-sm',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1 text-sm gap-1.5',
    icon: 'text-base',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-1.5 text-base gap-2',
    icon: 'text-lg',
    text: 'text-base',
  },
};

/**
 * Default rarity mapping by badge type
 */
const TYPE_RARITY_DEFAULTS: Record<BadgeType, BadgeRarity> = {
  BOT: 'common',
  STREAK: 'uncommon',
  HIGH_ROLLER: 'rare',
  TIER: 'uncommon', // Default, tier badges handle their own rarity
  BAN_PERMANENT: 'common',
  BAN_TEMPORARY: 'common',
  BAN_COUNT: 'common',
};

/**
 * Rarity-based size scaling for visual hierarchy (all same size to prevent pixelation)
 */
const RARITY_SIZE_MODIFIERS: Record<BadgeRarity, string> = {
  common: 'scale-100', // Base size
  uncommon: 'scale-100', // Same size
  rare: 'scale-100', // Same size
  epic: 'scale-100', // Same size
  legendary: 'scale-100', // Same size
};

/**
 * Rarity-based border thickness for added weight and presence
 */
const RARITY_BORDER_WIDTHS: Record<BadgeRarity, string> = {
  common: 'border',
  uncommon: 'border',
  rare: 'border',
  epic: 'border',
  legendary: 'border',
};

/**
 * Rarity-based font weight for visual hierarchy
 */
const RARITY_FONT_WEIGHTS: Record<BadgeRarity, string> = {
  common: 'font-medium',
  uncommon: 'font-medium',
  rare: 'font-semibold',
  epic: 'font-semibold',
  legendary: 'font-semibold',
};

const VARIANT_CLASSES: Record<'solid' | 'glass', string> = {
  solid: '',
  glass: 'backdrop-blur-sm',
};

export const UnifiedBadge: React.FC<UnifiedBadgeProps> = ({
  type,
  text,
  icon,
  size,
  rarity,
  description,
  className = '',
  customColors,
  variant = 'solid',
}) => {
  const { getRarityColors, getBadgeTypeIcon, getAnimations, getCSSVariables, shouldAnimate } =
    useBadgeTheme();

  // Determine rarity (use provided or default based on type)
  const badgeRarity = rarity || TYPE_RARITY_DEFAULTS[type];

  // Get default size for this badge type
  const defaultSize = size || BADGE_SIZE_CONFIG[type];
  const sizeClasses = SIZE_VARIANTS[defaultSize];

  // Get theme colors for this rarity, or use custom colors
  const colors = useMemo(() => {
    if (customColors) {
      const themeColors = getRarityColors(badgeRarity);
      const { shadow: _shadow, ...overrides } = customColors;
      return {
        ...themeColors,
        ...overrides, // Custom colors override theme colors
      };
    }
    return getRarityColors(badgeRarity);
  }, [badgeRarity, getRarityColors, customColors]);

  // Get icon (use provided or type default)
  const badgeIcon = icon || getBadgeTypeIcon(type);

  // Get animation classes
  const animationClasses = useMemo(() => {
    if (!shouldAnimate()) return '';
    return getAnimations(badgeRarity).join(' ');
  }, [badgeRarity, shouldAnimate, getAnimations]);

  // Build CSS custom properties for animations
  const cssVariables = useMemo(() => {
    const baseVars = getCSSVariables(badgeRarity);
    // Override with custom colors if provided
    if (customColors) {
      return {
        ...baseVars,
        ...(customColors.background && { '--badge-bg-color': customColors.background }),
        ...(customColors.border && { '--badge-border-color': customColors.border }),
        ...(customColors.text && { '--badge-text-color': customColors.text }),
        ...(customColors.glow && {
          '--badge-glow-color': customColors.glow,
          '--badge-complementary-color': customColors.glow,
        }),
        ...(customColors.lightSweep && { '--badge-light-sweep': customColors.lightSweep }),
      };
    }
    return baseVars;
  }, [badgeRarity, getCSSVariables, customColors]);

  // Build inline styles
  const style = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      ...cssVariables,
      borderColor: colors.border,
      color: colors.text,
    };

    const backgroundColor = customColors?.background ?? colors.background;
    const gradient = customColors?.gradient ?? colors.gradient;

    if (gradient) {
      baseStyle.background = gradient;
    } else if (backgroundColor) {
      baseStyle.background = backgroundColor;
    }

    if (customColors?.shadow) {
      baseStyle.boxShadow = customColors.shadow;
    }

    return baseStyle;
  }, [cssVariables, colors, customColors]);

  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses.container}
        rounded-full
        ${RARITY_BORDER_WIDTHS[badgeRarity]}
        ${RARITY_FONT_WEIGHTS[badgeRarity]}
        transition-all duration-200
        transform-gpu
        ${RARITY_SIZE_MODIFIERS[badgeRarity]}
        ${animationClasses}
        ${VARIANT_CLASSES[variant]}
        ${className}
      `.trim()}
      style={style}
      title={description}
    >
      {badgeIcon && (
        <span className={sizeClasses.icon} aria-hidden="true">
          {badgeIcon}
        </span>
      )}
      <span className={sizeClasses.text}>{text}</span>
    </span>
  );
};

export default UnifiedBadge;
