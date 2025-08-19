import type { PongDifficulty } from '@prisma/client';
import { PongEloService, type EloChangeComponents } from './pongElo.service';
import type { PongStatsData } from '../repositories/IPongRepository';

export interface MatchResult {
  matchId: string;
  winnerId: number;
  loserId?: number;
  winnerScore: number;
  loserScore: number;
  wagerAmount: bigint;
  payoutAmount: bigint;
  aiDifficulty?: PongDifficulty;
  gameDuration?: number;
  winnerPing?: number;
  loserPing?: number;
}

export interface PongStatsUpdate {
  userId: number;
  won: boolean;
  wagerAmount: bigint;
  amountWon: bigint;
  opponentId?: number;
  opponentElo?: number;
  aiDifficulty?: PongDifficulty;
  isPerfectGame: boolean;
  isComeback: boolean;
  gameDuration?: number;
  avgPing?: number;
}

export interface MatchStatsCalculation {
  winnerId: number;
  loserId?: number;
  winnerEloChange: EloChangeComponents;
  loserEloChange?: EloChangeComponents;
  winnerStatsUpdate: PongStatsUpdate & { calculatedFields: Partial<PongStatsData> };
  loserStatsUpdate?: PongStatsUpdate & { calculatedFields: Partial<PongStatsData> };
  matchEloData: {
    player1EloStart: number;
    player2EloStart: number;
    player1EloEnd: number;
    player2EloEnd: number;
    eloChange: number;
    skillComponent: number;
    economyComponent: number;
  };
  socketEvents: {
    winnerElo?: any;
    loserElo?: any;
    winnerTierChange?: any;
    loserTierChange?: any;
  };
}

export class PongStatsService {
  /**
   * Get user Pong stats, creating default stats if they don't exist
   */
  static async getUserStatsWithDefaults(userId: number, repository: any): Promise<any> {
    let stats = await repository.findStatsByUserId(userId);
    if (!stats) {
      // Create default stats using repository
      stats = await repository.createStats({ userId });
    }

    // Calculate enriched metrics
    return this.calculatePlayerStatsMetrics(stats);
  }

