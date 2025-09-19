// apps/client/src/components/dashboard/SmartInsightsPanel.tsx
import { memo } from 'react';
import { useUserStats } from '../../hooks/useUserStats';
import SmartInsights from './analytics/SmartInsights';

const SmartInsightsPanel = memo(function SmartInsightsPanel() {
  const { smartInsights, loading, error } = useUserStats();

  if (loading) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !smartInsights) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <div className="text-center py-4">
          <p className="text-red-500">{error || 'Failed to load insights'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-muted rounded-2xl p-6">
      <SmartInsights insights={smartInsights} />
    </div>
  );
});

export default SmartInsightsPanel;
