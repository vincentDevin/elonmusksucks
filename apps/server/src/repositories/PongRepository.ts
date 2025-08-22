// apps/server/src/repositories/PongRepository.ts

import { PrismaClient } from '@prisma/client';
import type {
  IPongRepository,
  PongStatsData,
  PongMatchData,
  PongStatsWithUser,
  PongMatchWithPlayers,
} from './IPongRepository';

const prisma = new PrismaClient();

export class PongRepository implements IPongRepository {
  // PongStats operations
  async findStatsByUserId(userId: number): Promise<PongStatsData | null> {
    const stats = await prisma.pongStats.findUnique({
      where: { userId },
    });
    return stats ? this.mapPongStats(stats) : null;
  }

  async createStats(data: Partial<PongStatsData>): Promise<PongStatsData> {
    const stats = await prisma.pongStats.create({
      data: {
        userId: data.userId!,
        eloRating: data.eloRating || 1200,
        peakElo: data.peakElo || 1200,
        tier: data.tier || 'SILVER',
        ...data,
      },
    });
    return this.mapPongStats(stats);
  }

  async updateStats(userId: number, data: Partial<PongStatsData>): Promise<void> {
    await prisma.pongStats.update({
      where: { userId },
      data,
    });
  }

  async upsertStats(userId: number, data: Partial<PongStatsData>): Promise<PongStatsData> {
    const stats = await prisma.pongStats.upsert({
      where: { userId },
      create: {
        userId,
        eloRating: data.eloRating || 1200,
        peakElo: data.peakElo || 1200,
        tier: data.tier || 'SILVER',
        ...data,
      },
      update: data,
    });
    return this.mapPongStats(stats);
  }

  // PongMatch operations
  async findMatchById(matchId: string): Promise<PongMatchData | null> {
    const match = await prisma.pongMatch.findUnique({
      where: { id: matchId },
    });
    return match ? this.mapPongMatch(match) : null;
  }

  async createMatch(data: PongMatchData): Promise<PongMatchData> {
    const match = await prisma.pongMatch.create({
      data: {
        id: data.id,
        playerOneId: data.playerOneId,
        playerTwoId: data.playerTwoId || null,
        winnerId: data.winnerId || null,
        wagerAmount: data.wagerAmount,
        aiDifficulty: data.aiDifficulty || null,
        playerOneScore: data.playerOneScore,
        playerTwoScore: data.playerTwoScore,
        status: data.status,
        startedAt: data.startedAt || null,
        completedAt: data.completedAt || null,
        gameDuration: data.gameDuration || null,
        playerOnePing: data.playerOnePing,
        playerTwoPing: data.playerTwoPing,
        player1EloStart: data.player1EloStart || null,
        player2EloStart: data.player2EloStart || null,
        player1EloEnd: data.player1EloEnd || null,
        player2EloEnd: data.player2EloEnd || null,
        eloChange: data.eloChange || null,
        skillComponent: data.skillComponent || null,
        economyComponent: data.economyComponent || null,
      },
    });
    return this.mapPongMatch(match);
  }

  async updateMatch(matchId: string, data: Partial<PongMatchData>): Promise<void> {
    await prisma.pongMatch.update({
      where: { id: matchId },
      data,
    });
  }

