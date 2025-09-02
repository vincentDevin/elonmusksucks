// apps/client/src/components/dashboard/AchievementProgressPanel.tsx
import { memo } from 'react';
import AchievementProgress from './analytics/AchievementProgress';

const AchievementProgressPanel = memo(function AchievementProgressPanel() {
  return (
    <div className="bg-surface border border-muted rounded-2xl p-6">
      <AchievementProgress />
    </div>
  );
});

export default AchievementProgressPanel;
