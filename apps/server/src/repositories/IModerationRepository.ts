// apps/server/src/repositories/IModerationRepository.ts
import type { UserBan, ModerationLog, User, Message, UserPost } from '@prisma/client';
import type { BanType, ModerationAction } from '@prisma/client';

export interface CreateBanData {
  userId: number;
  banType: BanType;
  reason: string;
  expiresAt?: Date;
}

export interface CreateModerationLogData {
  moderatorId: number;
  targetUserId?: number;
  action: ModerationAction;
  reason?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface BanWithUser extends UserBan {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface ModerationLogWithUsers extends ModerationLog {
  moderator: Pick<User, 'id' | 'name'>;
  targetUser?: Pick<User, 'id' | 'name'> | null;
}

export interface IModerationRepository {
  // User ban management
  createBan(data: CreateBanData): Promise<UserBan>;
  getActiveBans(): Promise<BanWithUser[]>;
  getBanByUserId(userId: number): Promise<UserBan | null>;
  updateBanStatus(banId: number, isActive: boolean): Promise<UserBan>;
  checkExpiredBans(): Promise<void>;

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
