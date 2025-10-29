import type {
  DbCreateActivityData,
  DbCreateActivityRecordData,
  DbActivityWhereClause,
  DbActivityFindOptions,
  PublicActivity,
  DetailedActivity,
} from '@ems/types';

export interface IActivityRepository {
  createActivity(data: DbCreateActivityData): Promise<void>;

  getPublicActivities(limit: number): Promise<PublicActivity[]>;

  getUserActivities(userId: number, limit: number): Promise<PublicActivity[]>;

  createActivityRecord(data: DbCreateActivityRecordData): Promise<{ id: number }>;

  findActivitiesWithFilters(
    whereClause: DbActivityWhereClause,
    options: DbActivityFindOptions,
  ): Promise<DetailedActivity[]>;

  deleteOldActivities(cutoffDate: Date, excludePriority: string): Promise<number>;
}
