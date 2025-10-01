/**
 * Activity Database Layer Types
 *
 * Types for activity repository operations including user activity tracking,
 * activity logs, and event recording.
 */

import type { PrismaUser, PrismaPrediction, PrismaBet } from '../prisma';

// ============================================================================
// Activity Types
// ============================================================================

export interface DbActivityDetails {
  [key: string]: any;
}

export interface DbCreateActivityData {
  userId: number;
  type: string;
  title: string;
  description: string;
  details: DbActivityDetails;
  isPersonal: boolean;
  priority: string;
  predictionId?: number;
  betId?: number;
  relatedUserId?: number;
  pongMatchId?: string;
}

export interface DbCreateActivityRecordData {
  userId: number;
  type: string;
  title: string;
  description?: string;
  details?: DbActivityDetails;
  isPersonal: boolean;
  priority: string;
  relatedUserId?: number;
  predictionId?: number;
  betId?: number;
  pongMatchId?: string;
}

// ============================================================================
// Activity Query Types
// ============================================================================

export interface DbActivityWhereClause {
  userId?: number;
  type?: string | { in: string[] };
  isPersonal?: boolean;
  priority?: string | { in: string[] };
  predictionId?: number;
  betId?: number;
  relatedUserId?: number;
  createdAt?: {
    gte?: Date;
    lte?: Date;
    gt?: Date;
    lt?: Date;
  };
  AND?: DbActivityWhereClause[];
  OR?: DbActivityWhereClause[];
  NOT?: DbActivityWhereClause;
}

export interface DbActivityOrderBy {
  createdAt?: 'asc' | 'desc';
  priority?: 'asc' | 'desc';
  type?: 'asc' | 'desc';
  id?: 'asc' | 'desc';
}

export interface DbActivityFindOptions {
  orderBy: DbActivityOrderBy | DbActivityOrderBy[];
  take: number;
  skip?: number;
}

// ============================================================================
// Detailed Activity Types
// ============================================================================

export interface DbActivityPredictionData {
  id: number;
  title: string;
  category: string;
}

export interface DbActivityBetData {
  id: number;
  amount: bigint;
}

export interface DetailedActivity {
  id: number;
  type: string;
  title: string | null;
  description: string | null;
  details: DbActivityDetails;
  isPersonal: boolean;
  priority: string;
  createdAt: Date;
  user: Pick<PrismaUser, 'id' | 'name' | 'avatarUrl'>;
  relatedUser: Pick<PrismaUser, 'id' | 'name' | 'avatarUrl'> | null;
  prediction: DbActivityPredictionData | null;
  bet: DbActivityBetData | null;
}

export interface PublicActivity {
  id: number;
  type: string;
  title: string | null;
  description: string | null;
  details: DbActivityDetails;
  isPersonal: boolean;
  priority: string;
  createdAt: Date;
  user: Pick<PrismaUser, 'id' | 'name' | 'avatarUrl'>;
  prediction: DbActivityPredictionData | null;
  bet: DbActivityBetData | null;
}

// ============================================================================
// Activity Log Types
// ============================================================================

export interface DbActivityLogData {
  userId: number;
  activityType: string;
  metadata?: Record<string, any>;
  occurredAt?: Date;
  dateKey?: string;
}

export interface DbActivityLogQuery {
  userId?: number;
  activityType?: string;
  dateKey?: string;
  occurredAt?: {
    gte?: Date;
    lte?: Date;
  };
}

// ============================================================================
// Activity Aggregation Types
// ============================================================================

export interface DbActivityAggregation {
  type: string;
  count: number;
  priority: string;
  latestActivity: Date;
}

export interface DbUserActivitySummary {
  totalActivities: number;
  publicActivities: number;
  personalActivities: number;
  byType: Array<{
    type: string;
    count: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
  }>;
  recentActivities: DetailedActivity[];
}
