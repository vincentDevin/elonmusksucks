// apps/server/src/repositories/PredictionRepository.ts
// -----------------------------------------------------------------------------
// Prisma access helpers for predictions. In addition to the historical fields
// we now ALSO return `avatarUrl` & `profilePictureKey` for bet‑side users so the
// service layer can generate signed avatars.
// -----------------------------------------------------------------------------

import prisma from '../db';
import type { IPredictionRepository } from './interfaces/IPredictionRepository';
import type {
  PrismaPredictionOption,
  PrismaPredictionSourceLink,
  ParlayLegWithUser,
  PredictionType,
  BetWithUser,
  DbPredictionActivity,
  PredictionWithRelations,
  PredictionWithCategory,
} from '@ems/types';

/**
 * Repository for Prediction-related database operations.
 * Handles predictions, options, bets, parlay legs, and source links.
 */
export class PredictionRepository implements IPredictionRepository {
  /**
   * Create a new prediction with options
   * @param data - Prediction creation data including title, description, category, options, etc.
   * @returns Created prediction with options and bets
   */
  async createPrediction(data: {
    title: string;
    description: string;
    categoryId: number;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<PredictionWithCategory & { bets: BetWithUser[] }> {
    const result = await prisma.prediction.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        expiresAt: data.expiresAt,
        creatorId: data.creatorId,
        type: data.type,
        threshold: data.threshold,
        options: { create: data.options.map((o) => ({ label: o.label, odds: 2.0 })) },
      },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        options: {
          select: {
            id: true,
            label: true,
            odds: true,
            predictionId: true,
            createdAt: true,
          },
        },
        bets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
      },
    });

    return result as PredictionWithCategory & { bets: BetWithUser[] };
  }

  /**
   * List all predictions with options, bets, and parlay legs
   * @returns Array of all predictions with related data
   * NOTE: Uses manual batch queries instead of nested includes to avoid N+1 issues
   */
  async listAllPredictions(): Promise<PredictionWithRelations[]> {
    // Step 1: Fetch predictions with direct relations only (categories, options, creator)
    const preds = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        options: true, // No nested includes - we'll batch fetch related data
      },
    });

    if (preds.length === 0) {
      return [];
    }

    const predictionIds = preds.map((p) => p.id);
    const optionIds = preds.flatMap((p) => p.options.map((o) => o.id));

    // Step 2: Batch fetch all bets for these predictions
    const bets = await prisma.bet.findMany({
      where: { predictionId: { in: predictionIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
    });

    // Step 3: Batch fetch all parlay legs for these options
    const parlayLegs = await prisma.parlayLeg.findMany({
      where: { optionId: { in: optionIds } },
      include: {
        parlay: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
      },
    });

    // Step 4: Batch fetch all source links for these predictions
    const sourceLinks = await prisma.predictionSourceLink.findMany({
      where: { predictionId: { in: predictionIds } },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            leadImageUrl: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });

    // Create lookup maps for efficient joins
    const betsByPrediction = new Map<number, typeof bets>();
    bets.forEach((bet) => {
      const existing = betsByPrediction.get(bet.predictionId) || [];
      existing.push(bet);
      betsByPrediction.set(bet.predictionId, existing);
    });

    const legsByOption = new Map<number, typeof parlayLegs>();
    parlayLegs.forEach((leg) => {
      const existing = legsByOption.get(leg.optionId) || [];
      existing.push(leg);
      legsByOption.set(leg.optionId, existing);
    });

    const sourceLinksByPrediction = new Map<number, typeof sourceLinks>();
    sourceLinks.forEach((link) => {
      const existing = sourceLinksByPrediction.get(link.predictionId) || [];
      existing.push(link);
      sourceLinksByPrediction.set(link.predictionId, existing);
    });

    // Step 5: Join data client-side using maps
    return preds.map((pred) => {
      // Get bets for this prediction from lookup map
      const predictionBets = betsByPrediction.get(pred.id) || [];

      // Get source links for this prediction from lookup map
      const predictionSourceLinks = sourceLinksByPrediction.get(pred.id) || [];

      // Get parlay legs for all options in this prediction
      const predParlayLegs: ParlayLegWithUser[] = [];
      pred.options.forEach((opt) => {
        const legs = legsByOption.get(opt.id) || [];
        legs.forEach((leg) => {
          predParlayLegs.push({
            parlayId: leg.parlay.id,
            user: {
              id: leg.parlay.user.id,
              name: leg.parlay.user.name,
              avatarUrl: leg.parlay.user.avatarUrl,
              ...(leg.parlay.user.profilePictureKey && {
                profilePictureKey: leg.parlay.user.profilePictureKey,
              }),
            },
            stake: leg.parlay.amount.toString(),
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        });
      });

      // Transform options to match expected interface
      const cleanOptions: PrismaPredictionOption[] = pred.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        odds: opt.odds,
        predictionId: opt.predictionId,
        createdAt: opt.createdAt,
      }));

      return {
        ...pred,
        options: cleanOptions,
        bets: predictionBets as BetWithUser[],
        parlayLegs: predParlayLegs,
        sourceLinks: predictionSourceLinks,
      } as PredictionWithRelations;
    });
  }

  /**
   * List filtered and paginated predictions with options, bets, and parlay legs
   * @param filters - Status filter, limit, and offset for pagination
   * @returns Object containing predictions array and total count
   * NOTE: Uses manual batch queries instead of nested includes to avoid N+1 issues
   */
  async listFilteredPredictions(filters: {
    status?: 'open' | 'pending' | 'expired' | 'resolved' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
    categoryId?: number;
    timeRemaining?: '1h' | '1d' | '1w';
  }): Promise<{
    predictions: PredictionWithRelations[];
    total: number;
  }> {
    const { status = 'all', limit = 50, offset = 0, search, categoryId, timeRemaining } = filters;
    const now = new Date();

    // Build where clause based on status filter
    let whereClause: any = {};

    switch (status) {
      case 'open':
        // Approved predictions that haven't expired and aren't resolved
        whereClause = {
          resolved: false,
          approved: true,
          expiresAt: { gt: now },
        };
        break;
      case 'pending':
        // Predictions waiting for approval
        whereClause = {
          resolved: false,
          approved: false,
        };
        break;
      case 'expired':
        // Predictions that have expired but aren't resolved yet
        whereClause = {
          resolved: false,
          expiresAt: { lte: now },
        };
        break;
      case 'resolved':
        // Predictions that have been resolved
        whereClause = {
          resolved: true,
        };
        break;
      case 'all':
      default:
        // No filtering - return all predictions
        whereClause = {};
        break;
    }

    // Add search filter (title or description)
    if (search && search.trim()) {
      whereClause.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Add category filter
    if (categoryId !== undefined && categoryId !== null) {
      whereClause.categoryId = categoryId;
    }

    // Add time remaining filter
    if (timeRemaining) {
      const timeThresholds = {
        '1h': 1 * 60 * 60 * 1000, // 1 hour in milliseconds
        '1d': 24 * 60 * 60 * 1000, // 1 day in milliseconds
        '1w': 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
      };
      const threshold = new Date(now.getTime() + timeThresholds[timeRemaining]);

      // Only show predictions expiring within the timeframe
      whereClause.expiresAt = {
        ...whereClause.expiresAt,
        lte: threshold,
      };
    }

    // Step 1: Get total count for pagination metadata
    const total = await prisma.prediction.count({ where: whereClause });

    // Step 2: Fetch predictions with direct relations only (categories, options, creator)
    const preds = await prisma.prediction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        options: true, // No nested includes - we'll batch fetch related data
      },
    });

    if (preds.length === 0) {
      return { predictions: [], total };
    }

    const predictionIds = preds.map((p) => p.id);
    const optionIds = preds.flatMap((p) => p.options.map((o) => o.id));

    // Step 3: Batch fetch all bets for these predictions
    const bets = await prisma.bet.findMany({
      where: { predictionId: { in: predictionIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
    });

    // Step 4: Batch fetch all parlay legs for these options
    const parlayLegs = await prisma.parlayLeg.findMany({
      where: { optionId: { in: optionIds } },
      include: {
        parlay: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
      },
    });

    // Step 5: Batch fetch all source links for these predictions
    const sourceLinks = await prisma.predictionSourceLink.findMany({
      where: { predictionId: { in: predictionIds } },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            leadImageUrl: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });

    // Create lookup maps for efficient joins
    const betsByPrediction = new Map<number, typeof bets>();
    bets.forEach((bet) => {
      const existing = betsByPrediction.get(bet.predictionId) || [];
      existing.push(bet);
      betsByPrediction.set(bet.predictionId, existing);
    });

    const legsByOption = new Map<number, typeof parlayLegs>();
    parlayLegs.forEach((leg) => {
      const existing = legsByOption.get(leg.optionId) || [];
      existing.push(leg);
      legsByOption.set(leg.optionId, existing);
    });

    const sourceLinksByPrediction = new Map<number, typeof sourceLinks>();
    sourceLinks.forEach((link) => {
      const existing = sourceLinksByPrediction.get(link.predictionId) || [];
      existing.push(link);
      sourceLinksByPrediction.set(link.predictionId, existing);
    });

    // Step 6: Join data client-side using maps
    const predictions = preds.map((pred) => {
      // Get bets for this prediction from lookup map
      const predictionBets = betsByPrediction.get(pred.id) || [];

      // Get source links for this prediction from lookup map
      const predictionSourceLinks = sourceLinksByPrediction.get(pred.id) || [];

      // Get parlay legs for all options in this prediction
      const predParlayLegs: ParlayLegWithUser[] = [];
      pred.options.forEach((opt) => {
        const legs = legsByOption.get(opt.id) || [];
        legs.forEach((leg) => {
          predParlayLegs.push({
            parlayId: leg.parlay.id,
            user: {
              id: leg.parlay.user.id,
              name: leg.parlay.user.name,
              avatarUrl: leg.parlay.user.avatarUrl,
              ...(leg.parlay.user.profilePictureKey && {
                profilePictureKey: leg.parlay.user.profilePictureKey,
              }),
            },
            stake: leg.parlay.amount.toString(),
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        });
      });

      // Transform options to match expected interface
      const cleanOptions: PrismaPredictionOption[] = pred.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        odds: opt.odds,
        predictionId: opt.predictionId,
        createdAt: opt.createdAt,
      }));

      return {
        ...pred,
        options: cleanOptions,
        bets: predictionBets as BetWithUser[],
        parlayLegs: predParlayLegs,
        sourceLinks: predictionSourceLinks,
      } as PredictionWithRelations;
    });

    return { predictions, total };
  }

  /**
   * Find basic prediction data by ID (minimal fields for validation)
   * @param id - Prediction ID
   * @returns Basic prediction data or null if not found
   */
  async findPredictionBasicById(id: number): Promise<{
    id: number;
    creatorId: number;
    resolved: boolean;
  } | null> {
    return prisma.prediction.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        resolved: true,
      },
    });
  }

  /**
   * Find existing source link for a prediction
   * @param predictionId - Prediction ID
   * @param articleId - Optional article ID
   * @param tweetId - Optional tweet ID
   * @returns Existing source link or null
   */
  async findExistingSourceLink(
    predictionId: number,
    articleId?: number,
    tweetId?: string,
  ): Promise<PrismaPredictionSourceLink | null> {
    return prisma.predictionSourceLink.findFirst({
      where: {
        predictionId,
        ...(articleId ? { articleId } : { tweetId }),
      },
    });
  }

  /**
   * Create a new source link for a prediction
   * @param predictionId - Prediction ID
   * @param articleId - Article ID or null
   * @param tweetId - Tweet ID or null
   * @param url - Source URL
   * @param title - Source title or null
   * @param publisher - Source publisher or null
   * @returns Created source link
   */
  async createSourceLink(
    predictionId: number,
    articleId: number | null,
    tweetId: string | null,
    url: string,
    title: string | null,
    publisher: string | null,
  ): Promise<PrismaPredictionSourceLink> {
    return prisma.predictionSourceLink.create({
      data: {
        predictionId,
        articleId,
        tweetId,
        url,
        title,
        publisher,
      },
    });
  }

  /**
   * Find a single prediction by ID with full details
   * @param id - Prediction ID
   * @returns Prediction with options, bets, and parlay legs, or null if not found
   */
  async findPredictionById(id: number): Promise<PredictionWithRelations | null> {
    const pred = await prisma.prediction.findUnique({
      where: { id },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        options: {
          include: {
            parlayLegs: {
              include: {
                parlay: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        profilePictureKey: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        bets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
        sourceLinks: {
          include: {
            article: {
              select: {
                id: true,
                title: true,
                url: true,
                leadImageUrl: true,
                feed: {
                  select: {
                    name: true,
                    siteUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    if (!pred) return null;

    const { options, bets, sourceLinks, ...rest } = pred;

    // Flatten parlay legs from nested structure
    const parlayLegs: ParlayLegWithUser[] = [];
    options.forEach((opt) =>
      opt.parlayLegs.forEach((leg) => {
        parlayLegs.push({
          parlayId: leg.parlay.id,
          user: {
            id: leg.parlay.user.id,
            name: leg.parlay.user.name,
            avatarUrl: leg.parlay.user.avatarUrl,
            ...(leg.parlay.user.profilePictureKey && {
              profilePictureKey: leg.parlay.user.profilePictureKey,
            }),
          },
          stake: leg.parlay.amount.toString(),
          optionId: opt.id,
          createdAt: leg.createdAt,
        });
      }),
    );

    // Transform options to remove nested parlayLegs
    const cleanOptions: PrismaPredictionOption[] = options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      odds: opt.odds,
      predictionId: opt.predictionId,
      createdAt: opt.createdAt,
    }));

    return {
      ...rest,
      category: pred.category,
      options: cleanOptions,
      bets: bets as BetWithUser[],
      parlayLegs,
      sourceLinks: sourceLinks || [],
    } as PredictionWithRelations;
  }

  /**
   * Get source links for a prediction with article details
   * @param predictionId - Prediction ID
   * @returns Array of source links with article information
   */
  async getSourceLinks(predictionId: number): Promise<
    Array<{
      id: number;
      predictionId: number;
      articleId: number | null;
      tweetId: string | null;
      url: string;
      title: string | null;
      publisher: string | null;
      capturedAt: Date;
      article: {
        id: number;
        title: string;
        url: string;
        leadImageUrl: string | null;
        feed: {
          name: string;
          siteUrl: string | null;
        };
      } | null;
    }>
  > {
    return prisma.predictionSourceLink.findMany({
      where: { predictionId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            leadImageUrl: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });
  }

  /**
   * Find multiple predictions by IDs
   * @param ids - Array of prediction IDs
   * @returns Array of predictions with options, bets, and parlay legs
   */
  async findPredictionsByIds(ids: number[]): Promise<PredictionWithRelations[]> {
    const preds = await prisma.prediction.findMany({
      where: { id: { in: ids } },
      include: {
        category: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        options: {
          include: {
            parlayLegs: {
              include: {
                parlay: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        profilePictureKey: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        bets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
        sourceLinks: {
          include: {
            article: {
              select: {
                id: true,
                title: true,
                url: true,
                leadImageUrl: true,
                feed: {
                  select: {
                    name: true,
                    siteUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    return preds.map((pred) => {
      const { options, bets, sourceLinks, ...rest } = pred;

      // Flatten parlay legs from nested structure
      const parlayLegs: ParlayLegWithUser[] = [];
      options.forEach((opt) =>
        opt.parlayLegs.forEach((leg) => {
          parlayLegs.push({
            parlayId: leg.parlay.id,
            user: {
              id: leg.parlay.user.id,
              name: leg.parlay.user.name,
              avatarUrl: leg.parlay.user.avatarUrl,
              ...(leg.parlay.user.profilePictureKey && {
                profilePictureKey: leg.parlay.user.profilePictureKey,
              }),
            },
            stake: leg.parlay.amount.toString(),
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        }),
      );

      // Transform options to remove nested parlayLegs
      const cleanOptions: PrismaPredictionOption[] = options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        odds: opt.odds,
        predictionId: opt.predictionId,
        createdAt: opt.createdAt,
      }));

      return {
        ...rest,
        category: pred.category,
        options: cleanOptions,
        bets: bets as BetWithUser[],
        parlayLegs,
        sourceLinks: sourceLinks || [],
      } as PredictionWithRelations;
    });
  }

  /**
   * Increment the view count for a prediction
   * @param predictionId - Prediction ID
   */
  async incrementViewCount(predictionId: number): Promise<void> {
    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Check if a user has already viewed a specific prediction
   * @param predictionId - Prediction ID
   * @param userId - User ID
   * @returns True if user has viewed the prediction, false otherwise
   */
  async hasUserViewedPrediction(predictionId: number, userId: number): Promise<boolean> {
    const viewLog = await prisma.userActivityLog.findFirst({
      where: {
        userId,
        activityType: 'prediction_viewed',
        metadata: {
          path: ['predictionId'],
          equals: predictionId,
        },
      },
    });
    return !!viewLog;
  }

  /**
   * Get the total number of unique user views for a prediction
   * @param predictionId - Prediction ID
   * @returns Count of unique user views
   */
  async getUserViewCount(predictionId: number): Promise<number> {
    const viewCount = await prisma.userActivityLog.count({
      where: {
        activityType: 'prediction_viewed',
        metadata: {
          path: ['predictionId'],
          equals: predictionId,
        },
      },
    });
    return viewCount;
  }

  /**
   * Get user activity log for recommendation analysis
   * @param userId - User ID
   * @param activityTypes - Array of activity types to filter
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of user activity records
   */
  async getUserActivityLog(
    userId: number,
    activityTypes: string[],
    limit: number = 100,
  ): Promise<DbPredictionActivity[]> {
    const results = await prisma.userActivityLog.findMany({
      where: {
        userId,
        activityType: {
          in: activityTypes,
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      select: {
        activityType: true,
        metadata: true,
        occurredAt: true,
      },
    });

    // Transform Prisma JsonValue metadata to DbPredictionActivityMetadata
    return results.map((result) => ({
      activityType: result.activityType,
      metadata: result.metadata as DbPredictionActivity['metadata'],
      occurredAt: result.occurredAt,
    }));
  }
}
