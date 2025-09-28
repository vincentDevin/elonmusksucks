// apps/server/src/repositories/BettingRepository.ts
import { PrismaClient } from '@prisma/client';
import type { IBettingRepository, OptionWithPrediction } from './interfaces/IBettingRepository';
import type { DbBet, DbParlay } from '@ems/types';
import { eventBus } from '../lib/EventBus';

const prisma = new PrismaClient();

export class BettingRepository implements IBettingRepository {
  async findOptionWithPrediction(optionId: number): Promise<OptionWithPrediction | null> {
    return (await prisma.predictionOption.findUnique({
      where: { id: optionId },
      include: {
        prediction: {
          select: { id: true, title: true, category: true, resolved: true, expiresAt: true },
        },
      },
    })) as OptionWithPrediction | null;
  }

  findUserById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, muskBucks: true, name: true, avatarUrl: true, profilePictureKey: true },
    });
  }

  // Rollback: Remove idempotencyKey parameter and usage
  // Rollback: Move stats upsert back into main transaction
  async placeBet(
    userId: number,
    predictionId: number,
    optionId: number,
    amount: number,
    oddsAtPlacement: number,
    potentialPayout: bigint,
    wasAllIn: boolean,
    idempotencyKey?: string,
  ): Promise<DbBet> {
    // Critical transaction: only financial operations to reduce lock contention
    const bet = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEBIT',
          subtype: 'BET_WAGER',
          amount: BigInt(amount),
          balanceAfter: user.muskBucks,
          description: `Bet wager on prediction ${predictionId}`,
          metadata: {
            predictionId,
            optionId,
            oddsAtPlacement,
            wasAllIn,
          },
          relatedBetId: null, // Will be updated after bet creation
          relatedParlayId: null,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}-debit` : undefined,
        },
      });

      return await tx.bet.create({
        data: {
          userId,
          predictionId,
          optionId,
          amount: BigInt(amount),
          oddsAtPlacement,
          potentialPayout,
          wasAllIn,
          idempotencyKey,
        },
      });
    });

    // Update stats outside transaction to reduce lock scope
    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalBets: 1,
        betsWon: 0,
        betsLost: 0,
        totalParlays: 0,
        parlaysWon: 0,
        parlaysLost: 0,
        totalParlayLegs: 0,
        parlayLegsWon: 0,
        parlayLegsLost: 0,
        totalWagered: BigInt(amount),
        totalWon: BigInt(0),
        profit: BigInt(-amount),
        roi: 0,
        currentStreak: 0,
        longestStreak: 0,
        mostCommonBet: null,
        biggestWin: BigInt(0),
        updatedAt: new Date(),
      },
      update: {
        totalBets: { increment: 1 },
        totalWagered: { increment: BigInt(amount) },
        profit: { decrement: BigInt(amount) },
      },
    });

    // Publish user balance snapshot event for balance-based achievements
    try {
      // Get updated user data with stats
      const userWithStats = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          stats: true,
        },
      });

      if (userWithStats) {
        await eventBus.publish('user:balance:snapshot', {
          key: 'user:balance:snapshot',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `balance:snapshot:${userId}:bet:${bet.id}`,
          payload: {
            balance: Number(userWithStats.muskBucks),
            previousBalance: Number(userWithStats.muskBucks) + amount, // Balance before bet
            changeAmount: -amount,
            changeReason: 'bet_placed',
            betId: bet.id,
            // Include stats for achievements that check net profit, total lost, etc.
            totalWagered: userWithStats.stats ? Number(userWithStats.stats.totalWagered) : amount,
            totalWon: userWithStats.stats ? Number(userWithStats.stats.totalWon) : 0,
            totalLost: userWithStats.stats
              ? Number(userWithStats.stats.totalWagered) - Number(userWithStats.stats.totalWon)
              : amount,
            netProfit: userWithStats.stats ? Number(userWithStats.stats.profit) : -amount,
            totalBets: userWithStats.stats ? userWithStats.stats.totalBets : 1,
            winRate:
              userWithStats.stats && userWithStats.stats.totalBets > 0
                ? userWithStats.stats.betsWon / userWithStats.stats.totalBets
                : 0,
          },
        });
      }
    } catch (achievementError) {
      console.error('[betting] Error publishing balance snapshot event:', achievementError);
      // Don't fail the bet placement if achievement event fails
    }

    return bet;
  }

  async placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: bigint,
    idempotencyKey?: string,
  ): Promise<DbParlay> {
    const legCount = legs.length;

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEBIT',
          subtype: 'PARLAY_WAGER',
          amount: BigInt(amount),
          balanceAfter: user.muskBucks,
          description: `Parlay wager with ${legCount} legs`,
          metadata: {
            legCount,
            legs: legs.map((l) => ({
              predictionId: l.predictionId,
              optionId: l.optionId,
              oddsAtPlacement: l.oddsAtPlacement,
            })),
          },
          relatedBetId: null,
          relatedParlayId: null, // Will be updated after parlay creation
          idempotencyKey: idempotencyKey ? `${idempotencyKey}-debit` : undefined,
        },
      });

      const parlay = await tx.parlay.create({
        data: {
          userId,
          amount: BigInt(amount),
          combinedOdds: legs.reduce((a, l) => a * l.oddsAtPlacement, 1),
          potentialPayout,
          idempotencyKey,
          legs: {
            create: legs.map((l) => ({
              optionId: l.optionId,
              oddsAtPlacement: l.oddsAtPlacement,
            })),
          },
        },
      });

      // upsert stats for parlay
      await tx.userStats.upsert({
        where: { userId },
        create: {
          userId,
          totalBets: 0,
          betsWon: 0,
          betsLost: 0,
          totalParlays: 1,
          parlaysWon: 0,
          parlaysLost: 0,
          totalParlayLegs: legCount,
          parlayLegsWon: 0,
          parlayLegsLost: legCount,
          totalWagered: BigInt(amount),
          totalWon: BigInt(0),
          profit: BigInt(-amount),
          roi: 0,
          currentStreak: 0,
          longestStreak: 0,
          mostCommonBet: null,
          biggestWin: BigInt(0),
          updatedAt: new Date(),
        },
        update: {
          totalParlays: { increment: 1 },
          totalParlayLegs: { increment: legCount },
          totalWagered: { increment: BigInt(amount) },
          profit: { decrement: BigInt(amount) },
        },
      });

      return parlay;
    });
  }

  async recalculateOdds(predictionId: number): Promise<void> {
    // Get prediction details for time-based calculations
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { bets: true },
    });

    if (!prediction) return;

    const pools = await prisma.bet.groupBy({
      by: ['optionId'],
      where: { predictionId },
      _sum: { amount: true },
      _count: true,
    });

    const total = pools.reduce((s, p) => s + Number(p._sum.amount ?? 0), 0);
    const totalBets = pools.reduce((s, p) => s + p._count, 0);

    // 🚀 Special handling for predictions with no bets yet - give them exciting starting odds!
    if (total === 0) {
      const allOptions = await prisma.predictionOption.findMany({
        where: { predictionId },
      });

      // Apply early bird bonus to initial odds (before any bets)
      const updates = allOptions.map(async (option) => {
        let enhancedOdds = option.odds;

        // 🎊 First bet gets MASSIVE early bird bonus!
        const earlyBirdBonus = 2.0; // 100% bonus for the very first bet!
        enhancedOdds = Math.max(option.odds * earlyBirdBonus, 2.0); // Minimum 2.0x

        // 🎯 Cap at reasonable maximum
        const finalOdds = Math.min(enhancedOdds, 12.0);

        return prisma.predictionOption.update({
          where: { id: option.id },
          data: { odds: finalOdds },
        });
      });

      await Promise.all(updates);
      return;
    }

    // 🔥 Calculate market momentum and activity metrics
    const recentActivity = await this.getRecentMarketActivity(predictionId);
    const timeUntilExpiry = prediction.expiresAt.getTime() - Date.now();
    const hoursLeft = timeUntilExpiry / (1000 * 60 * 60);

    const updates = pools.map(async (p) => {
      const optionPool = Number(p._sum.amount ?? 0);
      const optionBets = p._count;
      const baseOdds = total / Math.max(optionPool, 1);

      // 🎯 ENHANCED EXCITEMENT FACTORS (way more aggressive!)

      // 1. 🚀 Early Bird Bonus (first few bets get massive boost!)
      let earlyBirdBonus = 1.0;
      if (totalBets <= 3)
        earlyBirdBonus = 1.5; // 50% bonus!
      else if (totalBets <= 7)
        earlyBirdBonus = 1.3; // 30% bonus
      else if (totalBets <= 15) earlyBirdBonus = 1.15; // 15% bonus

      // 2. 🔥 Hot Market Bonus (rapid betting activity)
      let hotMarketBonus = 1.0;
      if (recentActivity.betsLast10Min >= 5)
        hotMarketBonus = 1.4; // 🔥🔥🔥
      else if (recentActivity.betsLast10Min >= 3)
        hotMarketBonus = 1.25; // 🔥🔥
      else if (recentActivity.betsLast10Min >= 2) hotMarketBonus = 1.15; // 🔥

      // 3. ⏰ Urgency Multiplier (closing soon = higher odds!)
      let urgencyBonus = 1.0;
      if (hoursLeft <= 2)
        urgencyBonus = 1.3; // 30% bonus in final 2 hours!
      else if (hoursLeft <= 6)
        urgencyBonus = 1.2; // 20% bonus in final 6 hours
      else if (hoursLeft <= 24) urgencyBonus = 1.1; // 10% bonus in final day

      // 4. 🎯 Underdog Hero Bonus (way more aggressive)
      let underdogBonus = 1.0;
      const marketShare = optionPool / total;
      if (marketShare < 0.1)
        underdogBonus = 1.8; // 80% bonus for <10% share!
      else if (marketShare < 0.2)
        underdogBonus = 1.5; // 50% bonus for <20% share
      else if (marketShare < 0.3) underdogBonus = 1.25; // 25% bonus for <30% share

      // 5. 💰 High Stakes Bonus (bigger pools get better odds)
      let highStakesBonus = 1.0;
      if (total > 5000)
        highStakesBonus = 1.25; // 25% bonus for 5k+ pools
      else if (total > 2000)
        highStakesBonus = 1.15; // 15% bonus for 2k+ pools
      else if (total > 1000) highStakesBonus = 1.1; // 10% bonus for 1k+ pools

      // 6. 🎮 Betting Frenzy Bonus (lots of individual bets)
      let frenzyBonus = 1.0;
      if (optionBets >= 10)
        frenzyBonus = 1.2; // 20% bonus for 10+ bets on option
      else if (optionBets >= 5) frenzyBonus = 1.1; // 10% bonus for 5+ bets

      // 🎊 COMBINE ALL BONUSES (this is where the magic happens!)
      const enhancedOdds = Math.max(
        baseOdds *
          earlyBirdBonus *
          hotMarketBonus *
          urgencyBonus *
          underdogBonus *
          highStakesBonus *
          frenzyBonus,
        1.1, // Minimum odds floor
      );

      // 🎨 Cap maximum odds to prevent abuse (but keep it exciting!)
      const finalOdds = Math.min(enhancedOdds, 15.0);

      return prisma.predictionOption.update({
        where: { id: p.optionId! },
        data: { odds: finalOdds },
      });
    });

    await Promise.all(updates);
  }

  // 🚀 NEW: Get recent market activity for momentum calculation
  private async getRecentMarketActivity(predictionId: number) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentBets = await prisma.bet.count({
      where: {
        predictionId,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    return {
      betsLast10Min: recentBets,
    };
  }

  // 🎯 NEW: Get current prediction options for odds comparison
  async getPredictionOptions(
    predictionId: number,
  ): Promise<Array<{ id: number; label: string; odds: number }>> {
    return await prisma.predictionOption.findMany({
      where: { predictionId },
      select: { id: true, label: true, odds: true },
      orderBy: { id: 'asc' },
    });
  }

  async getRecentBetsForStreak(
    userId: number,
    limit: number,
  ): Promise<Array<{ status: string; createdAt: Date }>> {
    return await prisma.bet.findMany({
      where: {
        userId,
        status: { in: ['WON', 'LOST'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        status: true,
        createdAt: true,
      },
    });
  }

  async findUserBets(
    userId: number,
    options?: {
      limit?: number;
      createdAfter?: Date;
      createdBefore?: Date;
      status?: string;
      predictionId?: number;
    },
  ): Promise<
    Array<
      DbBet & {
        prediction: {
          id: number;
          title: string;
          category: string;
          resolved: boolean;
        };
        option: {
          id: number;
          label: string;
        };
      }
    >
  > {
    const where: any = { userId };

    // Apply optional filters
    if (options?.createdAfter || options?.createdBefore) {
      where.createdAt = {};
      if (options.createdAfter) {
        where.createdAt.gte = options.createdAfter;
      }
      if (options.createdBefore) {
        where.createdAt.lte = options.createdBefore;
      }
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.predictionId) {
      where.predictionId = options.predictionId;
    }

    const bets = await prisma.bet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      include: {
        prediction: {
          select: {
            id: true,
            title: true,
            category: true,
            resolved: true,
          },
        },
        optionOption: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    // Map the results to match the expected interface
    return bets.map((bet) => ({
      ...bet,
      option: bet.optionOption
        ? {
            id: bet.optionOption.id,
            label: bet.optionOption.label,
          }
        : null,
    })) as Array<
      DbBet & {
        prediction: {
          id: number;
          title: string;
          category: string;
          resolved: boolean;
        };
        option: {
          id: number;
          label: string;
        };
      }
    >;
  }
}
