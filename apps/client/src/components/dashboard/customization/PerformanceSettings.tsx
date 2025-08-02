// apps/client/src/components/dashboard/customization/PerformanceSettings.tsx
import { useDashboardCustomization } from '../../../hooks/useDashboardCustomization';

export default function PerformanceSettings() {
  const { preferences, updatePerformance } = useDashboardCustomization();

  const ToggleSwitch = ({
    enabled,
    onChange,
    label,
    description,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-content font-medium">{label}</span>
        <p className="text-xs text-tertiary">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-content mb-2">Performance Settings</h3>
        <p className="text-tertiary">
          Optimize dashboard performance for your device and connection
        </p>
      </div>

      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <h4 className="font-semibold text-content mb-4">Visual Performance</h4>
        <div className="space-y-2">
          <ToggleSwitch
            enabled={preferences.performance.reducedAnimations}
            onChange={(value) => updatePerformance({ reducedAnimations: value })}
            label="Reduced Animations"
            description="Disable animations for better performance"
          />
          <ToggleSwitch
            enabled={preferences.performance.reducedData}
            onChange={(value) => updatePerformance({ reducedData: value })}
            label="Reduced Data Usage"
            description="Load fewer items and images to save bandwidth"
          />
        </div>
      </div>

      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <h4 className="font-semibold text-content mb-4">Auto-Refresh</h4>
        <div className="space-y-4">
          <ToggleSwitch
            enabled={preferences.performance.autoRefresh}
            onChange={(value) => updatePerformance({ autoRefresh: value })}
            label="Auto-Refresh Data"
            description="Automatically refresh dashboard data"
          />

          {preferences.performance.autoRefresh && (
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Refresh Interval: {preferences.performance.refreshInterval}s
              </label>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={preferences.performance.refreshInterval}
                onChange={(e) => updatePerformance({ refreshInterval: parseInt(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-tertiary mt-1">
                <span>10s (Fast)</span>
                <span>300s (Battery Saving)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50/10 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-semibold text-content mb-2 flex items-center">
          <span className="mr-2">⚡</span>
          Performance Tips
        </h4>
        <ul className="text-sm text-tertiary space-y-1">
          <li>• Enable reduced animations on slower devices</li>
          <li>• Use reduced data mode on mobile connections</li>
          <li>• Increase refresh interval to save battery life</li>
          <li>• Close unused browser tabs for better performance</li>
        </ul>
      </div>
    </div>
  );
}
