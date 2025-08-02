// apps/client/src/components/dashboard/analytics/QuickActions.tsx
import type { QuickAction } from '../../../hooks/useEnhancedUserStats';

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export default function QuickActions({ actions, className = '' }: QuickActionsProps) {
  const getButtonClasses = (variant: QuickAction['variant'], disabled?: boolean) => {
    const baseClasses =
      'flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    if (disabled) {
      return `${baseClasses} bg-muted text-tertiary`;
    }

    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:scale-105`;
      case 'success':
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-xl transform hover:scale-105`;
      case 'secondary':
      default:
        return `${baseClasses} bg-surface border border-muted text-content hover:border-primary/50 hover:bg-surface/80`;
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <h3 className="font-semibold text-content mb-3 flex items-center">⚡ Quick Actions</h3>

      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={action.disabled}
            className={getButtonClasses(action.variant, action.disabled)}
          >
            <span className="text-lg">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Achievement progress hint (if applicable) */}
      <div className="mt-4 pt-3 border-t border-muted">
        <div className="flex items-center text-xs text-tertiary">
          <span className="mr-2">💡</span>
          <span>Create predictions and place bets to unlock achievements</span>
        </div>
      </div>
    </div>
  );
}
