// apps/server/src/services/pongStats.service.ts
// -----------------------------------------------------------------------------
// Pong Statistics Service - Idempotent Result Processing
// -----------------------------------------------------------------------------

import type { IdempotencyKey } from '@ems/types';

// Track processed results to prevent duplicates
const processedStats = new Set<IdempotencyKey>();

/**
 * Process pong match statistics with idempotency
 * Returns true if processed, false if duplicate
 */
export function processPongStats(matchId: string, userId: number, _stats: any): boolean {
  const idempotencyKey = `${matchId}|${userId}`;

  if (processedStats.has(idempotencyKey)) {
    console.log(`[pong-stats] Duplicate stats submission ignored: ${idempotencyKey}`);
    return false;
  }

  processedStats.add(idempotencyKey);
  console.log(`[pong-stats] Stats processed for ${idempotencyKey}`);
  return true;
}

// PongDifficulty now handled via 'any' type in shared interfaces
import { PongMatchResult, PongStatsUpdate, EloChangeComponents } from '@ems/types';
import { PongEloService } from './pongElo.service';
import { PureEloService } from './pureElo.service';
import { SYSTEM_AI_USER_ID } from '@ems/types';
import type { PongStatsData } from '../repositories/IPongRepository';

// Note: Pong service interfaces now imported from @ems/types
// MatchResult -> PongMatchResult, other interfaces imported directly

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
  constructor(
    private repository?: any,
    private socketEmitter?: any,
  ) {}

  /**
   * Map AI player ID to difficulty
   */
  private static getAIDifficultyFromId(
    playerId: number | null,
  ): 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE' | undefined {
    if (!playerId || playerId >= 0) return undefined;

    switch (playerId) {
      case -1:
        return 'EASY'; // Grimes' Laptop
      case -2:
        return 'MEDIUM'; // Zuck's Metaverse
      case -3:
        return 'HARD'; // Bezos' Rocket
      case -4:
        return 'IMPOSSIBLE'; // X Æ A-XII
      default:
        return 'MEDIUM';
    }
  }
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
   * Instance method using injected dependencies
   */
  async processMatchRecording(
    matchId: string,
    winnerId: number | null,
    loserId: number | null,
    wagerAmount: number,
    payoutAmount: number,
    duration: number,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number; socketEvents?: any }> {
    const repository = this.repository!;
    const socketEmitter = this.socketEmitter;

    return PongStatsService.processMatchRecording(
      matchId,
      winnerId,
      loserId,
      wagerAmount,
      payoutAmount,
      duration,
      repository,
      socketEmitter,
    );
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
    repository: any,
    socketEmitter?: any,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number; socketEvents?: any }> {
    // Check if AI won (negative winner ID means AI player won)
    const aiWon = winnerId !== null && winnerId < 0;
    const humanPlayerId = aiWon ? loserId : loserId && loserId < 0 ? winnerId : winnerId || loserId;
    const aiPlayerId = aiWon ? winnerId : loserId && loserId < 0 ? loserId : null;

    // 1. Get current player stats for calculations
    const [winnerStats, loserStats] = await Promise.all([
      winnerId ? repository.findStatsByUserId(winnerId) : null,
      loserId ? repository.findStatsByUserId(loserId) : null,
    ]);

    // 2. Prepare match data
    const matchData = {
      id: matchId,
      playerOneId: humanPlayerId || 0,
      playerTwoId: aiPlayerId,
      winnerId,
      wagerAmount: BigInt(wagerAmount),
      aiDifficulty: aiPlayerId ? this.getAIDifficultyFromId(aiPlayerId) : undefined,
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
    const matchResult: PongMatchResult = {
      matchId,
      winnerId: winnerId!,
      loserId: loserId || undefined,
      winnerScore: 11,
      loserScore: 0,
      wagerAmount: BigInt(wagerAmount),
      payoutAmount: BigInt(payoutAmount),
      aiDifficulty: aiPlayerId ? this.getAIDifficultyFromId(aiPlayerId) : undefined,
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
      player1EloStart: aiWon
        ? loserStats?.eloRating || PongEloService.getDefaultElo() // Human player's start Elo
        : winnerStats?.eloRating || PongEloService.getDefaultElo(), // Human winner's start Elo
      player2EloStart: aiWon
        ? PongEloService.getAiElo(this.getAIDifficultyFromId(winnerId) || 'MEDIUM') // AI's Elo
        : loserStats?.eloRating || PongEloService.getDefaultElo(), // Human loser's start Elo
      player1EloEnd: aiWon
        ? calculations.loserEloChange?.newRating || PongEloService.getDefaultElo() // Human loser's end Elo
        : calculations.winnerEloChange.newRating, // Human winner's end Elo
      player2EloEnd: aiWon
        ? PongEloService.getAiElo(this.getAIDifficultyFromId(winnerId) || 'MEDIUM') // AI Elo stays same
        : calculations.loserEloChange?.newRating || PongEloService.getDefaultElo(), // Human loser's end Elo
      eloChange: aiWon
        ? Math.abs(calculations.loserEloChange?.totalChange || 0)
        : Math.abs(calculations.winnerEloChange.totalChange),
      skillComponent: aiWon
        ? calculations.loserEloChange?.skillChange || 0
        : calculations.winnerEloChange.skillChange,
      economyComponent: aiWon
        ? calculations.loserEloChange?.economyComponent || 0
        : calculations.winnerEloChange.economyComponent,
    };

    // 7. Prepare stats data - only for human players
    let winnerStatsData: Partial<PongStatsData> | undefined;
    let loserStatsData: Partial<PongStatsData> | undefined;

    // Prepare winner stats (only if winner is human)
    if (winnerId && winnerId > 0 && calculations.winnerEloChange) {
      winnerStatsData = {
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
    }

    // Prepare loser stats (only if loser is human)
    if (loserId && loserId > 0 && calculations.loserEloChange && calculations.loserStatsUpdate) {
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
    result: PongMatchResult,
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

    // Determine match mode
    const mode = aiDifficulty || loserId === SYSTEM_AI_USER_ID ? 'PVE_AI' : 'PVP';
    const isRated = PureEloService.isRatedMatch(wagerAmount);

    // Get current Elo ratings
    const winnerElo = winnerStats?.eloRating || 1200; // Default starting Elo
    const loserElo =
      loserStats?.eloRating ||
      (aiDifficulty ? PureEloService.getAIEloByDifficulty(aiDifficulty) : 1200);

    // Calculate Elo changes using pure Elo service if match is rated
    let winnerEloChange: EloChangeComponents;
    let loserEloChange: EloChangeComponents | undefined;

    if (isRated) {
      // Use pure Elo calculation for rated matches
      const pureEloResult = PureEloService.calculateEloChange({
        playerElo: winnerElo,
        opponentElo: loserElo,
        won: true,
        mode: mode as 'PVP' | 'PVE_AI',
      });

      // Convert to legacy format for compatibility
      winnerEloChange = {
        skillChange: pureEloResult.delta,
        economyChange: 0, // Pure Elo doesn't have economy component
        economyComponent: 0,
        totalChange: pureEloResult.delta,
        newRating: pureEloResult.newRating,
        newTier: PureEloService.getTier(pureEloResult.newRating),
      };

      // Calculate loser changes if human loser
      if (loserId && loserId > 0) {
        loserEloChange = {
          skillChange: pureEloResult.opponentDelta,
          economyChange: 0,
          economyComponent: 0,
          totalChange: pureEloResult.opponentDelta,
          newRating: pureEloResult.opponentNewRating,
          newTier: PureEloService.getTier(pureEloResult.opponentNewRating),
        };
      }
    } else {
      // Unrated matches - no Elo change
      winnerEloChange = {
        skillChange: 0,
        economyChange: 0,
        economyComponent: 0,
        totalChange: 0,
        newRating: winnerElo,
        newTier: PureEloService.getTier(winnerElo),
      };

      if (loserId && loserId > 0) {
        loserEloChange = {
          skillChange: 0,
          economyChange: 0,
          economyComponent: 0,
          totalChange: 0,
          newRating: loserElo,
          newTier: PureEloService.getTier(loserElo),
        };
      }
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
    if (loserId && loserId > 0) {
      // Human loser (positive ID)
      loserStatsUpdate = this.calculatePlayerStatsUpdate(
        {
          userId: loserId,
          won: false,
          wagerAmount,
          amountWon: 0n,
          opponentId: winnerId,
          opponentElo: winnerElo,
          aiDifficulty, // Include AI difficulty for proper stat tracking
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

    // Prepare socket events data - only for human players
    const socketEvents = {
      winnerElo:
        winnerId && winnerId > 0 // Only emit for human winners
          ? {
              userId: winnerId,
              oldElo: winnerElo,
              newElo: winnerEloChange.newRating,
              change: winnerEloChange.totalChange,
              newTier: winnerEloChange.newTier,
              matchId,
            }
          : undefined,
      loserElo:
        loserEloChange && loserId && loserId > 0 // Only emit for human losers
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
        winnerId &&
        winnerId > 0 && // Only for human winners
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
        loserId &&
        loserId > 0 && // Only for human losers
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
        const currentRank = newHardestAiBeaten
          ? difficultyRank[newHardestAiBeaten as keyof typeof difficultyRank]
          : 0;
        if (difficultyRank[aiDifficulty as keyof typeof difficultyRank] > currentRank) {
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

  /**
   * Process wager transaction for pong match
   */
  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
    isAI: boolean,
  ): Promise<{ transactionId: string }> {
    return await this.repository.processWagerTransaction(
      playerOneId,
      playerTwoId,
      wagerAmount,
      isAI,
    );
  }

  async validateWager(userId: number): Promise<{ muskBucks: bigint } | null> {
    return await this.repository.validateWager(userId);
  }

  async healthCheck(): Promise<void> {
    return await this.repository.healthCheck();
  }
}