  /**
   * Process complete match recording with all business logic
   */
  static async processMatchRecording(
    matchId: string,
    winnerId: number | null,
    loserId: number | null,
    wagerAmount: number,
    payoutAmount: number,
    duration: number,
    isAI: boolean,
    repository: any,
    socketEmitter?: any,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number; socketEvents?: any }> {
    // 1. Get current player stats for calculations
    const [winnerStats, loserStats] = await Promise.all([
      winnerId ? repository.findStatsByUserId(winnerId) : null,
      loserId ? repository.findStatsByUserId(loserId) : null,
    ]);

    // 2. Prepare match data
    const matchData = {
      id: matchId,
      playerOneId: winnerId || loserId || 0,
      playerTwoId: isAI ? undefined : loserId || winnerId || 0,
      winnerId,
      wagerAmount: BigInt(wagerAmount),
      aiDifficulty: isAI ? ('MEDIUM' as const) : undefined,
      playerOneScore: 11, // Assuming standard pong victory
      playerTwoScore: 0, // Will be updated with actual scores later
      startedAt: new Date(Date.now() - duration * 1000),
      completedAt: new Date(),
      status: 'COMPLETED' as const,
      gameDuration: duration,
      playerOnePing: 0,
      playerTwoPing: 0,
    };

    // 3. If no winner but there's a loser, it means they lost (likely to AI)
    if (!winnerId && loserId) {
      return await repository.recordCompleteMatch(matchData);
    }

    // 4. Handle case where there's no winner (player lost to AI)
    if (!winnerId && !loserId) {
      throw new Error('Either winnerId or loserId must be provided');
    }

    // 5. Normal case with a winner - calculate all stats
    const matchResult: MatchResult = {
      matchId,
      winnerId: winnerId!,
      loserId: loserId || undefined,
      winnerScore: 11,
      loserScore: 0,
      wagerAmount: BigInt(wagerAmount),
      payoutAmount: BigInt(payoutAmount),
      aiDifficulty: isAI ? ('MEDIUM' as const) : undefined,
      gameDuration: duration,
    };

    const calculations = this.calculateMatchStats(
      matchResult,
      winnerStats as any,
      loserStats as any,
    );

    // 6. Prepare enhanced match data with Elo calculations
    const enhancedMatchData = {
      ...matchData,
      player1EloStart: winnerStats?.eloRating || PongEloService.getDefaultElo(),
      player2EloStart:
        loserStats?.eloRating ||
        (isAI ? PongEloService.getAiElo('MEDIUM') : PongEloService.getDefaultElo()),
      player1EloEnd: calculations.winnerEloChange.newRating,
      player2EloEnd:
        calculations.loserEloChange?.newRating ||
        loserStats?.eloRating ||
        PongEloService.getDefaultElo(),
      eloChange: Math.abs(calculations.winnerEloChange.totalChange),
      skillComponent: calculations.winnerEloChange.skillChange,
      economyComponent: calculations.winnerEloChange.economyComponent,
    };

    // 7. Prepare winner stats data
    const winnerStatsData = {
      ...calculations.winnerStatsUpdate.calculatedFields,
      eloRating: calculations.winnerEloChange.newRating,
      peakElo: PongEloService.calculatePeakElo(
        winnerStats?.peakElo || PongEloService.getDefaultElo(),
        calculations.winnerEloChange.newRating,
      ),
      tier: calculations.winnerEloChange.newTier,
      lastEloChange: calculations.winnerEloChange.totalChange,
      eloHistory: PongEloService.updateEloHistory(
        (winnerStats?.eloHistory as any[]) || [],
        PongEloService.generateEloHistoryEntry(calculations.winnerEloChange, matchId),
      ),
      ...PongEloService.calculateEloTracking(
        winnerStats?.totalEloGained || 0,
        winnerStats?.totalEloLost || 0,
        calculations.winnerEloChange.totalChange,
      ),
    };

    // 8. Prepare loser stats data (if human opponent)
    let loserStatsData: Partial<PongStatsData> | undefined;
    if (loserId && calculations.loserEloChange && calculations.loserStatsUpdate) {
      loserStatsData = {
        ...calculations.loserStatsUpdate.calculatedFields,
        eloRating: calculations.loserEloChange.newRating,
        peakElo: PongEloService.calculatePeakElo(
          loserStats?.peakElo || PongEloService.getDefaultElo(),
          calculations.loserEloChange.newRating,
        ),
        tier: calculations.loserEloChange.newTier,
        lastEloChange: calculations.loserEloChange.totalChange,
        eloHistory: PongEloService.updateEloHistory(
          (loserStats?.eloHistory as any[]) || [],
          PongEloService.generateEloHistoryEntry(calculations.loserEloChange, matchId),
        ),
        ...PongEloService.calculateEloTracking(
          loserStats?.totalEloGained || 0,
          loserStats?.totalEloLost || 0,
          calculations.loserEloChange.totalChange,
        ),
      };
    }

    // 9. Record the complete match with all data
    const result = await repository.recordCompleteMatch(
      enhancedMatchData,
      winnerStatsData,
      loserStatsData,
      payoutAmount > 0 ? BigInt(payoutAmount) : undefined,
    );

    // 10. Emit socket events if socket emitter is provided
    if (socketEmitter && calculations.socketEvents) {
      if (calculations.socketEvents.winnerElo) {
        await socketEmitter.emitEloUpdate(
          calculations.socketEvents.winnerElo.userId,
          calculations.socketEvents.winnerElo.oldElo,
          calculations.socketEvents.winnerElo.newElo,
          calculations.socketEvents.winnerElo.change,
          calculations.socketEvents.winnerElo.newTier,
          matchId,
        );
      }

      if (calculations.socketEvents.winnerTierChange) {
        await socketEmitter.emitTierChange(
          calculations.socketEvents.winnerTierChange.userId,
          calculations.socketEvents.winnerTierChange.oldTier,
          calculations.socketEvents.winnerTierChange.newTier,
          calculations.socketEvents.winnerTierChange.newElo,
        );
      }

      if (calculations.socketEvents.loserElo) {
        await socketEmitter.emitEloUpdate(
          calculations.socketEvents.loserElo.userId,
          calculations.socketEvents.loserElo.oldElo,
          calculations.socketEvents.loserElo.newElo,
          calculations.socketEvents.loserElo.change,
          calculations.socketEvents.loserElo.newTier,
          matchId,
        );
      }

      if (calculations.socketEvents.loserTierChange) {
        await socketEmitter.emitTierChange(
          calculations.socketEvents.loserTierChange.userId,
          calculations.socketEvents.loserTierChange.oldTier,
          calculations.socketEvents.loserTierChange.newTier,
          calculations.socketEvents.loserTierChange.newElo,
        );
      }
    }

    return {
      ...result,
      socketEvents: calculations.socketEvents,
    };
  }
  /**
   * Calculate comprehensive match statistics for winner and loser
   */
  static calculateMatchStats(
    result: MatchResult,
    winnerStats: PongStatsData | null,
    loserStats: PongStatsData | null,
  ): MatchStatsCalculation {
    const {
      matchId,
      winnerId,
      loserId,
      winnerScore,
      loserScore,
      wagerAmount,
      payoutAmount,
      aiDifficulty,
    } = result;

    const isPerfectGame = loserScore === 0;
    const isComeback = winnerScore === 11 && loserScore >= 5;

    // Get current Elo ratings
    const winnerElo = winnerStats?.eloRating || PongEloService.getDefaultElo();
    const loserElo =
      loserStats?.eloRating ||
      (aiDifficulty ? PongEloService.getAiElo(aiDifficulty) : PongEloService.getDefaultElo());

    // Calculate Elo changes for winner
    const winnerEloChange = PongEloService.calculateEloChange({
      playerElo: winnerElo,
      opponentElo: loserElo,
      playerWon: true,
      wagerAmount,
      amountWon: payoutAmount,
      isAiOpponent: !!aiDifficulty,
      isPerfectGame,
    });

    // Calculate Elo changes for loser (if human opponent)
    let loserEloChange: EloChangeComponents | undefined;
    if (loserId && !aiDifficulty) {
      loserEloChange = PongEloService.calculateEloChange({
        playerElo: loserElo,
        opponentElo: winnerElo,
        playerWon: false,
        wagerAmount,
        amountWon: 0n,
        isAiOpponent: false,
        isPerfectGame: false,
      });
    }

    // Calculate stats updates
    const winnerStatsUpdate = this.calculatePlayerStatsUpdate(
      {
        userId: winnerId,
        won: true,
        wagerAmount,
        amountWon: payoutAmount,
        opponentId: loserId,
        opponentElo: loserElo,
        aiDifficulty,
        isPerfectGame,
        isComeback,
        gameDuration: result.gameDuration,
        avgPing: result.winnerPing,
      },
      winnerStats,
    );

    let loserStatsUpdate:
      | (PongStatsUpdate & { calculatedFields: Partial<PongStatsData> })
      | undefined;
    if (loserId && !aiDifficulty) {
      loserStatsUpdate = this.calculatePlayerStatsUpdate(
        {
          userId: loserId,
          won: false,
          wagerAmount,
          amountWon: 0n,
          opponentId: winnerId,
          opponentElo: winnerElo,
          isPerfectGame: false,
          isComeback: false,
          gameDuration: result.gameDuration,
          avgPing: result.loserPing,
        },
        loserStats,
      );
    }

    // Prepare match Elo data
    const matchEloData = {
      player1EloStart: winnerElo,
      player2EloStart: loserElo,
      player1EloEnd: winnerEloChange.newRating,
      player2EloEnd: loserEloChange?.newRating || loserElo,
      eloChange: Math.abs(winnerEloChange.totalChange),
      skillComponent: winnerEloChange.skillChange,
      economyComponent: winnerEloChange.economyComponent,
    };

    // Prepare socket events data
    const socketEvents = {
      winnerElo: {
        userId: winnerId,
        oldElo: winnerElo,
        newElo: winnerEloChange.newRating,
        change: winnerEloChange.totalChange,
        newTier: winnerEloChange.newTier,
        matchId,
      },
      loserElo: loserEloChange
        ? {
            userId: loserId,
            oldElo: loserElo,
            newElo: loserEloChange.newRating,
            change: loserEloChange.totalChange,
            newTier: loserEloChange.newTier,
            matchId,
          }
        : undefined,
      winnerTierChange:
        (winnerStats?.tier || PongEloService.getDefaultTier()) !== winnerEloChange.newTier
          ? {
              userId: winnerId,
              oldTier: winnerStats?.tier || PongEloService.getDefaultTier(),
              newTier: winnerEloChange.newTier,
              newElo: winnerEloChange.newRating,
            }
          : undefined,
      loserTierChange:
        loserEloChange &&
        (loserStats?.tier || PongEloService.getDefaultTier()) !== loserEloChange.newTier
          ? {
              userId: loserId,
              oldTier: loserStats?.tier || PongEloService.getDefaultTier(),
              newTier: loserEloChange.newTier,
              newElo: loserEloChange.newRating,
            }
          : undefined,
    };

    return {
      winnerId,
      loserId,
      winnerEloChange,
      loserEloChange,
      winnerStatsUpdate,
      loserStatsUpdate,
      matchEloData,
      socketEvents,
    };
  }

