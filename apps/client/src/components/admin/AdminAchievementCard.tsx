import { memo, useState } from 'react';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';
import type { AchievementWithStats } from '../../api/admin';

interface AdminAchievementCardProps {
  achievement: AchievementWithStats;
  isSelected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onViewDetails: (id: number) => void;
  onEdit: (achievement: AchievementWithStats) => void;
  onDelete: (id: number) => void;
}

const AdminAchievementCard = memo(function AdminAchievementCard({
  achievement,
  isSelected,
  onSelect,
  onViewDetails,
  onEdit,
  onDelete,
}: AdminAchievementCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { getRarityClasses, getCardClasses, utils } = useAchievementTheme();

  const rarity = achievement.rarity as AchievementRarity;
  const rarityClasses = utils.isValidRarity(rarity)
    ? getRarityClasses(rarity)
    : getRarityClasses('common');
  const cardClasses = utils.isValidRarity(rarity)
    ? getCardClasses(rarity, achievement.category)
    : getCardClasses('common', achievement.category);

  // Calculate completion percentage
  const completionPercentage =
    achievement.totalUsers > 0
      ? ((achievement.completedUsers / achievement.totalUsers) * 100).toFixed(1)
      : '0.0';

  // Determine status color for completion rate
  const getCompletionColor = (rate: number) => {
    if (rate >= 75) return 'text-success';
    if (rate >= 50) return 'text-warning';
    if (rate >= 25) return 'text-info';
    return 'text-tertiary';
  };

  return (
    <div
      className={`group relative overflow-hidden transition-all duration-300 ${
        cardClasses.container
      } ${
        isSelected
          ? 'ring-2 ring-primary shadow-lg transform scale-[1.02]'
          : 'hover:shadow-xl hover:scale-[1.01]'
      } ${rarityClasses.cardHover}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient effect for hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
      )}

      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(achievement.id, e.target.checked)}
          className="w-4 h-4 rounded border-2 border-muted bg-surface text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer"
        />
      </div>

      <div className="relative p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0 ml-6">
            {/* Category Icon */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                rarityClasses.card
              } shadow-md ring-2 ${rarityClasses.leftBorder} flex-shrink-0`}
            >
              {cardClasses.categoryIcon}
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-content text-base mb-1 truncate">{achievement.name}</h4>
              <p className="text-sm text-tertiary line-clamp-2">
                {achievement.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Rarity Badge */}
          <span
            className={`${cardClasses.badge} uppercase tracking-wide text-xs font-bold shadow-sm flex-shrink-0`}
          >
            {rarity}
          </span>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Total Users */}
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <div className="text-lg font-bold text-content">{achievement.totalUsers}</div>
            <div className="text-xs text-tertiary">Total Users</div>
          </div>

          {/* Completed Users */}
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <div className="text-lg font-bold text-success">{achievement.completedUsers}</div>
            <div className="text-xs text-tertiary">Completed</div>
          </div>

          {/* Completion Rate */}
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <div className={`text-lg font-bold ${getCompletionColor(achievement.completionRate)}`}>
              {completionPercentage}%
            </div>
            <div className="text-xs text-tertiary">Rate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className={`${rarityClasses.progress} rounded-full h-2 shadow-sm`}
              style={{ width: `${Math.min(achievement.completionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Category Badge */}
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium capitalize border ${
                cardClasses.categoryAccent || 'text-content/70'
              } bg-muted/50`}
            >
              {achievement.category}
            </span>

            {/* Target Value */}
            <span className="text-xs text-tertiary">
              Target: <span className="font-medium text-content">{achievement.targetValue}</span>
            </span>
          </div>

          {/* Created Date */}
          <span className="text-xs text-tertiary">
            {new Date(achievement.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(achievement.id)}
            className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            Details
          </button>
          <button
            onClick={() => onEdit(achievement)}
            className="flex-1 px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(achievement.id)}
            className="px-3 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors text-sm font-medium"
          >
            Delete
          </button>
        </div>

        {/* Icon URL indicator */}
        {achievement.iconUrl && (
          <div className="absolute top-3 right-3">
            <img
              src={achievement.iconUrl}
              alt={achievement.name}
              className="w-8 h-8 rounded-lg shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Selection Indicator Overlay */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        </div>
      )}
    </div>
  );
});

export default AdminAchievementCard;
