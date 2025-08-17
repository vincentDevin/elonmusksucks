// apps/client/src/components/dashboard/customization/PerformanceSettings.tsx
import { useAdvancedThemes } from '../../../theme/hooks/useUnifiedTheme';

export default function PerformanceSettings() {
  const { preferences, updatePreferences } = useAdvancedThemes();

  const updatePerformance = (updates: any) => {
    updatePreferences({
      performance: { ...preferences.performance, ...updates },
    });
  };

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

      <div className="bg-yellow-50/10 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-semibold text-content mb-2 flex items-center">
          <span className="mr-2">⚡</span>
          Performance Tips
        </h4>
        <ul className="text-sm text-tertiary space-y-1">
          <li>• Enable reduced animations on slower devices</li>
          <li>• Use reduced data mode on mobile connections</li>
          <li>• Real-time updates use Socket.IO (no polling needed)</li>
          <li>• Close unused browser tabs for better performance</li>
        </ul>
      </div>
    </div>
  );
}
