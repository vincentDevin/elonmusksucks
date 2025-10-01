// apps/server/src/repositories/IModerationRepository.ts
import type {
  PrismaUserBan,
  PrismaModerationLog,
  PrismaUser,
  PrismaMessage,
  PrismaContent,
  PrismaBanType,
  CreateBanData,
  CreateModerationLogData,
} from '@ems/types';

// TEMP: Re-export for backwards compatibility during migration
export type { CreateBanData, CreateModerationLogData };

// CreateBanData moved to @ems/types - see import above
// CreateModerationLogData moved to @ems/types - see import above

// Note: The shared types use string instead of BanType/ModerationAction
// to avoid Prisma imports in @ems/types, but they're compatible at runtime

export interface BanWithUser extends PrismaUserBan {
  user: Pick<PrismaUser, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface ModerationLogWithUsers extends PrismaModerationLog {
  moderator: Pick<PrismaUser, 'id' | 'name'>;
  targetUser?: Pick<PrismaUser, 'id' | 'name'> | null;
}

export interface IModerationRepository {
  // User ban management
  createBan(data: CreateBanData): Promise<PrismaUserBan>;
  getActiveBans(): Promise<BanWithUser[]>;
  getBanById(banId: number): Promise<BanWithUser | null>;
  getBanByUserId(userId: number): Promise<PrismaUserBan | null>;
  updateBanStatus(banId: number, isActive: boolean): Promise<PrismaUserBan>;
  checkExpiredBans(): Promise<number>;
  countUserBans(userId: number): Promise<number>;
  getBanHistoryWithModerator(limit: number): Promise<
    Array<{
      id: number;
      userId: number;
      userName: string;
      banType: PrismaBanType;
      reason: string;
      startDate: string;
      endDate: string | null;
      isActive: boolean;
      moderatorName: string;
    }>
  >;

  // Message moderation
  deleteMessage(messageId: number): Promise<boolean>;
  getMessage(messageId: number): Promise<PrismaMessage | null>;

  // Post moderation (now using Content model)
  deletePost(postId: number): Promise<boolean>;
  getPost(postId: number): Promise<PrismaContent | null>;

  // Moderation logging
  createModerationLog(data: CreateModerationLogData): Promise<PrismaModerationLog>;
  getModerationHistory(
    targetUserId?: number,
    moderatorId?: number,
  ): Promise<ModerationLogWithUsers[]>;
  getRecentModerationActions(limit?: number): Promise<ModerationLogWithUsers[]>;

  // User management
  getUserById(userId: number): Promise<PrismaUser | null>;
  updateUserActiveStatus(userId: number, active: boolean): Promise<PrismaUser>;
}
