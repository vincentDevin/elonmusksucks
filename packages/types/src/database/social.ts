/**
 * Social Database Types
 *
 * Types for Follow, Badge, UserBadge models
 */

import type { PrismaFollow, PrismaBadge, PrismaUserBadge } from '../prisma';

// ============================================================================
// Follow Types
// ============================================================================

export type DbFollow = PrismaFollow;

export type PublicFollow = Pick<PrismaFollow, 'id' | 'followerId' | 'followingId' | 'createdAt'>;

// ============================================================================
// Badge Types
// ============================================================================

export type DbBadge = PrismaBadge;

export interface PublicBadge {
  id: number;
  name: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: string;
}

export type DbUserBadge = PrismaUserBadge;

export type PublicUserBadge = PublicBadge & { awardedAt: string };
