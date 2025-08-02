// apps/server/src/repositories/PredictionRepository.ts
// -----------------------------------------------------------------------------
// Prisma access helpers for predictions. In addition to the historical fields
// we now ALSO return `avatarUrl` & `profilePictureKey` for bet‑side users so the
// service layer can generate signed avatars.
// -----------------------------------------------------------------------------

import prisma from '../db';
import type { IPredictionRepository } from './IPredictionRepository';
import type { DbPrediction, DbPredictionOption, DbBet, DbUser } from '@ems/types';
import type { PredictionType } from '@ems/types';

/** Shape for a parlay leg that already contains user meta (with avatar support) */
export type ParlayLegWithUser = {
  parlayId: number;
  user: Pick<DbUser, 'id' | 'name' | 'avatarUrl' | 'profilePictureKey'>;
  stake: number;
  optionId: number;
  createdAt: Date;
};

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
              profilePictureKey: leg.parlay.user.profilePictureKey,
            },
            stake: leg.parlay.amount,
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        }),
      );

      return { ...rest, options, bets, parlayLegs } as any;
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
      },
    });

    if (!pred) return null;

    const { options, bets, ...rest } = pred;
    const parlayLegs: ParlayLegWithUser[] = [];
    options.forEach((opt) =>
      opt.parlayLegs.forEach((leg) => {
        parlayLegs.push({
          parlayId: leg.parlay.id,
          user: {
            id: leg.parlay.user.id,
            name: leg.parlay.user.name,
            avatarUrl: leg.parlay.user.avatarUrl,
            profilePictureKey: leg.parlay.user.profilePictureKey,
          },
          stake: leg.parlay.amount,
          optionId: opt.id,
          createdAt: leg.createdAt,
        });
      }),
    );

    return { ...rest, options, bets, parlayLegs } as any;
  }
}
