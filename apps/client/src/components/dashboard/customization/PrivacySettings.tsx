// apps/client/src/components/dashboard/customization/PrivacySettings.tsx
import { useAdvancedThemes } from '../../../theme/hooks/useUnifiedTheme';

export default function PrivacySettings() {
  const { preferences, updatePreferences } = useAdvancedThemes();

  const updatePrivacy = (updates: any) => {
    updatePreferences({
      privacy: { ...preferences.privacy, ...updates },
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
        <h3 className="text-xl font-bold text-content mb-2">Privacy Settings</h3>
        <p className="text-tertiary">Control what information is visible to other users</p>
      </div>

      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <h4 className="font-semibold text-content mb-4">Profile Visibility</h4>
        <div className="space-y-2">
          <ToggleSwitch
            enabled={preferences.privacy.showRealName}
            onChange={(value) => updatePrivacy({ showRealName: value })}
            label="Show Real Name"
            description="Display your real name instead of username"
          />
          <ToggleSwitch
            enabled={preferences.privacy.showStats}
            onChange={(value) => updatePrivacy({ showStats: value })}
            label="Show Statistics"
            description="Allow others to see your betting statistics"
          />
          <ToggleSwitch
            enabled={preferences.privacy.showActivity}
            onChange={(value) => updatePrivacy({ showActivity: value })}
            label="Show Activity"
            description="Display your recent betting activity to others"
          />
        </div>
      </div>

      <div className="bg-blue-50/10 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-content mb-2 flex items-center">
          <span className="mr-2">🔒</span>
          Privacy Information
        </h4>
        <p className="text-sm text-tertiary">
          Your privacy settings control how your information appears to other users. These settings
          do not affect your ability to use platform features.
        </p>
      </div>
    </div>
  );
}
