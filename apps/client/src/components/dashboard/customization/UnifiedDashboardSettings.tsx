// apps/client/src/components/dashboard/customization/UnifiedDashboardSettings.tsx
import { useState } from 'react';
import { AdvancedThemeSelector } from '../../../theme';
import { useAdvancedThemes } from '../../../theme/hooks/useUnifiedTheme';
import NotificationSettings from './NotificationSettings';
import PrivacySettings from './PrivacySettings';
import PerformanceSettings from './PerformanceSettings';

interface UnifiedDashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

type SettingsTab = 'themes' | 'notifications' | 'privacy' | 'performance';

/**
 * Unified dashboard settings that replaces the old DashboardSettings
 * Uses the new AdvancedThemeSelector instead of the conflicting ThemeSelector
 */
export default function UnifiedDashboardSettings({
  isOpen,
  onClose,
  className = '',
}: UnifiedDashboardSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('themes');
  const { updatePreferences, loading } = useAdvancedThemes();

  if (!isOpen) return null;

  const tabs = [
    { id: 'themes', label: 'Themes & Appearance', icon: '🎨' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
  ] as const;

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all dashboard settings to defaults?')) {
      // This will be handled by the individual components
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-surface border border-muted rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div>
            <h2 className="text-2xl font-bold text-content flex items-center">
              ⚙️ Dashboard Settings
            </h2>
            <p className="text-tertiary mt-1">
              Customize your experience with themes, notifications, and performance settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors p-2 rounded-lg hover:bg-background"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[70vh]">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-muted bg-background/50">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-colors
                    flex items-center space-x-3
                    ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-lg'
                        : 'hover:bg-muted text-content'
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Reset Button */}
            <div className="p-4 border-t border-muted mt-auto">
              <button
                onClick={handleReset}
                disabled={loading}
                className="
                  w-full px-4 py-2 text-sm rounded-lg border border-muted
                  hover:bg-error hover:text-white hover:border-error
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? 'Resetting...' : 'Reset All Settings'}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'themes' && (
                <div>
                  <AdvancedThemeSelector showEffectControls={true} allowCategorySwitch={true} />
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <NotificationSettings />
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <PrivacySettings />
                </div>
              )}

              {activeTab === 'performance' && (
                <div>
                  <PerformanceSettings />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-muted bg-background/30">
          <div className="text-xs text-tertiary">
            Settings are automatically saved and synced across devices
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-muted hover:bg-muted transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
