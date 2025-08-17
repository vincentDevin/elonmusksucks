// apps/client/src/theme/components/MigrationStatus.tsx
import React from 'react';
import { useUnifiedTheme } from '../hooks/useUnifiedTheme';

/**
 * Migration status component to verify the unified theme system is working
 */
export const MigrationStatus: React.FC = () => {
  const { currentTheme, loading, error } = useUnifiedTheme();

  const checks = [
    {
      name: 'UnifiedThemeProvider Active',
      status: !loading && !error ? 'pass' : 'fail',
      message: loading ? 'Loading...' : error || 'Theme system is active',
    },
    {
      name: 'Current Theme Loaded',
      status: currentTheme ? 'pass' : 'fail',
      message: currentTheme ? `${currentTheme.name} (${currentTheme.id})` : 'No theme loaded',
    },
    {
      name: 'CSS Variables Applied',
      status: getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
        ? 'pass'
        : 'fail',
      message:
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary') ||
        'No CSS variables found',
    },
    {
      name: 'Theme Persistence',
      status: localStorage.getItem('theme') ? 'pass' : 'warning',
      message: localStorage.getItem('theme') || 'No theme stored (will use default)',
    },
    {
      name: 'Old Theme Context Removed',
      status: !document.querySelector('.theme-provider-legacy') ? 'pass' : 'warning',
      message: !document.querySelector('.theme-provider-legacy')
        ? 'Old context removed'
        : 'Old theme context still present',
    },
  ];

  return (
    <div className="bg-surface border border-muted rounded-xl p-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-3xl">🎨</span>
        <div>
          <h2 className="text-2xl font-bold text-content">Migration Status</h2>
          <p className="text-tertiary">Unified Theme System Health Check</p>
        </div>
      </div>

      <div className="space-y-4">
        {checks.map((check, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-background rounded-lg border border-muted"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">
                {check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
              </span>
              <div>
                <h4 className="font-medium text-content">{check.name}</h4>
                <p className="text-sm text-tertiary">{check.message}</p>
              </div>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                check.status === 'pass'
                  ? 'bg-success/10 text-success'
                  : check.status === 'warning'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-error/10 text-error'
              }`}
            >
              {check.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Current Theme Info */}
      {currentTheme && (
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-content mb-2">Current Theme Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-tertiary">Theme:</span>
              <span className="ml-2 text-content font-medium">{currentTheme.name}</span>
            </div>
            <div>
              <span className="text-tertiary">Category:</span>
              <span className="ml-2 text-content font-medium">{currentTheme.category}</span>
            </div>
            <div>
              <span className="text-tertiary">Effects:</span>
              <div className="ml-2 flex space-x-2">
                {currentTheme.effects.animations && (
                  <span className="px-1 py-0.5 bg-secondary/10 text-secondary text-xs rounded">
                    Animations
                  </span>
                )}
                {currentTheme.effects.glow && (
                  <span className="px-1 py-0.5 bg-accent/10 text-accent text-xs rounded">Glow</span>
                )}
                {currentTheme.effects.particles && (
                  <span className="px-1 py-0.5 bg-info/10 text-info text-xs rounded">
                    Particles
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-tertiary">ID:</span>
              <span className="ml-2 text-content font-mono text-xs">{currentTheme.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
        <button
          onClick={() => localStorage.clear()}
          className="px-4 py-2 border border-muted text-content rounded-lg hover:bg-muted transition-colors"
        >
          Clear Storage
        </button>
      </div>
    </div>
  );
};

export default MigrationStatus;
