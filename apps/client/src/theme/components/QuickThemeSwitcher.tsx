// apps/client/src/theme/components/QuickThemeSwitcher.tsx
import React, { useState } from 'react';
import { FaPalette, FaTimes } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { useUnifiedTheme } from '../hooks/useUnifiedTheme';
import { themeCategories } from '../themes';
import type { ThemeCategory } from '../types';

interface QuickThemeSwitcherProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  hideOnMobile?: boolean;
}

/**
 * Floating quick theme switcher for easy access from any page
 * Provides both category switching and recent themes
 */
export const QuickThemeSwitcher: React.FC<QuickThemeSwitcherProps> = ({
  className = '',
  position = 'bottom-right',
  hideOnMobile = true,
}) => {
  const location = useLocation();
  const { currentTheme, getThemesByCategory, setTheme, toggleLightDark, loading } =
    useUnifiedTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>(currentTheme.category);

  // Detect if we're on the dashboard to adjust positioning
  const isOnDashboard = location.pathname === '/dashboard';

  // Adjust position based on dashboard context
  const getPositionClasses = () => {
    if (isOnDashboard && position === 'bottom-right') {
      // Position as part of the dashboard FAB group
      // Calculated: bottom-8 (32px) + Create Prediction button (48px) + space-y-3 (12px) + Quick Bet button (56px) + space-y-3 (12px) = 160px
      return 'bottom-[160px] right-8';
    }
    return {
      'bottom-right': 'bottom-2 right-4',
      'bottom-left': 'bottom-2 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    }[position];
  };

  const getPanelPositionClasses = () => {
    if (isOnDashboard && position === 'bottom-right') {
      return 'bottom-16 right-0';
    }
    return {
      'bottom-right': 'bottom-16 right-0',
      'bottom-left': 'bottom-16 left-0',
      'top-right': 'top-16 right-0',
      'top-left': 'top-16 left-0',
    }[position];
  };

  if (loading) return null;

  const categoryThemes = getThemesByCategory(activeCategory);

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} ${hideOnMobile ? 'hidden sm:block' : ''} ${className}`}
    >
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${isOnDashboard ? 'w-12 h-12' : 'w-12 h-12'} rounded-full transition-all duration-200
          flex items-center justify-center backdrop-blur-sm
          ${
            isOpen
              ? 'bg-primary text-white rotate-180'
              : isOnDashboard
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-surface text-content hover:bg-muted'
          }
          border-2 ${isOpen ? 'border-primary/60' : 'border-primary/40'}
          hover:scale-110
        `}
        style={{
          boxShadow:
            '0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Quick theme switcher"
        title="Change theme"
      >
        {isOpen ? <FaTimes /> : <FaPalette />}
      </button>

      {/* Theme Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
            absolute ${getPanelPositionClasses()}
            bg-surface border-2 border-primary/40 rounded-xl backdrop-blur-sm
            p-4 w-80 max-h-96 overflow-y-auto
            transform transition-all duration-300
            ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
          `}
            style={{
              boxShadow:
                '0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 10px 25px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-content">Quick Theme Switch</h3>
                <p className="text-xs text-tertiary">Current: {currentTheme.name}</p>
              </div>
              <button
                onClick={toggleLightDark}
                className="p-2 rounded-lg hover:bg-background transition-colors text-tertiary hover:text-content"
                title="Toggle light/dark mode"
              >
                🌓
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex space-x-1 mb-4 bg-background rounded-lg p-1">
              {themeCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`
                    flex-1 px-2 py-1 rounded text-xs font-medium transition-colors
                    ${
                      activeCategory === category.id
                        ? 'bg-primary text-white'
                        : 'text-tertiary hover:text-content'
                    }
                  `}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Theme Options */}
            <div className="space-y-2">
              {categoryThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full p-3 rounded-lg border transition-all text-left
                    ${
                      currentTheme.id === theme.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50 hover:bg-background'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{theme.preview}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-content truncate">{theme.name}</h4>
                        {currentTheme.id === theme.id && (
                          <span className="text-xs text-primary">●</span>
                        )}
                      </div>
                      <p className="text-xs text-tertiary truncate">{theme.description}</p>
                    </div>
                  </div>

                  {/* Mini Color Palette */}
                  <div className="flex space-x-1 mt-2 ml-8">
                    {Object.entries(theme.colors)
                      .slice(0, 4)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: color, borderColor: theme.colors.muted }}
                        />
                      ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t border-muted">
              <div className="flex justify-between text-xs">
                <button
                  onClick={toggleLightDark}
                  className="text-tertiary hover:text-content transition-colors"
                >
                  Toggle Light/Dark
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-tertiary hover:text-content transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuickThemeSwitcher;
