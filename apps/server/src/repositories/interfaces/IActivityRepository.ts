// import type { UnifiedActivityEvent } from '../services/unifiedActivity.service';

export interface IActivityRepository {
  createActivity(data: {
    userId: number;
    type: string;
    title: string;
    description: string;
    details: any;
    isPersonal: boolean;
    priority: string;
    predictionId?: number;
  }): Promise<void>;

  getPublicActivities(limit: number): Promise<
    Array<{
      id: number;
      type: string;
      title: string | null;
      description: string | null;
      details: any;
      isPersonal: boolean;
      priority: string;
      createdAt: Date;
      user: { id: number; name: string; avatarUrl: string | null };
      prediction: { id: number; title: string; category: string } | null;
      bet: { id: number; amount: bigint } | null;
    }>
  >;

  createActivityRecord(data: {
    userId: number;
    type: string;
    title: string;
    description?: string;
    details?: any;
    isPersonal: boolean;
    priority: string;
    relatedUserId?: number;
    predictionId?: number;
    betId?: number;
  }): Promise<{ id: number }>;

  findActivitiesWithFilters(
    whereClause: any,
    options: {
      orderBy: any;
      take: number;
      skip?: number;
    },
  ): Promise<
    Array<{
      id: number;
      type: string;
      title: string | null;
      description: string | null;
      details: any;
      isPersonal: boolean;
      priority: string;
      createdAt: Date;
      user: { id: number; name: string; avatarUrl: string | null };
      relatedUser: { id: number; name: string; avatarUrl: string | null } | null;
      prediction: { id: number; title: string; category: string } | null;
      bet: { id: number; amount: bigint } | null;
    }>
  >;

  deleteOldActivities(cutoffDate: Date, excludePriority: string): Promise<number>;
}