  // Leaderboard operations
  async getEloLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { eloRating: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  async getWinsLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { wins: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  async getWagerLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { totalWagered: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  async getWinStreakLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { winStreak: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  async getTotalWonLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { totalWon: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  async getPerfectGamesLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]> {
    const stats = await prisma.pongStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { perfectGames: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stats.map((stat) => ({
      ...this.mapPongStats(stat),
      user: stat.user,
    }));
  }

  // Statistics operations
  async getTierDistribution(): Promise<{ [tier: string]: number }> {
    const counts = await prisma.pongStats.groupBy({
      by: ['tier'],
      _count: {
        tier: true,
      },
    });

    const distribution: { [key: string]: number } = {};
    counts.forEach((item) => {
      distribution[item.tier] = item._count.tier;
    });

    return distribution;
  }

  async getPlayerMatchHistory(userId: number, limit: number): Promise<PongMatchWithPlayers[]> {
    const matches = await prisma.pongMatch.findMany({
      where: {
        OR: [{ playerOneId: userId }, { playerTwoId: userId }],
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        playerOne: {
          select: { id: true, name: true, avatarUrl: true },
        },
        playerTwo: {
          select: { id: true, name: true, avatarUrl: true },
        },
        winner: {
          select: { id: true, name: true },
        },
      },
    });

    return matches.map((match) => ({
      ...this.mapPongMatch(match),
      playerOne: match.playerOne,
      playerTwo: match.playerTwo || undefined,
      winner: match.winner || undefined,
    }));
  }

  async getRecentMatches(userId: number, limit: number): Promise<PongMatchData[]> {
    const matches = await prisma.pongMatch.findMany({
      where: {
        OR: [{ playerOneId: userId }, { playerTwoId: userId }],
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return matches.map((match) => this.mapPongMatch(match));
  }

  // User operations
  async findUserBalance(userId: number): Promise<{ muskBucks: bigint } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { muskBucks: true },
    });
    return user ? { muskBucks: user.muskBucks } : null;
  }

  async updateUserBalance(userId: number, amount: bigint): Promise<{ muskBucks: bigint }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { muskBucks: { increment: amount } },
      select: { muskBucks: true },
    });
    return { muskBucks: user.muskBucks };
  }

  async createTransaction(
    userId: number,
    type: 'CREDIT' | 'DEBIT',
    amount: bigint,
    balanceAfter: bigint,
  ): Promise<void> {
    await prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        balanceAfter,
      },
    });
  }

  // Complex match operations
  async recordCompleteMatch(
    matchData: PongMatchData,
    winnerStatsData?: Partial<PongStatsData>,
    loserStatsData?: Partial<PongStatsData>,
    payoutAmount?: bigint,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number }> {
    return await this.executeInTransaction(async (tx) => {
      // 1. Create the match record
      await tx.pongMatch.create({ data: this.preparePongMatchData(matchData) });

      // 2. Handle case where there's no winner (player lost to AI)
      if (!matchData.winnerId && !matchData.playerTwoId) {
        throw new Error('Either winnerId or loserId must be provided');
      }

      // If no winner but there's a loser, it means they lost (likely to AI)
      if (!matchData.winnerId && matchData.playerTwoId) {
        return { isLossOnly: true, loserId: matchData.playerTwoId };
      }

      // Determine the human loser ID (could be playerOneId or playerTwoId)
      const humanLoserId =
        matchData.winnerId && matchData.winnerId < 0
          ? matchData.playerOneId // AI won, human is playerOne
          : matchData.playerTwoId; // Human won, loser is playerTwo (could be AI or human)

      // Normal case with a winner - update match with Elo data
      if (matchData.winnerId) {
        await tx.pongMatch.update({
          where: { id: matchData.id },
          data: {
            player1EloStart: matchData.player1EloStart,
            player2EloStart: matchData.player2EloStart,
            player1EloEnd: matchData.player1EloEnd,
            player2EloEnd: matchData.player2EloEnd,
            eloChange: matchData.eloChange,
            skillComponent: matchData.skillComponent,
            economyComponent: matchData.economyComponent,
          },
        });

        // Update/create winner stats (only for human winners)
        if (winnerStatsData && matchData.winnerId && matchData.winnerId > 0) {
          const existingWinnerStats = await tx.pongStats.findUnique({
            where: { userId: matchData.winnerId },
          });

          if (existingWinnerStats) {
            await tx.pongStats.update({
              where: { userId: matchData.winnerId },
              data: winnerStatsData,
            });
          } else {
            await tx.pongStats.create({
              data: {
                userId: matchData.winnerId,
                ...winnerStatsData,
              },
            });
          }
        }

        // Update/create loser stats (only for human losers)
        if (humanLoserId && humanLoserId > 0 && loserStatsData) {
          const existingLoserStats = await tx.pongStats.findUnique({
            where: { userId: humanLoserId },
          });

          if (existingLoserStats) {
            await tx.pongStats.update({
              where: { userId: humanLoserId },
              data: loserStatsData,
            });
          } else {
            await tx.pongStats.create({
              data: {
                userId: humanLoserId,
                ...loserStatsData,
              },
            });
          }
        }

        // Process payout if there's a winner and payout amount (only for human winners)
        if (payoutAmount && payoutAmount > 0n && matchData.winnerId && matchData.winnerId > 0) {
          const winnerUpdate = await tx.user.update({
            where: { id: matchData.winnerId },
            data: { muskBucks: { increment: payoutAmount } },
            select: { muskBucks: true },
          });

          // Create payout transaction
          await tx.transaction.create({
            data: {
              userId: matchData.winnerId,
              type: 'CREDIT',
              amount: payoutAmount,
              balanceAfter: winnerUpdate.muskBucks,
            },
          });
        }
      }

      return {
        isLossOnly: false,
        winnerId: matchData.winnerId,
        loserId: humanLoserId,
      };
    });
  }

  // Utility operations
  async executeInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await prisma.$transaction(callback);
  }

  // Helper method to prepare match data for Prisma
  private preparePongMatchData(data: PongMatchData) {
    return {
      id: data.id,
      playerOneId: data.playerOneId,
      playerTwoId: data.playerTwoId || null,
      winnerId: data.winnerId || null,
      wagerAmount: data.wagerAmount,
      aiDifficulty: data.aiDifficulty || null,
      playerOneScore: data.playerOneScore,
      playerTwoScore: data.playerTwoScore,
      status: data.status,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      gameDuration: data.gameDuration || null,
      playerOnePing: data.playerOnePing,
      playerTwoPing: data.playerTwoPing,
      player1EloStart: data.player1EloStart || null,
      player2EloStart: data.player2EloStart || null,
      player1EloEnd: data.player1EloEnd || null,
      player2EloEnd: data.player2EloEnd || null,
      eloChange: data.eloChange || null,
      skillComponent: data.skillComponent || null,
      economyComponent: data.economyComponent || null,
    };
  }

  // Private mapping methods
  private mapPongStats(stats: any): PongStatsData {
    return {
      id: stats.id,
      userId: stats.userId,
      eloRating: stats.eloRating,
      peakElo: stats.peakElo,
      eloHistory: stats.eloHistory,
      tier: stats.tier,
      lastEloChange: stats.lastEloChange,
      totalEloGained: stats.totalEloGained,
      totalEloLost: stats.totalEloLost,
      highestWagerWin: stats.highestWagerWin,
      riskTaker: stats.riskTaker,
      totalMatches: stats.totalMatches,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winStreak: stats.winStreak,
      bestWinStreak: stats.bestWinStreak,
      totalWagered: stats.totalWagered,
      totalWon: stats.totalWon,
      totalLost: stats.totalLost,
      biggestWin: stats.biggestWin,
      biggestLoss: stats.biggestLoss,
      avgPing: stats.avgPing,
      avgGameDuration: stats.avgGameDuration,
      perfectGames: stats.perfectGames,
      comebacks: stats.comebacks,
      aiWins: stats.aiWins,
      aiLosses: stats.aiLosses,
      hardestAiBeaten: stats.hardestAiBeaten,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt,
    };
  }

  private mapPongMatch(match: any): PongMatchData {
    return {
      id: match.id,
      playerOneId: match.playerOneId,
      playerTwoId: match.playerTwoId,
      winnerId: match.winnerId,
      wagerAmount: match.wagerAmount,
      aiDifficulty: match.aiDifficulty,
      playerOneScore: match.playerOneScore,
      playerTwoScore: match.playerTwoScore,
      status: match.status,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      gameDuration: match.gameDuration,
      playerOnePing: match.playerOnePing,
      playerTwoPing: match.playerTwoPing,
      player1EloStart: match.player1EloStart,
      player2EloStart: match.player2EloStart,
      player1EloEnd: match.player1EloEnd,
      player2EloEnd: match.player2EloEnd,
      eloChange: match.eloChange,
      skillComponent: match.skillComponent,
      economyComponent: match.economyComponent,
    };
  }

  async findUserForAuth(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, muskBucks: true },
    });
  }

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
    isAI: boolean,
  ): Promise<{ transactionId: string }> {
    return await this.executeInTransaction(async (tx) => {
      // Deduct from player one
      const playerOneUpdate = await tx.user.update({
        where: { id: playerOneId },
        data: { muskBucks: { decrement: BigInt(wagerAmount) } },
        select: { muskBucks: true },
      });

      if (playerOneUpdate.muskBucks < 0) {
        throw new Error('Insufficient funds for player one');
      }

      // Deduct from player two if not AI
      if (!isAI && playerTwoId) {
        const playerTwoUpdate = await tx.user.update({
          where: { id: playerTwoId },
          data: { muskBucks: { decrement: BigInt(wagerAmount) } },
          select: { muskBucks: true },
        });

        if (playerTwoUpdate.muskBucks < 0) {
          throw new Error('Insufficient funds for player two');
        }
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: playerOneId,
          type: 'DEBIT',
          amount: BigInt(-wagerAmount),
          balanceAfter: playerOneUpdate.muskBucks,
        },
      });

      if (!isAI && playerTwoId) {
        await tx.transaction.create({
          data: {
            userId: playerTwoId,
            type: 'DEBIT',
            amount: BigInt(-wagerAmount),
            balanceAfter: BigInt(0), // Will be updated with actual balance
          },
        });
      }

      return { transactionId: transaction.id };
    });
  }

  async validateWager(userId: number): Promise<{ muskBucks: bigint } | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { muskBucks: true },
    });
  }

  async healthCheck(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }
}
