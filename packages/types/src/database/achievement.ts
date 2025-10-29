/**
 * Achievement Database Layer Types
 *
 * Types for achievement repository operations including achievement management,
 * user achievement tracking, and rule-based achievement processing.
 */

import type { PrismaAchievement, PrismaUserAchievement, PrismaUser } from '../prisma';

// ============================================================================
// Achievement Query Types
// ============================================================================

export interface DbAchievementQueryParams {
  category?: string;
  rarity?: string;
  isActive?: boolean;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  limit?: number;
  offset?: number;
}

export interface DbUserAchievementQueryParams {
  userId?: number;
  achievementId?: number;
  completed?: boolean;
  minProgress?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Detailed Achievement Types
// ============================================================================

export interface DetailedAchievement extends PrismaAchievement {
  totalEarned?: number;
  recentEarners?: Array<{
    userId: number;
    userName: string;
    completedAt: Date;
  }>;
  userProgress?: {
    progress: number;
    completedAt: Date | null;
  };
}

export interface DetailedUserAchievement extends PrismaUserAchievement {
  achievement: PrismaAchievement;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  percentComplete: number;
}

// ============================================================================
// Achievement Creation & Update Types
// ============================================================================

export interface CreateAchievementData {
  name: string;
  slug?: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  targetValue: number;
  iconUrl?: string;
  isActive?: boolean;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
  ruleData?: Record<string, any> | null;
}

export interface UpdateAchievementData {
  name?: string;
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  rarity?: string;
  targetValue?: number;
  iconUrl?: string;
  isActive?: boolean;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
  ruleData?: Record<string, any> | null;
  ruleComplexity?: number;
  rulePerformanceScore?: number;
  lastRuleValidation?: Date;
}

export interface CreateUserAchievementData {
  userId: number;
  achievementId: number;
  progress?: number;
  completedAt?: Date | null;
}

export interface UpdateUserAchievementData {
  userId: number;
  achievementId: number;
  progress?: number;
  completedAt?: Date | null;
}

export interface BulkCreateUserAchievementData {
  userId: number;
  achievementId: number;
  progress: number;
}

// ============================================================================
// Achievement Rule Types
// ============================================================================

export interface DbAchievementRule {
  id: number;
  achievementId: number;
  eventKey: string;
  ruleData: Record<string, any>;
  isActive: boolean;
  complexity: number;
  performanceScore: number;
}

export interface DbAchievementRuleMetrics {
  complexityScore: number;
  performanceScore: number;
}

// ============================================================================
// Shame Achievement Types
// ============================================================================

export interface ShameAchievement {
  slug: string;
  title: string;
  description: string;
  completedAt: Date;
}

// ============================================================================
// User Achievement Summary Types
// ============================================================================

export interface UserAchievementSummary {
  user: Pick<PrismaUser, 'id' | 'name' | 'email'>;
  totalAchievements: number;
  completedAchievements: number;
  inProgressAchievements: number;
  shameAchievements: number;
  recentAchievements: Array<{
    achievement: PrismaAchievement;
    completedAt: Date;
  }>;
  achievementsByCategory: Array<{
    category: string;
    count: number;
    completed: number;
  }>;
  achievementsByRarity: Array<{
    rarity: string;
    count: number;
    completed: number;
  }>;
}

// ============================================================================
// Idempotency Types
// ============================================================================

export interface AchievementEventIdempotency {
  idempotencyKey: string;
  userId: number;
  eventKey: string;
  createdAt: Date;
}
