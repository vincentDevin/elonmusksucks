// apps/client/src/components/dashboard/customization/NotificationSettings.tsx
import { useDashboardCustomization } from '../../../hooks/useDashboardCustomization';

export default function NotificationSettings() {
  const { preferences, updateNotifications } = useDashboardCustomization();

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
        <h3 className="text-xl font-bold text-content mb-2">Notification Settings</h3>
        <p className="text-tertiary">
          Control what notifications you receive and how they are delivered
        </p>
      </div>

      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <h4 className="font-semibold text-content mb-4">Push Notifications</h4>
        <div className="space-y-2">
          <ToggleSwitch
            enabled={preferences.notifications.achievements}
            onChange={(value) => updateNotifications({ achievements: value })}
            label="Achievement Notifications"
            description="Get notified when you unlock new achievements"
          />
          <ToggleSwitch
            enabled={preferences.notifications.rankChanges}
            onChange={(value) => updateNotifications({ rankChanges: value })}
            label="Rank Changes"
            description="Notifications when your leaderboard position changes"
          />
          <ToggleSwitch
            enabled={preferences.notifications.friendActivity}
            onChange={(value) => updateNotifications({ friendActivity: value })}
            label="Friend Activity"
            description="Updates when friends place bets or create predictions"
          />
          <ToggleSwitch
            enabled={preferences.notifications.bigBets}
            onChange={(value) => updateNotifications({ bigBets: value })}
            label="Big Bet Alerts"
            description="Notifications for large bets across the platform"
          />
        </div>
      </div>

      <div className="bg-background/50 rounded-xl p-4 border border-muted">
        <h4 className="font-semibold text-content mb-4">Sound & Alerts</h4>
        <div className="space-y-2">
          <ToggleSwitch
            enabled={preferences.notifications.soundEnabled}
            onChange={(value) => updateNotifications({ soundEnabled: value })}
            label="Sound Notifications"
            description="Play sounds for important notifications"
          />
        </div>
      </div>
    </div>
  );
}
