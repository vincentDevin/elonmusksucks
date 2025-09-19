// EMERGENCY FIX: Temporarily disabled to stop useActivityStream memory leak
// TODO: Migrate to dedicated achievement celebration system
import { AchievementCelebrationComponent } from './AchievementCelebration';

export function AchievementCelebrationContainer() {
  // EMERGENCY: Disable celebration features to stop memory leak
  // This component was using useActivityStream which had 20+ socket listeners
  const activeCelebrations: any[] = [];
  const dismissCelebration = () => {};

  if (activeCelebrations.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
      {activeCelebrations.map((celebration, index) => (
        <div
          key={`${celebration.achievement.id}-${celebration.unlockedAt}`}
          className="pointer-events-auto"
          style={{
            animationDelay: `${index * 200}ms`,
            transform: `translateY(${index * 10}px)`,
          }}
        >
          <AchievementCelebrationComponent
            celebration={celebration}
            onDismiss={dismissCelebration}
          />
        </div>
      ))}
    </div>
  );
}
