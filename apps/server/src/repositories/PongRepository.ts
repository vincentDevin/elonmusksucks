// apps/server/src/repositories/PongRepository.ts

import { PrismaClient } from '@prisma/client';
import type {
  IPongRepository,
  PongStatsData,
  PongMatchData,
  PongStatsWithUser,
  PongMatchWithPlayers,
} from './interfaces/IPongRepository';

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
    const { id, eloHistory, createdAt, updatedAt, ...createData } = data;
    const stats = await prisma.pongStats.create({
      data: {
        userId: data.userId!,
        eloRating: data.eloRating || 1200,
        peakElo: data.peakElo || 1200,
        tier: data.tier || 'SILVER',
        ...createData,
        eloHistory: eloHistory ? (eloHistory as any) : undefined,
      },
    });
    return this.mapPongStats(stats);
  }

  async updateStats(userId: number, data: Partial<PongStatsData>): Promise<void> {
    const { id, eloHistory, createdAt, updatedAt, userId: _userId, ...updateData } = data;
    await prisma.pongStats.update({
      where: { userId },
      data: {
        ...updateData,
        eloHistory: eloHistory ? (eloHistory as any) : undefined,
      },
    });
  }

  async upsertStats(userId: number, data: Partial<PongStatsData>): Promise<PongStatsData> {
    const { id, eloHistory, createdAt, updatedAt, userId: _userId, ...cleanData } = data;
    const stats = await prisma.pongStats.upsert({
      where: { userId },
      create: {
        userId,
        eloRating: data.eloRating || 1200,
        peakElo: data.peakElo || 1200,
        tier: data.tier || 'SILVER',
        ...cleanData,
        eloHistory: eloHistory ? (eloHistory as any) : undefined,
      },
      update: {
        ...cleanData,
        eloHistory: eloHistory ? (eloHistory as any) : undefined,
      },
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

  // Method to set match as ACTIVE with opponent name snapshotting
  async setMatchActive(
    matchId: string,
    hostUserId: number,
    joinerUserId?: number,
    aiUserId?: number,
  ): Promise<void> {
    // Fetch user names for snapshotting
    const [hostUser, joinerUser, aiUser] = await Promise.all([
      hostUserId
        ? prisma.user.findUnique({ where: { id: hostUserId }, select: { name: true } })
        : null,
      joinerUserId
        ? prisma.user.findUnique({ where: { id: joinerUserId }, select: { name: true } })
        : null,
      aiUserId ? prisma.user.findUnique({ where: { id: aiUserId }, select: { name: true } }) : null,
    ]);

    await prisma.pongMatch.update({
      where: { id: matchId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        hostDisplayName: hostUser?.name || null,
        joinerDisplayName: joinerUser?.name || null,
        aiDisplayName: aiUser?.name || 'Elon AI',
      },
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
            profilePictureKey: true,
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
            profilePictureKey: true,
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
            profilePictureKey: true,
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
            profilePictureKey: true,
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
            profilePictureKey: true,
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
            profilePictureKey: true,
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
        OR: [
          { hostUserId: userId },
          { joinerUserId: userId },
          // Fallback to legacy fields for old matches
          { playerOneId: userId },
          { playerTwoId: userId },
        ],
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        // Minimal includes - only what's needed for opponent name resolution
        playerOne: { select: { id: true, name: true, avatarUrl: true } },
        playerTwo: { select: { id: true, name: true, avatarUrl: true } },
        hostUser: { select: { id: true, name: true } },
        joinerUser: { select: { id: true, name: true } },
        aiUser: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
      },
    });

    return matches.map((match) => {
      const mappedMatch = this.mapPongMatch(match);

      // Ultra-simplified opponent resolution using userId < 0 for AI detection
      let opponentName: string;
      let opponentId: number;

      if (match.winnerId === userId) {
        // Current user won, opponent is the loser
        opponentId = match.playerTwoId || 0; // playerTwoId is the loser
        opponentName =
          opponentId < 0
            ? match.aiDisplayName || match.joinerDisplayName || 'Elon AI'
            : match.joinerDisplayName || match.playerTwo?.name || 'Unknown Player';
      } else {
        // Current user lost, opponent is the winner
        opponentId = match.winnerId || match.playerOneId || 0; // winnerId is opponent
        opponentName =
          opponentId < 0
            ? match.aiDisplayName || match.hostDisplayName || 'Elon AI'
            : match.hostDisplayName || match.playerOne?.name || 'Unknown Player';
      }

      // Create opponent object matching expected interface
      const opponent = {
        id: opponentId,
        name: opponentName,
        avatarUrl: null, // Not needed for Pong stats
      };

      return {
        ...mappedMatch,
        playerOne: match.playerOne,
        playerTwo: opponent,
        // Preserve original player names for stats service
        originalPlayerOneName: match.playerOne?.name || match.hostDisplayName,
        originalPlayerTwoName:
          match.playerTwo?.name || match.joinerDisplayName || match.aiDisplayName,
        winner: match.winner || undefined,
      };
    });
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
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number }> {
    console.log(`[PongRepo] recordCompleteMatch called with:`, {
      matchId: matchData.id,
      winnerId: matchData.winnerId,
      playerOneId: matchData.playerOneId,
      playerTwoId: matchData.playerTwoId,
      hostUserId: matchData.hostUserId,
      aiUserId: matchData.aiUserId,
      mode: matchData.mode,
      hasWinnerStats: !!winnerStatsData,
      hasLoserStats: !!loserStatsData,
      loserElo: loserStatsData?.eloRating,
    });

    return await this.executeInTransaction(async (tx) => {
      // 1. Create the match record
      await tx.pongMatch.create({ data: this.preparePongMatchData(matchData) });

      // 2. Determine winner and loser using canonical fields
      const isAIMatch = matchData.mode === 'PVE_AI' || matchData.aiUserId !== undefined;

      // Use the winnerId passed from the game server - it already knows the correct winner
      let actualWinnerId = matchData.winnerId;
      let actualLoserId: number | undefined;

      if (isAIMatch) {
        // In AI matches, we need to properly identify the human and AI
        const humanId = matchData.hostUserId || matchData.playerOneId;
        const aiId = matchData.aiUserId || matchData.playerTwoId;

        // Winner is already determined by game server
        if (actualWinnerId === humanId) {
          // Human won
          actualLoserId = aiId;
        } else {
          // AI won (actualWinnerId is the AI's negative ID)
          actualLoserId = humanId;
        }
      } else {
        // PVP match - use canonical roles
        const hostId = matchData.hostUserId || matchData.playerOneId;
        const joinerId = matchData.joinerUserId || matchData.playerTwoId;

        // Winner is already determined by game server
        if (actualWinnerId === hostId) {
          actualLoserId = joinerId;
        } else if (actualWinnerId === joinerId) {
          actualLoserId = hostId;
        }
      }

      // Handle case where there's no clear winner
      if (!actualWinnerId) {
        throw new Error('Unable to determine match winner');
      }

      // Update match with correct winner ID and Elo data
      await tx.pongMatch.update({
        where: { id: matchData.id },
        data: {
          winnerId: actualWinnerId,
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
      if (winnerStatsData && actualWinnerId && actualWinnerId > 0) {
        const existingWinnerStats = await tx.pongStats.findUnique({
          where: { userId: actualWinnerId },
        });

        if (existingWinnerStats) {
          await tx.pongStats.update({
            where: { userId: actualWinnerId },
            data: winnerStatsData,
          });
        } else {
          await tx.pongStats.create({
            data: {
              userId: actualWinnerId,
              ...winnerStatsData,
            },
          });
        }
      }

      // Update/create loser stats (only for human losers)
      if (actualLoserId && actualLoserId > 0 && loserStatsData) {
        console.log(`[PongRepo] Updating human loser stats for user ${actualLoserId}:`, {
          eloRating: loserStatsData.eloRating,
          lastEloChange: loserStatsData.lastEloChange,
          losses: loserStatsData.losses,
        });

        const existingLoserStats = await tx.pongStats.findUnique({
          where: { userId: actualLoserId },
        });

        if (existingLoserStats) {
          await tx.pongStats.update({
            where: { userId: actualLoserId },
            data: loserStatsData,
          });
          console.log(`[PongRepo] Updated existing stats for loser ${actualLoserId}`);
        } else {
          await tx.pongStats.create({
            data: {
              userId: actualLoserId,
              ...loserStatsData,
            },
          });
          console.log(`[PongRepo] Created new stats for loser ${actualLoserId}`);
        }
      } else {
        console.log(`[PongRepo] NOT updating loser stats:`, {
          actualLoserId,
          hasLoserStatsData: !!loserStatsData,
          isHumanLoser: actualLoserId && actualLoserId > 0,
        });
      }

      // Update AI stats if AI was involved (AI has negative IDs)
      if (isAIMatch && actualWinnerId && actualWinnerId < 0) {
        // AI won - update AI's stats
        const aiStats = await tx.pongStats.findUnique({
          where: { userId: actualWinnerId },
        });

        if (aiStats && winnerStatsData) {
          await tx.pongStats.update({
            where: { userId: actualWinnerId },
            data: winnerStatsData,
          });
        }
      } else if (isAIMatch && actualLoserId && actualLoserId < 0) {
        // AI lost - update AI's stats
        const aiStats = await tx.pongStats.findUnique({
          where: { userId: actualLoserId },
        });

        if (aiStats && loserStatsData) {
          await tx.pongStats.update({
            where: { userId: actualLoserId },
            data: loserStatsData,
          });
        }
      }

      // Payout processing is now handled by the dedicated payout worker
      // The caller should enqueue a payout job after this method completes successfully

      // Link wager transactions to this match for better traceability
      const humanPlayerId1 = matchData.playerOneId > 0 ? matchData.playerOneId : null;
      const humanPlayerId2 =
        matchData.playerTwoId && matchData.playerTwoId > 0 ? matchData.playerTwoId : null;

      if (humanPlayerId1) {
        await tx.transaction.updateMany({
          where: {
            userId: humanPlayerId1,
            type: 'DEBIT',
            subtype: 'PONG_WAGER',
            relatedPongMatchId: null,
            createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 minutes
          },
          data: { relatedPongMatchId: matchData.id },
        });
      }

      if (humanPlayerId2) {
        await tx.transaction.updateMany({
          where: {
            userId: humanPlayerId2,
            type: 'DEBIT',
            subtype: 'PONG_WAGER',
            relatedPongMatchId: null,
            createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 minutes
          },
          data: { relatedPongMatchId: matchData.id },
        });
      }

      return {
        isLossOnly: false,
        winnerId: actualWinnerId,
        loserId: actualLoserId,
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
      // Include canonical fields if provided
      mode: data.mode || (data.aiDifficulty ? 'PVE_AI' : 'PVP'),
      rated: data.rated ?? data.wagerAmount > 0n,
      hostUserId: data.hostUserId || data.playerOneId,
      joinerUserId:
        data.joinerUserId || (data.playerTwoId && data.playerTwoId > 0 ? data.playerTwoId : null),
      aiUserId: data.aiUserId || (data.aiDifficulty ? -1 : null),
      hostDisplayName: data.hostDisplayName || null,
      joinerDisplayName: data.joinerDisplayName || null,
      aiDisplayName: data.aiDisplayName || (data.aiDifficulty ? 'Elon AI' : null),
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
          subtype: 'PONG_WAGER',
          amount: BigInt(-wagerAmount),
          balanceAfter: playerOneUpdate.muskBucks,
          description: `Pong match wager${isAI ? ' vs AI' : ' vs player'}`,
          metadata: {
            wagerAmount,
            isAI,
            playerTwoId,
            matchType: isAI ? 'PVE_AI' : 'PVP',
          },
        },
      });

      if (!isAI && playerTwoId) {
        await tx.transaction.create({
          data: {
            userId: playerTwoId,
            type: 'DEBIT',
            subtype: 'PONG_WAGER',
            amount: BigInt(-wagerAmount),
            balanceAfter: BigInt(0), // Will be updated with actual balance
            description: 'Pong match wager vs player',
            metadata: {
              wagerAmount,
              isAI: false,
              playerOneId,
              matchType: 'PVP',
            },
          },
        });
      }

      return { transactionId: transaction.id };
    });
  }

  async linkTransactionsToMatch(
    matchId: string,
    playerOneId: number,
    playerTwoId?: number | null,
  ): Promise<void> {
    await this.executeInTransaction(async (tx) => {
      // Link player one wager transaction
      await tx.transaction.updateMany({
        where: {
          userId: playerOneId,
          type: 'DEBIT',
          subtype: 'PONG_WAGER',
          relatedPongMatchId: null,
        },
        data: {
          relatedPongMatchId: matchId,
        },
      });

      // Link player two wager transaction if it exists
      if (playerTwoId && playerTwoId > 0) {
        await tx.transaction.updateMany({
          where: {
            userId: playerTwoId,
            type: 'DEBIT',
            subtype: 'PONG_WAGER',
            relatedPongMatchId: null,
          },
          data: {
            relatedPongMatchId: matchId,
          },
        });
      }
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
