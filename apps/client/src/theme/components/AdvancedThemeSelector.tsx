// apps/client/src/theme/components/AdvancedThemeSelector.tsx
import React, { useState } from 'react';
import { useAdvancedThemes } from '../hooks/useUnifiedTheme';
import { themeCategories } from '../themes';
import type { ThemeCategory, UnifiedTheme } from '../types';

interface AdvancedThemeSelectorProps {
  className?: string;
  showEffectControls?: boolean;
  allowCategorySwitch?: boolean;
}

/**
 * Advanced theme selector with category filtering and theme previews
 * Used in Dashboard settings for power users
 */
export const AdvancedThemeSelector: React.FC<AdvancedThemeSelectorProps> = ({
  className = '',
  showEffectControls = true,
  allowCategorySwitch = true,
}) => {
  const {
    currentTheme,
    availableThemes,
    getThemesByCategory,
    setTheme,
    preferences,
    updatePreferences,
  } = useAdvancedThemes();

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>(currentTheme.category);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  // Get themes for selected category
  const categoryThemes = getThemesByCategory(selectedCategory);

  const handleThemePreview = (themeId: string) => {
    setPreviewTheme(themeId);
    // Apply preview styles temporarily
    const theme = availableThemes.find((t) => t.id === themeId);
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--preview-color-${key}`, value);
      });
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    clearPreview();
  };

  const clearPreview = () => {
    setPreviewTheme(null);
    const root = document.documentElement;
    // Clear preview styles
    Object.keys(currentTheme.colors).forEach((key) => {
      root.style.removeProperty(`--preview-color-${key}`);
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-content mb-2">Choose Your Theme</h3>
        <p className="text-tertiary">Select a theme that matches your style and preferences</p>
      </div>

      {/* Current Theme Info */}
      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">{currentTheme.preview}</div>
            <div>
              <h4 className="font-semibold text-content">{currentTheme.name}</h4>
              <p className="text-sm text-tertiary">{currentTheme.description}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  {currentTheme.category}
                </span>
                {currentTheme.effects.animations && (
                  <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">
                    Animations
                  </span>
                )}
                {currentTheme.effects.glow && (
                  <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                    Glow Effects
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="px-3 py-1 bg-success/10 text-success text-sm rounded-full font-medium">
            Current
          </div>
        </div>
      </div>

      {/* Category Selector */}
      {allowCategorySwitch && (
        <div className="space-y-3">
          <h4 className="font-semibold text-content">Theme Category</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {themeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedCategory === category.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-xs text-tertiary">{category.count} themes</span>
                </div>
                <h5 className="font-medium text-content">{category.name}</h5>
                <p className="text-xs text-tertiary mt-1">{category.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme Grid */}
      <div className="space-y-3">
        <h4 className="font-semibold text-content">
          {themeCategories.find((c) => c.id === selectedCategory)?.name || 'Themes'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryThemes.map((theme) => (
            <div
              key={theme.id}
              className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                currentTheme.id === theme.id
                  ? 'border-primary shadow-lg scale-[1.02]'
                  : previewTheme === theme.id
                    ? 'border-secondary shadow-md scale-[1.01]'
                    : 'border-muted hover:border-primary/50 hover:shadow-md'
              }`}
              onMouseEnter={() => handleThemePreview(theme.id)}
              onMouseLeave={clearPreview}
              onClick={() => handleThemeSelect(theme.id)}
            >
              {/* Theme Preview */}
              <div
                className="h-32 p-4 relative"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`,
                }}
              >
                <div className="space-y-2">
                  <div
                    className="h-3 rounded"
                    style={{ backgroundColor: theme.colors.primary, width: '60%' }}
                  />
                  <div
                    className="h-2 rounded"
                    style={{ backgroundColor: theme.colors.secondary, width: '80%' }}
                  />
                  <div
                    className="h-2 rounded"
                    style={{ backgroundColor: theme.colors.muted, width: '40%' }}
                  />
                </div>

                {/* Effect Indicators */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  {theme.effects.animations && (
                    <div
                      className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                      title="Animations"
                    />
                  )}
                  {theme.effects.glow && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Glow Effects" />
                  )}
                  {theme.effects.particles && (
                    <div className="w-2 h-2 bg-purple-400 rounded-full" title="Particle Effects" />
                  )}
                </div>
              </div>

              {/* Theme Info */}
              <div
                className="p-4 bg-surface/80"
                style={{ backgroundColor: `${theme.colors.surface}CC` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4
                      className="font-semibold flex items-center"
                      style={{ color: theme.colors.content }}
                    >
                      <span className="mr-2">{theme.preview}</span>
                      {theme.name}
                    </h4>
                    <p className="text-sm" style={{ color: theme.colors.tertiary }}>
                      {theme.description}
                    </p>
                  </div>

                  {currentTheme.id === theme.id && (
                    <div className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                      Active
                    </div>
                  )}
                </div>

                {/* Color Palette */}
                <div className="flex space-x-1 mt-3">
                  {Object.entries(theme.colors)
                    .slice(0, 5)
                    .map(([key, color]) => (
                      <div
                        key={key}
                        className="w-4 h-4 rounded-full border border-muted"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                </div>
              </div>

              {/* Selection Indicator */}
              {currentTheme.id === theme.id && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              )}

              {/* Preview Indicator */}
              {previewTheme === theme.id && currentTheme.id !== theme.id && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="px-3 py-1 bg-secondary text-white text-sm rounded-full">
                    Click to Apply
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Theme Effects Controls */}
      {showEffectControls && (
        <div className="bg-background/50 rounded-xl p-4 border border-muted">
          <h4 className="font-semibold text-content mb-3">Performance & Effects</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-content">Reduced Animations</span>
                <p className="text-xs text-tertiary">Disable animations for better performance</p>
              </div>
              <button
                onClick={() =>
                  updatePreferences({
                    performance: {
                      ...preferences.performance,
                      reducedAnimations: !preferences.performance.reducedAnimations,
                    },
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.performance.reducedAnimations ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences.performance.reducedAnimations ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Preview Mode */}
      {previewTheme && (
        <div className="fixed bottom-4 right-4 bg-surface border border-muted rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-content">
              Previewing:{' '}
              <strong>{availableThemes.find((t) => t.id === previewTheme)?.name}</strong>
            </span>
            <button
              onClick={() => handleThemeSelect(previewTheme)}
              className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={clearPreview}
              className="px-3 py-1 bg-muted text-content text-sm rounded hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedThemeSelector;