  /**
   * Calculate individual player stats update
   */
  static calculatePlayerStatsUpdate(
    update: PongStatsUpdate,
    currentStats: PongStatsData | null,
  ): PongStatsUpdate & { calculatedFields: Partial<PongStatsData> } {
    const {
      userId,
      won,
      wagerAmount,
      amountWon,
      aiDifficulty,
      isPerfectGame,
      isComeback,
      gameDuration,
      avgPing,
    } = update;

    // Use defaults if no current stats exist
    const stats =
      currentStats ||
      ({
        userId,
        eloRating: PongEloService.getDefaultElo(),
        peakElo: PongEloService.getDefaultElo(),
        tier: PongEloService.getDefaultTier(),
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalWagered: 0n,
        totalWon: 0n,
        totalLost: 0n,
        biggestWin: 0n,
        biggestLoss: 0n,
        avgPing: 0,
        avgGameDuration: 0,
        perfectGames: 0,
        comebacks: 0,
        aiWins: 0,
        aiLosses: 0,
        hardestAiBeaten: undefined,
        riskTaker: false,
        highestWagerWin: 0n,
        lastEloChange: 0,
        totalEloGained: 0,
        totalEloLost: 0,
        draws: 0,
      } as PongStatsData);

    // Calculate new streak
    const newWinStreak = won ? stats.winStreak + 1 : 0;
    const newBestWinStreak = Math.max(stats.bestWinStreak, newWinStreak);

    // Update match counts
    const newTotalMatches = stats.totalMatches + 1;
    const newWins = stats.wins + (won ? 1 : 0);
    const newLosses = stats.losses + (won ? 0 : 1);

    // Update economy stats
    const newTotalWagered = stats.totalWagered + wagerAmount;
    const newTotalWon = stats.totalWon + amountWon;
    const newTotalLost = stats.totalLost + (won ? 0n : wagerAmount);
    const newBiggestWin = won
      ? BigInt(Math.max(Number(stats.biggestWin), Number(amountWon)))
      : stats.biggestWin;
    const newBiggestLoss = !won
      ? BigInt(Math.max(Number(stats.biggestLoss), Number(wagerAmount)))
      : stats.biggestLoss;

    // Update performance stats
    const newAvgPing = avgPing
      ? (stats.avgPing * stats.totalMatches + avgPing) / newTotalMatches
      : stats.avgPing;

    const newAvgDuration = gameDuration
      ? Math.round((stats.avgGameDuration * stats.totalMatches + gameDuration) / newTotalMatches)
      : stats.avgGameDuration;

    const newPerfectGames = stats.perfectGames + (isPerfectGame && won ? 1 : 0);
    const newComebacks = stats.comebacks + (isComeback && won ? 1 : 0);

    // Update AI stats
    let newAiWins = stats.aiWins;
    let newAiLosses = stats.aiLosses;
    let newHardestAiBeaten = stats.hardestAiBeaten;

    if (aiDifficulty) {
      if (won) {
        newAiWins++;
        // Update hardest AI beaten
        const difficultyRank = { EASY: 1, MEDIUM: 2, HARD: 3, IMPOSSIBLE: 4 };
        const currentRank = newHardestAiBeaten ? difficultyRank[newHardestAiBeaten] : 0;
        if (difficultyRank[aiDifficulty] > currentRank) {
          newHardestAiBeaten = aiDifficulty;
        }
      } else {
        newAiLosses++;
      }
    }

    // Update highest wager win if applicable
    const newHighestWagerWin =
      won && amountWon > stats.highestWagerWin ? amountWon : stats.highestWagerWin;

    return {
      ...update,
      calculatedFields: {
        totalMatches: newTotalMatches,
        wins: newWins,
        losses: newLosses,
        winStreak: newWinStreak,
        bestWinStreak: newBestWinStreak,
        totalWagered: newTotalWagered,
        totalWon: newTotalWon,
        totalLost: newTotalLost,
        biggestWin: newBiggestWin,
        biggestLoss: newBiggestLoss,
        avgPing: newAvgPing,
        avgGameDuration: newAvgDuration,
        perfectGames: newPerfectGames,
        comebacks: newComebacks,
        aiWins: newAiWins,
        aiLosses: newAiLosses,
        hardestAiBeaten: newHardestAiBeaten,
        highestWagerWin: newHighestWagerWin,
      },
    };
  }

