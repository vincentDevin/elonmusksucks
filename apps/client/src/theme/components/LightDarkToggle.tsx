// apps/client/src/theme/components/LightDarkToggle.tsx
import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useLightDark } from '../hooks/useUnifiedTheme';

interface LightDarkToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'switch';
}

/**
 * Simple light/dark mode toggle for NavBar and general use
 * Maps to the full unified theme system but provides simple interface
 */
export const LightDarkToggle: React.FC<LightDarkToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md',
  variant = 'icon',
}) => {
  const { theme, isDark, toggleTheme } = useLightDark();

  const sizeClasses = {
    sm: 'p-1 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg',
  };

  const iconSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  if (variant === 'switch') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm text-tertiary">Dark Mode</span>}
        <button
          onClick={toggleTheme}
          className={`relative rounded-full transition-colors ${
            isDark ? 'bg-primary' : 'bg-muted'
          } ${size === 'sm' ? 'w-10 h-6' : size === 'lg' ? 'w-14 h-8' : 'w-12 h-7'}`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-pressed={isDark}
        >
          <div
            className={`absolute top-1 rounded-full bg-white transition-transform ${
              size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
            } ${
              isDark
                ? size === 'sm'
                  ? 'translate-x-5'
                  : size === 'lg'
                    ? 'translate-x-7'
                    : 'translate-x-6'
                : 'translate-x-1'
            }`}
          >
            <div className="flex items-center justify-center h-full">
              {isDark ? (
                <FaMoon className={`${iconSizeClasses[size]} text-primary`} />
              ) : (
                <FaSun className={`${iconSizeClasses[size]} text-warning`} />
              )}
            </div>
          </div>
        </button>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          flex items-center space-x-2 ${sizeClasses[size]} 
          rounded-lg hover:bg-muted transition-colors
          border border-muted bg-surface text-content
          ${className}
        `}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-pressed={isDark}
        title={`Currently in ${theme} mode. Click to switch to ${isDark ? 'light' : 'dark'} mode.`}
      >
        {isDark ? (
          <FaSun className={iconSizeClasses[size]} />
        ) : (
          <FaMoon className={iconSizeClasses[size]} />
        )}
        {showLabel && (
          <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        )}
      </button>
    );
  }

  // Default: icon variant
  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center space-x-1 ${sizeClasses[size]}
        rounded hover:bg-muted transition-colors
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      title={`Currently in ${theme} mode. Click to switch.`}
    >
      <span className={iconSizeClasses[size]}>{isDark ? <FaSun /> : <FaMoon />}</span>
      {showLabel && (
        <span className="sr-only">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
      )}
    </button>
  );
};

export default LightDarkToggle;
