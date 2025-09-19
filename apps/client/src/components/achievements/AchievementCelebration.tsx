import type { AchievementCelebration } from '../../hooks/useActivityStream';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';

interface AchievementCelebrationProps {
  celebration: AchievementCelebration;
  onDismiss: (id: string) => void;
}

export function AchievementCelebrationComponent({
  celebration,
  onDismiss,
}: AchievementCelebrationProps) {
  const { achievement, unlockedAt } = celebration;
  const celebrationId = `${achievement.id}-${unlockedAt}`;
  const { getRarityClasses, getCategoryIcon, utils } = useAchievementTheme();

  // Theme-aware rarity styling function
  const getRarityStyles = (rarity: string) => {
    if (!utils.isValidRarity(rarity)) {
      return getRarityClasses('common').celebration;
    }
    return getRarityClasses(rarity as AchievementRarity).celebration;
  };

  // Using theme-aware getCategoryIcon from hook

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl border-2 shadow-2xl transition-all duration-500 ease-out transform ${getRarityStyles(achievement.rarity)} backdrop-blur-sm animate-in slide-in-from-right-5 fade-in`}
    >
      {/* Close button */}
      <button
        onClick={() => onDismiss(celebrationId)}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted/80 transition-colors"
        aria-label="Dismiss celebration"
      >
        <svg className="w-4 h-4 text-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Achievement unlocked header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-2xl animate-bounce">🎉</div>
        <div className="text-sm font-bold text-content tracking-wide uppercase">
          Achievement Unlocked!
        </div>
      </div>

      {/* Achievement details */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {achievement.iconUrl ? (
            <img
              src={achievement.iconUrl}
              alt={achievement.name}
              className="w-12 h-12 rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-2xl border border-muted">
              {getCategoryIcon(achievement.category)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-content text-base leading-tight">{achievement.title}</h3>
            <span className="px-2 py-1 bg-surface/60 rounded-full text-xs font-bold text-content capitalize border border-muted">
              {achievement.rarity}
            </span>
          </div>

          <p className="text-content/80 text-sm leading-relaxed mb-2">{achievement.description}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-tertiary capitalize">{achievement.category}</span>
            <span className="text-tertiary">Just now</span>
          </div>
        </div>
      </div>

      {/* Animated progress bar (for visual flair) */}
      <div className="mt-3 h-1 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary/80 rounded-full transition-all duration-1000 ease-out"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