  /**
   * Calculate comprehensive player stats with derived metrics
   */
  static calculatePlayerStatsMetrics(stats: PongStatsData) {
    // Calculate additional metrics
    const winRate = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
    const aiWinRate =
      stats.aiWins + stats.aiLosses > 0
        ? (stats.aiWins / (stats.aiWins + stats.aiLosses)) * 100
        : 0;
    const profit = stats.totalWon - stats.totalWagered;
    const roi = stats.totalWagered > 0n ? (Number(profit) / Number(stats.totalWagered)) * 100 : 0;

    return {
      ...stats,
      winRate: Math.round(winRate * 100) / 100,
      aiWinRate: Math.round(aiWinRate * 100) / 100,
      profit,
      roi: Math.round(roi * 100) / 100,
    };
  }

  /**
   * Calculate leaderboard stats with derived metrics and rankings
   */
  static calculateLeaderboardMetrics(stats: PongStatsData[], offset: number = 0) {
    return stats.map((stat, index) => ({
      ...this.calculatePlayerStatsMetrics(stat),
      rank: offset + index + 1,
    }));
  }

  /**
   * Calculate match history with Elo changes and opponent info
   */
  static calculateMatchHistoryMetrics(matches: any[], userId: number) {
    return matches.map((match) => ({
      ...match,
      playerWon: match.winnerId === userId,
      eloChange:
        match.playerOneId === userId
          ? (match.player1EloEnd || 0) - (match.player1EloStart || 0)
          : (match.player2EloEnd || 0) - (match.player2EloStart || 0),
      opponent: match.playerOneId === userId ? match.playerTwo : match.playerOne,
      isAiMatch: !match.playerTwoId,
    }));
  }

  /**
   * Generate Elo update data for given stats and change
   */
  static generateEloUpdateData(
    userId: number,
    currentElo: number,
    eloChange: EloChangeComponents,
    matchId: string,
  ) {
    return {
      userId,
      oldElo: currentElo,
      newElo: eloChange.newRating,
      change: eloChange.totalChange,
      skillComponent: eloChange.skillChange,
      economyComponent: eloChange.economyComponent,
      newTier: eloChange.newTier,
      matchId,
    };
  }

  /**
   * Calculate if player qualifies as risk taker based on recent wagers
   */
  static calculateRiskTakerStatus(recentWagers: bigint[]): boolean {
    return PongEloService.shouldFlagAsRiskTaker(recentWagers);
  }
}
