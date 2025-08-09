// apps/client/src/theme/components/ThemeDemo.tsx
import React from 'react';
import { LightDarkToggle } from './LightDarkToggle';
import { AdvancedThemeSelector } from './AdvancedThemeSelector';
import { QuickThemeSwitcher } from './QuickThemeSwitcher';
import { useUnifiedTheme, useThemeVariables } from '../hooks/useUnifiedTheme';

/**
 * Demo component showcasing all theme system features
 * Useful for testing and documentation
 */
export const ThemeDemo: React.FC = () => {
  const { currentTheme } = useUnifiedTheme();
  const { colors } = useThemeVariables();

  return (
    <div className="min-h-screen bg-background text-content p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-content">🎨 Unified Theme System Demo</h1>
        <p className="text-lg text-tertiary max-w-2xl mx-auto">
          Showcase of the new unified theme system with {currentTheme.name} theme. Test different
          components and see how they adapt to theme changes.
        </p>
      </div>

      {/* Current Theme Info */}
      <div className="bg-surface border border-muted rounded-xl p-6">
        <div className="flex items-center space-x-4 mb-4">
          <span className="text-4xl">{currentTheme.preview}</span>
          <div>
            <h2 className="text-2xl font-bold text-content">{currentTheme.name}</h2>
            <p className="text-tertiary">{currentTheme.description}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                {currentTheme.category}
              </span>
              {currentTheme.effects.animations && (
                <span className="px-2 py-1 bg-secondary/10 text-secondary text-sm rounded-full">
                  Animations
                </span>
              )}
              {currentTheme.effects.glow && (
                <span className="px-2 py-1 bg-accent/10 text-accent text-sm rounded-full">
                  Glow Effects
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(colors).map(([name, color]) => (
            <div key={name} className="space-y-2">
              <div
                className="w-full h-16 rounded-lg border border-muted"
                style={{ backgroundColor: color }}
              />
              <div className="text-center">
                <div className="font-medium text-content text-sm">{name}</div>
                <div className="text-xs text-tertiary font-mono">{color}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Component Showcase */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Theme Toggles */}
        <div className="bg-surface border border-muted rounded-xl p-6">
          <h3 className="text-xl font-bold text-content mb-4">Theme Controls</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-content mb-2">Light/Dark Toggle Variants</h4>
              <div className="flex items-center space-x-4">
                <LightDarkToggle variant="icon" size="sm" />
                <LightDarkToggle variant="icon" size="md" />
                <LightDarkToggle variant="button" size="md" showLabel />
                <LightDarkToggle variant="switch" size="md" showLabel />
              </div>
            </div>
          </div>
        </div>

        {/* Sample UI Elements */}
        <div className="bg-surface border border-muted rounded-xl p-6">
          <h3 className="text-xl font-bold text-content mb-4">UI Elements</h3>
          <div className="space-y-4">
            {/* Buttons */}
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                Primary
              </button>
              <button className="px-4 py-2 bg-secondary text-white rounded-lg hover:opacity-90 transition-opacity">
                Secondary
              </button>
              <button className="px-4 py-2 border border-muted text-content rounded-lg hover:bg-muted transition-colors">
                Outlined
              </button>
            </div>

            {/* Status Colors */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-success/10 text-success rounded-lg text-sm">
                ✓ Success message
              </div>
              <div className="px-3 py-2 bg-warning/10 text-warning rounded-lg text-sm">
                ⚠ Warning message
              </div>
              <div className="px-3 py-2 bg-error/10 text-error rounded-lg text-sm">
                ✗ Error message
              </div>
              <div className="px-3 py-2 bg-info/10 text-info rounded-lg text-sm">
                ℹ Info message
              </div>
            </div>

            {/* Form Elements */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Input field"
                className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:border-primary focus:outline-none"
              />
              <select className="w-full px-3 py-2 border border-muted rounded-lg bg-background text-content focus:border-primary focus:outline-none">
                <option>Select option</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Theme Selector */}
      <div className="bg-surface border border-muted rounded-xl p-6">
        <h3 className="text-xl font-bold text-content mb-4">Advanced Theme Selection</h3>
        <AdvancedThemeSelector showEffectControls={true} allowCategorySwitch={true} />
      </div>

      {/* Quick Theme Switcher */}
      <QuickThemeSwitcher position="bottom-right" hideOnMobile={false} />

      {/* Footer */}
      <div className="text-center py-8 border-t border-muted">
        <p className="text-tertiary">
          🎨 Unified Theme System • Built with React + TypeScript + CSS Variables
        </p>
        <p className="text-sm text-tertiary mt-2">
          Theme changes are automatically saved and synced across devices
        </p>
      </div>
    </div>
  );
};

export default ThemeDemo;
