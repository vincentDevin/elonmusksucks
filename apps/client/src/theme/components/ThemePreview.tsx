// apps/client/src/theme/components/ThemePreview.tsx
import React from 'react';
import type { UnifiedTheme } from '../types';

interface ThemePreviewProps {
  theme: UnifiedTheme;
  isActive?: boolean;
  isPreview?: boolean;
  onClick?: () => void;
  onPreview?: () => void;
  onPreviewEnd?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable theme preview component showing theme colors and info
 */
export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  isActive = false,
  isPreview = false,
  onClick,
  onPreview,
  onPreviewEnd,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-20 p-2',
    md: 'h-32 p-4',
    lg: 'h-40 p-6',
  };

  const cardClasses = `
    relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden
    ${
      isActive
        ? 'border-primary shadow-lg scale-[1.02]'
        : isPreview
          ? 'border-secondary shadow-md scale-[1.01]'
          : 'border-muted hover:border-primary/50 hover:shadow-md'
    }
    ${className}
  `;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Theme Preview Canvas */}
      <div
        className={sizeClasses[size]}
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`,
        }}
      >
        {/* Sample UI Elements */}
        <div className="space-y-2">
          <div
            className="h-3 rounded"
            style={{
              backgroundColor: theme.colors.primary,
              width: size === 'sm' ? '70%' : '60%',
            }}
          />
          <div
            className="h-2 rounded"
            style={{
              backgroundColor: theme.colors.secondary,
              width: size === 'sm' ? '85%' : '80%',
            }}
          />
          <div
            className="h-2 rounded"
            style={{
              backgroundColor: theme.colors.muted,
              width: size === 'sm' ? '50%' : '40%',
            }}
          />
        </div>

        {/* Effect Indicators */}
        {size !== 'sm' && (
          <div className="absolute top-2 right-2 flex space-x-1">
            {theme.effects.animations && (
              <div
                className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                title="Animations enabled"
              />
            )}
            {theme.effects.glow && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Glow effects enabled" />
            )}
            {theme.effects.particles && (
              <div
                className="w-2 h-2 bg-purple-400 rounded-full"
                title="Particle effects enabled"
              />
            )}
          </div>
        )}
      </div>

      {/* Theme Info */}
      <div className="p-3 bg-surface/90" style={{ backgroundColor: `${theme.colors.surface}E6` }}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4
              className={`font-semibold flex items-center ${size === 'sm' ? 'text-sm' : ''}`}
              style={{ color: theme.colors.content }}
            >
              <span className="mr-2">{theme.preview}</span>
              <span className="truncate">{theme.name}</span>
            </h4>
            {size !== 'sm' && (
              <p className="text-sm truncate" style={{ color: theme.colors.tertiary }}>
                {theme.description}
              </p>
            )}
          </div>

          {isActive && (
            <div className="ml-2 px-2 py-1 bg-primary text-white text-xs rounded-full flex-shrink-0">
              Active
            </div>
          )}
        </div>

        {/* Color Palette */}
        <div className="flex space-x-1 mt-2">
          {Object.entries(theme.colors)
            .slice(0, size === 'sm' ? 4 : 6)
            .map(([key, color]) => (
              <div
                key={key}
                className={`rounded-full border ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`}
                style={{
                  backgroundColor: color,
                  borderColor: theme.colors.muted,
                }}
                title={key}
              />
            ))}
        </div>

        {/* Category Badge */}
        {size !== 'sm' && (
          <div className="mt-2">
            <span
              className="inline-block px-2 py-1 text-xs rounded-full"
              style={{
                backgroundColor: `${theme.colors.primary}20`,
                color: theme.colors.primary,
              }}
            >
              {theme.category}
            </span>
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {isActive && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
      )}

      {/* Preview Overlay */}
      {isPreview && !isActive && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
          <div className="px-3 py-1 bg-secondary text-white text-sm rounded-full">
            {size === 'sm' ? 'Preview' : 'Click to Apply'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemePreview;
