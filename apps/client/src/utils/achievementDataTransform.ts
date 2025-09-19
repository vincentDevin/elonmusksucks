// apps/client/src/utils/achievementDataTransform.ts

/**
 * Data transformation utilities for achievement components
 *
 * These utilities transform the API response (UserAchievementProgressView)
 * to the format expected by achievement display components.
 */

// API Response type (from backend UserAchievementProgressView)
export interface ApiAchievementData {
  id: number; // Numeric achievement ID
  name: string; // Achievement name/slug
  title: string; // Display title
  description: string; // Achievement description
  category: string; // Category (betting, pong, etc.)
  targetValue: number; // Target value to complete
  currentValue: number; // Current progress value (integer)
  progress: number; // Completion rate (0-1 decimal)
  isCompleted: boolean; // Completion status
  completedAt: string | null; // Completion date (ISO string)
  iconUrl?: string | null; // Achievement icon URL
  rarity: string; // Rarity level (always present)
}

// Component-expected interface (harmonized from existing components)
export interface ComponentAchievement {
  id: string; // String ID for component compatibility
  achievementId: number; // Numeric ID for API calls
  name: string; // Achievement name/slug
  title: string; // Display title
  description: string; // Achievement description
  category: string; // Category
  rarity: string; // Rarity (guaranteed present)
  progress: number; // Current progress value (integer)
  targetValue: number; // Target value to complete
  isCompleted: boolean; // Completion status
  completedAt?: string; // Completion date (ISO string)
  iconUrl?: string | null; // Achievement icon URL
}

// Recent achievement interface (for recent achievements endpoint)
export interface ComponentRecentAchievement {
  id: string; // String ID for consistency
  name: string; // Achievement name/slug
  title: string; // Display title
  description: string; // Achievement description
  category: string; // Category
  rarity: string; // Rarity level
  iconUrl?: string | null; // Achievement icon URL
  completedAt: string; // Completion date (ISO string, required for recent)
}

/**
 * Transform API achievement data to component-expected format
 */
export function transformAchievementData(apiData: ApiAchievementData): ComponentAchievement {
  return {
    // ID handling: Convert numeric to string, keep numeric for API calls
    id: apiData.id.toString(),
    achievementId: apiData.id,

    // Basic fields (direct mapping)
    name: apiData.name,
    title: apiData.title,
    description: apiData.description,
    category: apiData.category,
    rarity: apiData.rarity,

    // Progress handling: Use currentValue as the progress integer
    // This matches how components expect to use progress in calculations
    // Note: API returns both currentValue (raw) and progress (calculated ratio)
    // Components expect progress to be the raw current value
    progress: apiData.currentValue,
    targetValue: apiData.targetValue,

    // Completion status
    isCompleted: apiData.isCompleted,
    completedAt: apiData.completedAt || undefined,

    // Optional fields
    iconUrl: apiData.iconUrl,
  };
}

/**
 * Transform array of API achievement data
 */
export function transformAchievementArray(
  apiDataArray: ApiAchievementData[],
): ComponentAchievement[] {
  return apiDataArray.map(transformAchievementData);
}

/**
 * Transform API data to recent achievement format
 * Note: This is for when we implement the recent achievements endpoint
 */
export function transformRecentAchievementData(
  apiData: ApiAchievementData,
): ComponentRecentAchievement {
  if (!apiData.isCompleted || !apiData.completedAt) {
    throw new Error('Recent achievement must be completed with completedAt date');
  }

  return {
    id: apiData.id.toString(),
    name: apiData.name,
    title: apiData.title,
    description: apiData.description,
    category: apiData.category,
    rarity: apiData.rarity,
    iconUrl: apiData.iconUrl,
    completedAt: apiData.completedAt,
  };
}

/**
 * Calculate progress percentage for display (0-100)
 * Handles both the old decimal format and new integer format
 */
export function calculateProgressPercentage(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) return 0;
  return Math.min((currentValue / targetValue) * 100, 100);
}

/**
 * Get progress decimal (0-1) for compatibility with existing calculations
 */
export function getProgressDecimal(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) return 0;
  return Math.min(currentValue / targetValue, 1);
}

/**
 * Determine achievement status for filtering
 */
export function getAchievementStatus(
  achievement: ComponentAchievement,
): 'completed' | 'in-progress' | 'locked' {
  if (achievement.isCompleted) return 'completed';
  if (achievement.progress > 0) return 'in-progress';
  return 'locked';
}

/**
 * Sort achievements by rarity (for display ordering)
 */
export function sortByRarity(a: ComponentAchievement, b: ComponentAchievement): number {
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret', 'shame'];
  const aIndex = rarityOrder.indexOf(a.rarity.toLowerCase());
  const bIndex = rarityOrder.indexOf(b.rarity.toLowerCase());

  // Unknown rarities go to the end
  const aRarityIndex = aIndex === -1 ? 999 : aIndex;
  const bRarityIndex = bIndex === -1 ? 999 : bIndex;

  return aRarityIndex - bRarityIndex;
}

/**
 * Filter achievements by status
 */
export function filterAchievementsByStatus(
  achievements: ComponentAchievement[],
  statuses: ('completed' | 'in-progress' | 'locked')[],
): ComponentAchievement[] {
  return achievements.filter((achievement) => statuses.includes(getAchievementStatus(achievement)));
}

/**
 * Search achievements by text query
 */
export function searchAchievements(
  achievements: ComponentAchievement[],
  query: string,
): ComponentAchievement[] {
  if (!query.trim()) return achievements;

  const lowerQuery = query.toLowerCase();
  return achievements.filter((achievement) => {
    const searchableText = [
      achievement.title,
      achievement.name,
      achievement.description,
      achievement.category,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

/**
 * Get achievement statistics for display
 */
export function calculateAchievementStats(achievements: ComponentAchievement[]) {
  const total = achievements.length;
  const completed = achievements.filter((a) => a.isCompleted).length;
  const inProgress = achievements.filter((a) => !a.isCompleted && a.progress > 0).length;
  const locked = achievements.filter((a) => !a.isCompleted && a.progress === 0).length;

  // Category statistics
  const categoryStats: Record<string, { total: number; completed: number }> = {};
  achievements.forEach((achievement) => {
    const category = achievement.category;
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, completed: 0 };
    }
    categoryStats[category].total++;
    if (achievement.isCompleted) {
      categoryStats[category].completed++;
    }
  });

  // Rarity statistics (only for completed)
  const rarityStats: Record<string, number> = {};
  achievements
    .filter((a) => a.isCompleted)
    .forEach((achievement) => {
      const rarity = achievement.rarity;
      rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
    });

  return {
    total,
    completed,
    inProgress,
    locked,
    completionRate: total > 0 ? completed / total : 0,
    categoryStats,
    rarityStats,
  };
}
