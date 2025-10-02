/**
 * Prisma Type Re-exports and Helpers
 *
 * This file provides a centralized location for Prisma-generated types
 * and helper utilities for working with Prisma models.
 */

import { Prisma } from '@prisma/client';
import type { ParlayLegWithUser } from './api/responses/prediction';
import type {
  User as PrismaUser,
  EmailVerification as PrismaEmailVerification,
  PasswordReset as PrismaPasswordReset,
  Prediction as PrismaPrediction,
  PredictionOption as PrismaPredictionOption,
  Bet as PrismaBet,
  Parlay as PrismaParlay,
  ParlayLeg as PrismaParlayLeg,
  Transaction as PrismaTransaction,
  RefreshToken as PrismaRefreshToken,
  Badge as PrismaBadge,
  UserBadge as PrismaUserBadge,
  Achievement as PrismaAchievement,
  UserAchievement as PrismaUserAchievement,
  Follow as PrismaFollow,
  FeedSource as PrismaFeedSource,
  Article as PrismaArticle,
  PredictionSourceLink as PrismaPredictionSourceLink,
  Content as PrismaContent,
  Reaction as PrismaReaction,
  Category as PrismaCategory,
  Tag as PrismaTag,
  ArticleTag as PrismaArticleTag,
  ContentMention as PrismaContentMention,
  ContentHashtag as PrismaContentHashtag,
  ArticleBookmark as PrismaArticleBookmark,
  BookmarkCollection as PrismaBookmarkCollection,
  ArticleShare as PrismaArticleShare,
  Message as PrismaMessage,
  UserStats as PrismaUserStats,
  UserBan as PrismaUserBan,
  ModerationLog as PrismaModerationLog,
  // Enums
  Role as PrismaRole,
  BetOption as PrismaBetOption,
  BetStatus as PrismaBetStatus,
  TransactionType as PrismaTransactionType,
  ArticleStatus as PrismaArticleStatus,
  BanType as PrismaBanType,
  ModerationAction as PrismaModerationAction,
  ReactionType as PrismaReactionType,
  ContentType as PrismaContentType,
  PongDifficulty as PrismaPongDifficulty,
  PongMatchStatus as PrismaPongMatchStatus,
} from '@prisma/client';

// ============================================================================
// Direct Prisma Type Re-exports
// ============================================================================

// Models
export type {
  PrismaUser,
  PrismaEmailVerification,
  PrismaPasswordReset,
  PrismaPrediction,
  PrismaPredictionOption,
  PrismaBet,
  PrismaParlay,
  PrismaParlayLeg,
  PrismaTransaction,
  PrismaRefreshToken,
  PrismaBadge,
  PrismaUserBadge,
  PrismaAchievement,
  PrismaUserAchievement,
  PrismaFollow,
  PrismaFeedSource,
  PrismaArticle,
  PrismaPredictionSourceLink,
  PrismaContent,
  PrismaReaction,
  PrismaCategory,
  PrismaTag,
  PrismaArticleTag,
  PrismaContentMention,
  PrismaContentHashtag,
  PrismaArticleBookmark,
  PrismaBookmarkCollection,
  PrismaArticleShare,
  PrismaMessage,
  PrismaUserStats,
  PrismaUserBan,
  PrismaModerationLog,
};

// Enums
export type {
  PrismaRole,
  PrismaBetOption,
  PrismaBetStatus,
  PrismaTransactionType,
  PrismaArticleStatus,
  PrismaBanType,
  PrismaModerationAction,
  PrismaReactionType,
  PrismaContentType,
  PrismaPongDifficulty,
  PrismaPongMatchStatus,
};

// Export enums with cleaner names for convenience
// Note: BanType and ModerationAction are NOT aliased here because they conflict
// with domain layer types in domain/moderation.ts
export type {
  PrismaRole as Role,
  PrismaBetOption as BetOption,
  PrismaBetStatus as BetStatus,
  PrismaTransactionType as TransactionType,
  PrismaArticleStatus as ArticleStatus,
  // PrismaBanType as BanType, // Conflicts with domain/moderation.ts
  // PrismaModerationAction as ModerationAction, // Conflicts with domain/moderation.ts
  PrismaReactionType as ReactionType,
  PrismaContentType as ContentType,
  PrismaPongDifficulty as PongDifficulty,
  PrismaPongMatchStatus as PongMatchStatus,
};

