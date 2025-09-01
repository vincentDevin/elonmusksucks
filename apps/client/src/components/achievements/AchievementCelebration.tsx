import type { AchievementCelebration } from '../../hooks/useActivityStream';

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

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400 shadow-yellow-400/20';
      case 'rare':
        return 'bg-gradient-to-br from-purple-400/20 to-pink-500/20 border-purple-400 shadow-purple-400/20';
      case 'uncommon':
        return 'bg-gradient-to-br from-blue-400/20 to-cyan-500/20 border-blue-400 shadow-blue-400/20';
      case 'secret':
        return 'bg-gradient-to-br from-gray-600/20 to-black/20 border-gray-400 shadow-gray-400/20';
      case 'shame':
        return 'bg-gradient-to-br from-red-400/20 to-red-600/20 border-red-400 shadow-red-400/20';
      default:
        return 'bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-green-400 shadow-green-400/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'betting':
        return '💰';
      case 'leaderboard':
        return '🏆';
      case 'pong':
        return '🏓';
      case 'prediction':
        return '📊';
      case 'chat':
        return '💬';
      case 'participation':
        return '🎯';
      case 'event':
        return '🎪';
      case 'secret':
        return '🔮';
      case 'shame':
        return '😱';
      default:
        return '🏅';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl border-2 shadow-2xl transition-all duration-500 ease-out transform ${getRarityStyles(achievement.rarity)} backdrop-blur-sm animate-in slide-in-from-right-5 fade-in`}
    >
      {/* Close button */}
      <button
        onClick={() => onDismiss(celebrationId)}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors"
        aria-label="Dismiss celebration"
      >
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="text-sm font-bold text-white tracking-wide uppercase">
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
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
              {getCategoryIcon(achievement.category)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-base leading-tight">{achievement.title}</h3>
            <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold text-white capitalize">
              {achievement.rarity}
            </span>
          </div>

          <p className="text-white/80 text-sm leading-relaxed mb-2">{achievement.description}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 capitalize">{achievement.category}</span>
            <span className="text-white/60">Just now</span>
          </div>
        </div>
      </div>

      {/* Animated progress bar (for visual flair) */}
      <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-1000 ease-out"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
