// apps/client/src/components/dashboard/customization/DashboardSettings.tsx
import { useState } from 'react';
import { useDashboardCustomization } from '../../../hooks/useDashboardCustomization';
import ThemeSelector from './ThemeSelector';
import LayoutSelector from './LayoutSelector';
import NotificationSettings from './NotificationSettings';
import PrivacySettings from './PrivacySettings';
import PerformanceSettings from './PerformanceSettings';

interface DashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

type SettingsTab = 'themes' | 'layout' | 'notifications' | 'privacy' | 'performance';

export default function DashboardSettings({
  isOpen,
  onClose,
  className = '',
}: DashboardSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('themes');
  const { resetToDefaults, loading } = useDashboardCustomization();

  if (!isOpen) return null;

  const tabs = [
    { id: 'themes', label: 'Themes', icon: '🎨' },
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
  ] as const;

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all dashboard settings to defaults?')) {
      resetToDefaults();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-surface border border-muted rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div>
            <h2 className="text-2xl font-bold text-content flex items-center">
              <span className="mr-3">⚙️</span>
              Dashboard Settings
            </h2>
            <p className="text-sm text-tertiary mt-1">Customize your dashboard experience</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm"
              disabled={loading}
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <span className="text-xl text-tertiary">✕</span>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-muted bg-background/50">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id ? 'bg-primary text-white' : 'text-content hover:bg-surface'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="p-4 border-t border-muted mt-4">
              <h4 className="font-medium text-content mb-3 text-sm">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full text-left text-sm text-tertiary hover:text-content transition-colors">
                  📤 Export Settings
                </button>
                <button className="w-full text-left text-sm text-tertiary hover:text-content transition-colors">
                  📥 Import Settings
                </button>
                <button className="w-full text-left text-sm text-tertiary hover:text-content transition-colors">
                  📋 Copy Settings URL
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'themes' && <ThemeSelector />}
              {activeTab === 'layout' && <LayoutSelector />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'privacy' && <PrivacySettings />}
              {activeTab === 'performance' && <PerformanceSettings />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-muted bg-background/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-tertiary">
              Settings are automatically saved to your browser
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
