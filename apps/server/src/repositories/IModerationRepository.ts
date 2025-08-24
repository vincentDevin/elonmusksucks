// apps/server/src/repositories/IModerationRepository.ts
import type { UserBan, ModerationLog, User, Message, UserPost } from '@prisma/client';
import type { BanType } from '@prisma/client';
import type { CreateBanData, CreateModerationLogData } from '@ems/types';

// TEMP: Re-export for backwards compatibility during migration
export type { CreateBanData, CreateModerationLogData };

// CreateBanData moved to @ems/types - see import above
// CreateModerationLogData moved to @ems/types - see import above

// Note: The shared types use string instead of BanType/ModerationAction
// to avoid Prisma imports in @ems/types, but they're compatible at runtime

export interface BanWithUser extends UserBan {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface ModerationLogWithUsers extends ModerationLog {
  moderator: Pick<User, 'id' | 'name'>;
  targetUser?: Pick<User, 'id' | 'name'> | null;
}

export interface IModerationRepository {
  // User ban management
  createBan(data: CreateBanData): Promise<UserBan>;
  getActiveBans(): Promise<BanWithUser[]>;
  getBanById(banId: number): Promise<BanWithUser | null>;
  getBanByUserId(userId: number): Promise<UserBan | null>;
  updateBanStatus(banId: number, isActive: boolean): Promise<UserBan>;
  checkExpiredBans(): Promise<number>;
  countUserBans(userId: number): Promise<number>;
  getBanHistoryWithModerator(limit: number): Promise<
    Array<{
      id: number;
      userId: number;
      userName: string;
      banType: BanType;
      reason: string;
      startDate: string;
      endDate: string | null;
      isActive: boolean;
      moderatorName: string;
    }>
  >;

  // Message moderation
  deleteMessage(messageId: number): Promise<boolean>;
  getMessage(messageId: number): Promise<Message | null>;

  // Post moderation
  deletePost(postId: number): Promise<boolean>;
  getPost(postId: number): Promise<UserPost | null>;

  // Moderation logging
  createModerationLog(data: CreateModerationLogData): Promise<ModerationLog>;
  getModerationHistory(
    targetUserId?: number,
    moderatorId?: number,
  ): Promise<ModerationLogWithUsers[]>;
  getRecentModerationActions(limit?: number): Promise<ModerationLogWithUsers[]>;

  // User management
  getUserById(userId: number): Promise<User | null>;
  updateUserActiveStatus(userId: number, active: boolean): Promise<User>;
}