// ============================================================================
// Prisma Helper Types (using Prisma.ModelGetPayload pattern)
// ============================================================================

/**
 * User with related data patterns
 */
export type UserWithStats = Prisma.UserGetPayload<{
  include: { stats: true };
}>;

// TODO: Fix badges relation name based on actual Prisma schema
// export type UserWithBadges = Prisma.UserGetPayload<{
//   include: { badges: { include: { badge: true } } };
// }>;

export type UserWithFollowers = Prisma.UserGetPayload<{
  include: {
    followers: { include: { follower: true } };
    following: { include: { following: true } };
  };
}>;

/**
 * Prediction with related data patterns
 */
export type PredictionWithOptions = Prisma.PredictionGetPayload<{
  include: { options: true };
}>;

export type PredictionWithBets = Prisma.PredictionGetPayload<{
  include: {
    options: true;
    bets: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
  };
}>;

export type PredictionWithCategory = Prisma.PredictionGetPayload<{
  include: {
    category: true;
    options: true;
  };
}>;

export type PredictionWithAll = Prisma.PredictionGetPayload<{
  include: {
    options: true;
    bets: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
    category: true;
    sourceLinks: {
      include: {
        article: {
          include: {
            feed: true;
          };
        };
      };
    };
  };
}>;

/**
 * Prediction with category, options, bets, and parlay legs
 * Used by repository methods that return flattened parlay legs
 */
export type PredictionWithRelations = PrismaPrediction & {
  category: PrismaCategory | null;
  options: PrismaPredictionOption[];
  bets: BetWithUser[];
  parlayLegs: ParlayLegWithUser[];
};

/**
 * Content with related data patterns (new unified model)
 */
export type ContentWithAuthor = Prisma.ContentGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
  };
}>;

export type ContentWithThread = Prisma.ContentGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
    parent: true;
    children: {
      include: {
        author: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
  };
}>;

export type ContentWithReactions = Prisma.ContentGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
    reactions: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
  };
}>;

/**
 * Reaction with related data patterns (new unified model)
 */
export type ReactionWithUser = Prisma.ReactionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
  };
}>;

/**
 * Category with related data patterns
 */
export type CategoryWithPredictions = Prisma.CategoryGetPayload<{
  include: { predictions: true };
}>;

export type CategoryWithStats = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: {
        predictions: true;
      };
    };
  };
}>;

/**
 * Tag with related data patterns
 */
export type TagWithArticles = Prisma.TagGetPayload<{
  include: {
    articles: {
      include: {
        article: true;
      };
    };
  };
}>;

export type TagWithStats = Prisma.TagGetPayload<{
  include: {
    _count: {
      select: {
        articles: true;
      };
    };
  };
}>;

/**
 * Article with related data patterns
 */
export type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: {
    feed: true;
  };
}>;

export type ArticleWithTags = Prisma.ArticleGetPayload<{
  include: {
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

export type ArticleWithReactions = Prisma.ArticleGetPayload<{
  include: {
    feed: true;
    tags: {
      include: {
        tag: true;
      };
    };
    reactions: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
  };
}>;

export type ArticleWithComments = Prisma.ArticleGetPayload<{
  include: {
    feed: true;
    tags: {
      include: {
        tag: true;
      };
    };
    comments: {
      include: {
        author: {
          select: {
            id: true;
            name: true;
            avatarUrl: true;
            profilePictureKey: true;
          };
        };
      };
    };
  };
}>;

/**
 * Bet with related data patterns
 */
export type BetWithUser = Prisma.BetGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
  };
}>;

export type BetWithPrediction = Prisma.BetGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
    prediction: {
      include: {
        options: true;
      };
    };
    option: true;
  };
}>;

/**
 * Parlay with related data patterns
 */
export type ParlayWithLegs = Prisma.ParlayGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatarUrl: true;
        profilePictureKey: true;
      };
    };
    legs: {
      include: {
        option: {
          include: {
            prediction: true;
          };
        };
      };
    };
  };
}>;

/**
 * Transaction with related data patterns
 */
export type TransactionWithUser = Prisma.TransactionGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;
