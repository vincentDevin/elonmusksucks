// apps/server/src/repositories/PredictionRepository.ts
// -----------------------------------------------------------------------------
// Prisma access helpers for predictions. In addition to the historical fields
// we now ALSO return `avatarUrl` & `profilePictureKey` for bet‑side users so the
// service layer can generate signed avatars.
// -----------------------------------------------------------------------------

import prisma from '../db';
import type { IPredictionRepository } from './interfaces/IPredictionRepository';
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  ParlayLegWithUser,
} from '@ems/types';
import type { PredictionType } from '@ems/types';

// Using the global ParlayLegWithUser type from @ems/types

export class PredictionRepository implements IPredictionRepository {
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<
        DbBet & {
          user: Pick<DbUser, 'id' | 'name' | 'avatarUrl' | 'profilePictureKey'>;
        }
      >;
      sourceLinks: Array<{
        id: number;
        predictionId: number;
        articleId: number | null;
        tweetId: string | null;
        url: string;
        title: string | null;
        publisher: string | null;
        capturedAt: Date;
      }>;
    }
  > {
    return prisma.prediction.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        expiresAt: data.expiresAt,
        creatorId: data.creatorId,
        type: data.type,
        threshold: data.threshold,
        options: { create: data.options.map((o) => ({ label: o.label, odds: 2.0 })) },
      },
      include: {
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
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            articleId: true,
            tweetId: true,
            url: true,
            title: true,
            publisher: true,
            capturedAt: true,
          },
        },
      },
    });
  }

  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<
          DbBet & {
            user: Pick<DbUser, 'id' | 'name' | 'avatarUrl' | 'profilePictureKey'>;
          }
        >;
        parlayLegs: ParlayLegWithUser[];
        sourceLinks: Array<{
          id: number;
          predictionId: number;
          articleId: number | null;
          tweetId: string | null;
          url: string;
          title: string | null;
          publisher: string | null;
          capturedAt: Date;
        }>;
      }
    >
  > {
    const preds = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
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
          select: {
            id: true,
            predictionId: true,
            articleId: true,
            tweetId: true,
            url: true,
            title: true,
            publisher: true,
            capturedAt: true,
          },
        },
      },
    });

    return preds.map((pred) => {
      const { options, bets, sourceLinks, ...rest } = pred;

      // --- flatten parlay legs ---
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

      return { ...rest, options, bets, parlayLegs, sourceLinks } as any;
    });
  }

  async findPredictionBasicById(id: number) {
    return prisma.prediction.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        resolved: true,
      },
    });
  }

  async findExistingSourceLink(predictionId: number, articleId?: number, tweetId?: string) {
    return prisma.predictionSourceLink.findFirst({
      where: {
        predictionId,
        ...(articleId ? { articleId } : { tweetId }),
      },
    });
  }

  async createSourceLink(
    predictionId: number,
    articleId: number | null,
    tweetId: string | null,
    url: string,
    title: string | null,
    publisher: string | null,
  ) {
    return prisma.predictionSourceLink.create({
      data: {
        predictionId,
        articleId,
        tweetId,
        url,
        title,
        publisher,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
        tweet: {
          select: {
            id: true,
            text: true,
            permalink: true,
            authorHandle: true,
          },
        },
      },
    });
  }

  async findPredictionById(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<
          DbBet & {
            user: Pick<DbUser, 'id' | 'name' | 'avatarUrl' | 'profilePictureKey'>;
          }
        >;
        parlayLegs: ParlayLegWithUser[];
        sourceLinks: Array<{
          id: number;
          predictionId: number;
          articleId: number | null;
          tweetId: string | null;
          url: string;
          title: string | null;
          publisher: string | null;
          capturedAt: Date;
        }>;
      })
    | null
  > {
    const pred = await prisma.prediction.findUnique({
      where: { id },
      include: {
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
          select: {
            id: true,
            predictionId: true,
            articleId: true,
            tweetId: true,
            url: true,
            title: true,
            publisher: true,
            capturedAt: true,
          },
        },
      },
    });

    if (!pred) return null;

    const { options, bets, sourceLinks, ...rest } = pred;
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

    return { ...rest, options, bets, parlayLegs, sourceLinks } as any;
  }

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
      tweet: {
        id: string;
        text: string;
        permalink: string;
        authorHandle: string;
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
        tweet: {
          select: {
            id: true,
            text: true,
            permalink: true,
            authorHandle: true,
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async findPredictionsByIds(ids: number[]): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<
          DbBet & {
            user: Pick<DbUser, 'id' | 'name' | 'avatarUrl' | 'profilePictureKey'>;
          }
        >;
        parlayLegs: ParlayLegWithUser[];
      }
    >
  > {
    const preds = await prisma.prediction.findMany({
      where: { id: { in: ids } },
      include: {
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
      },
    });

    return preds.map((pred) => {
      const { options, bets, ...rest } = pred;

      // --- flatten parlay legs ---
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

      return { ...rest, options, bets, parlayLegs } as any;
    });
  }

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

  async getUserActivityLog(
    userId: number,
    activityTypes: string[],
    limit: number = 100,
  ): Promise<
    Array<{
      activityType: string;
      metadata: any;
      occurredAt: Date;
    }>
  > {
    return prisma.userActivityLog.findMany({
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
  }
}
