import { useActivityStream } from '../../hooks/useActivityStream';
import { AchievementCelebrationComponent } from './AchievementCelebration';

export function AchievementCelebrationContainer() {
  const { activeCelebrations, dismissCelebration } = useActivityStream();

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
