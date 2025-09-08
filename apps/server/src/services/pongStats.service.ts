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
import { PongMatchResult, PongStatsUpdate, EloChangeComponents, PongPayoutData } from '@ems/types';
import { PongEloService } from './pongElo.service';
import { PureEloService } from './pureElo.service';
import { SYSTEM_AI_USER_ID } from '@ems/types';
import type { PongStatsData } from '../repositories/interfaces/IPongRepository';
import { pongPayoutQueueService } from './pongPayoutQueue.service';
import { eventBus } from './eventBus.service';
import { streakManager } from './streakManager.service';
import { eventCorrelator } from './eventCorrelator.service';

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
    winnerName: string,
    loserName: string | null,
    isAI: boolean,
    winnerScore?: number,
    loserScore?: number,
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
      winnerName,
      loserName,
      repository,
      socketEmitter,
      isAI,
      winnerScore,
      loserScore,
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
    winnerName: string,
    loserName: string | null,
    repository: any,
    socketEmitter?: any,
    isAI?: boolean,
    winnerScore?: number,
    loserScore?: number,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number; socketEvents?: any }> {
    // Simple AI detection: userId < 0 means AI
    const winnerIsAI = winnerId !== null && winnerId < 0;
    const loserIsAI = loserId !== null && loserId < 0;
    const isAIMatch = isAI || winnerIsAI || loserIsAI;

    console.log(`[PongStats] Processing match ${matchId}:`, {
      winnerId,
      winnerName,
      loserId,
      loserName,
      isAIMatch,
      winnerIsAI,
      loserIsAI,
    });

    // 1. Get current player stats for calculations - only for human players
    const [winnerStats, loserStats] = await Promise.all([
      winnerId && winnerId > 0 ? repository.findStatsByUserId(winnerId) : null,
      loserId && loserId > 0 ? repository.findStatsByUserId(loserId) : null,
    ]);

    // 2. Prepare simplified match data
    // Determine the actual AI player ID and human player ID
    const aiPlayerId = winnerIsAI ? winnerId : loserIsAI ? loserId : null;
    const humanPlayerId = winnerIsAI ? loserId : loserIsAI ? winnerId : winnerId || loserId;

    // For AI matches, ensure human is always playerOne (host) for consistency
    const matchData = {
      id: matchId,
      playerOneId: isAIMatch && humanPlayerId ? humanPlayerId : winnerId || 0,
      playerTwoId: isAIMatch && aiPlayerId ? aiPlayerId : loserId || null,
      winnerId,
      wagerAmount: BigInt(wagerAmount),
      mode: isAIMatch ? 'PVE_AI' : 'PVP',
      aiDifficulty: isAIMatch ? this.getAIDifficultyFromId(aiPlayerId) : undefined,
      playerOneScore: isAIMatch && humanPlayerId === loserId ? loserScore : winnerScore || 5,
      playerTwoScore: isAIMatch && aiPlayerId === winnerId ? winnerScore : loserScore || 0,
      startedAt: new Date(Date.now() - duration * 1000),
      completedAt: new Date(),
      status: 'COMPLETED' as const,
      gameDuration: duration,
      playerOnePing: 0,
      playerTwoPing: 0,
      // Set proper canonical fields for AI matches
      hostUserId: isAIMatch && humanPlayerId ? humanPlayerId : undefined,
      aiUserId: aiPlayerId || undefined,
      // Store the names we received directly
      hostDisplayName:
        isAIMatch && humanPlayerId === winnerId
          ? winnerName
          : humanPlayerId === loserId
            ? loserName
            : winnerName,
      joinerDisplayName: !isAIMatch ? loserName : null,
      aiDisplayName: isAIMatch ? (aiPlayerId === winnerId ? winnerName : loserName) : null,
    };

    // 3. If no winner but there's a loser, it means they lost (likely to AI)
    if (!winnerId && loserId) {
      return await repository.recordCompleteMatch(matchData);
    }

    // 4. Handle case where there's no winner (player lost to AI)
    if (!winnerId && !loserId) {
      throw new Error('Either winnerId or loserId must be provided');
    }

    // 5. Handle case where there's no winner (forfeit, etc.)
    if (!winnerId) {
      return await repository.recordCompleteMatch(matchData);
    }

    // 6. Normal case with a winner - calculate stats for human players only
    let calculations: MatchStatsCalculation | null = null;

    // Only calculate stats if at least one human is involved
    if (winnerId > 0 || (loserId && loserId > 0)) {
      const matchResult: PongMatchResult = {
        matchId,
        winnerId: winnerId!,
        loserId: loserId || undefined,
        winnerScore: winnerScore || 5, // Use actual winner score
        loserScore: loserScore || 0, // Use actual loser score
        wagerAmount: BigInt(wagerAmount),
        payoutAmount: BigInt(payoutAmount),
        aiDifficulty: isAIMatch
          ? this.getAIDifficultyFromId(winnerId < 0 ? winnerId : loserId)
          : undefined,
        gameDuration: duration,
      };

      calculations = this.calculateMatchStats(matchResult, winnerStats as any, loserStats as any);
    }

    // 7. Prepare enhanced match data with Elo calculations
    // Handle AI ELO ratings properly based on who is AI
    const getStartElo = (playerId: number | null, stats: any) => {
      if (!playerId) return PongEloService.getDefaultElo();
      if (playerId < 0) {
        // AI player - get AI ELO based on difficulty
        const aiDiff = this.getAIDifficultyFromId(playerId);
        return PongEloService.getAiElo(aiDiff || 'MEDIUM');
      }
      // Human player
      return stats?.eloRating || PongEloService.getDefaultElo();
    };

    const enhancedMatchData = {
      ...matchData,
      player1EloStart: getStartElo(winnerId, winnerStats),
      player2EloStart: getStartElo(loserId, loserStats),
      player1EloEnd: calculations?.winnerEloChange?.newRating || getStartElo(winnerId, winnerStats),
      player2EloEnd: calculations?.loserEloChange?.newRating || getStartElo(loserId, loserStats),
      eloChange: Math.abs(
        calculations?.winnerEloChange?.totalChange ||
          calculations?.loserEloChange?.totalChange ||
          0,
      ),
      skillComponent:
        calculations?.winnerEloChange?.skillChange ||
        calculations?.loserEloChange?.skillChange ||
        0,
      economyComponent:
        calculations?.winnerEloChange?.economyComponent ||
        calculations?.loserEloChange?.economyComponent ||
        0,
    };

    // 8. Prepare stats data - only for human players
    let winnerStatsData: Partial<PongStatsData> | undefined;
    let loserStatsData: Partial<PongStatsData> | undefined;

    // Prepare winner stats (only if winner is human and we calculated stats)
    if (winnerId && winnerId > 0 && calculations?.winnerEloChange) {
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

    // Prepare loser stats (only if loser is human and we calculated stats)
    if (loserId && loserId > 0 && calculations?.loserEloChange && calculations?.loserStatsUpdate) {
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
    console.log(`[PongStats] Recording match with data:`, {
      matchId,
      winnerId,
      loserId,
      winnerIsAI,
      loserIsAI,
      hasWinnerStats: !!winnerStatsData,
      hasLoserStats: !!loserStatsData,
      loserEloChange: loserStatsData?.eloRating,
      loserEloChangeAmount: loserStatsData?.lastEloChange,
    });

    const result = await repository.recordCompleteMatch(
      enhancedMatchData,
      winnerStatsData,
      loserStatsData,
    );

    // 9.1. Process streak tracking and special achievements for human players
    try {
      if (winnerId && winnerId > 0) {
        // Update pong win streak
        await streakManager.updateStreak(winnerId, 'pong_win', true, {
          matchId,
          opponent: loserName || 'AI',
          isAI: isAIMatch,
          score: `${winnerScore}-${loserScore}`,
          wager: wagerAmount,
        });

        // Check for comeback achievement (win from 0-4 deficit)
        if (loserScore && winnerScore && loserScore >= 4 && winnerScore === 5) {
          await eventCorrelator.detectComplexScenario(winnerId, 'pong_comeback');
        }

        // Add activity log for time-based tracking
        await eventBus.publish('user:activity:log', {
          userId: winnerId,
          activityType: 'pong_match_won',
          metadata: {
            matchId,
            opponent: loserName || 'AI',
            isAI: isAIMatch,
            score: `${winnerScore}-${loserScore}`,
            duration,
            wager: wagerAmount,
            timestamp: new Date().toISOString(),
          },
          occurredAt: new Date().toISOString(),
          dateKey: new Date().toISOString().split('T')[0],
          idempotencyKey: `activity:pong:won:${matchId}:${winnerId}`,
        });
      }

      if (loserId && loserId > 0) {
        // Update pong loss streak (break win streak)
        await streakManager.updateStreak(loserId, 'pong_win', false, {
          matchId,
          opponent: winnerName,
          isAI: isAIMatch,
          score: `${loserScore}-${winnerScore}`,
          wager: wagerAmount,
        });

        // Add activity log for loser
        await eventBus.publish('user:activity:log', {
          userId: loserId,
          activityType: 'pong_match_lost',
          metadata: {
            matchId,
            opponent: winnerName,
            isAI: isAIMatch,
            score: `${loserScore}-${winnerScore}`,
            duration,
            wager: wagerAmount,
            timestamp: new Date().toISOString(),
          },
          occurredAt: new Date().toISOString(),
          dateKey: new Date().toISOString().split('T')[0],
          idempotencyKey: `activity:pong:lost:${matchId}:${loserId}`,
        });
      }
    } catch (streakError) {
      console.error(`[PongStats] Error processing streaks for match ${matchId}:`, streakError);
      // Don't fail the match processing if streak tracking fails
    }

    // 10. Enqueue payout if there's a human winner and wager amount > 0
    if (winnerId && winnerId > 0 && wagerAmount > 0) {
      const payoutData: PongPayoutData = {
        matchId,
        winnerId,
        mode: isAIMatch ? 'PVE_AI' : 'PVP',
        stakeAmount: wagerAmount, // Keep as number for JSON serialization
      };

      try {
        await pongPayoutQueueService.enqueuePayout(payoutData);
        console.log(
          `[PongStats] Payout enqueued for match ${matchId}, human winner ${winnerId} (${winnerName})`,
        );
      } catch (error) {
        console.error(`[PongStats] Failed to enqueue payout for match ${matchId}:`, error);
      }
    } else if (winnerId && winnerId < 0) {
      console.log(`[PongStats] AI winner ${winnerId} (${winnerName}) - no payout needed`);
    }

    // 12. Emit socket events if socket emitter is provided and we calculated stats
    if (socketEmitter && calculations?.socketEvents) {
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

    // 13. Emit achievement events for winner
    if (winnerId && winnerId > 0) {
      try {
        // Determine comeback and defensive win flags
        const comeback = loserScore && winnerScore && loserScore >= 4 && winnerScore === 5;
        const defensiveWin = duration && duration > 300000; // 5+ minute games are defensive
        const ragequit = false; // Would need to track disconnections

        const achievementPayload = {
          key: 'pong:match:completed',
          userId: winnerId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `pong:match:completed:${winnerId}:${matchId}`,
          payload: {
            // Direct properties in payload, not wrapped in 'data'
            winnerId,
            loserId,
            matchId,
            vsAI: isAIMatch,
            aiDifficulty: isAIMatch ? PongStatsService.getAIDifficultyFromId(loserId) : undefined,
            wager: wagerAmount, // Keep as BigInt - let rule evaluation handle conversion
            winnerScore: winnerScore || 5, // Pong games go to 5, not 11
            loserScore: loserScore || 0,
            duration: duration || 0,
            comeback: comeback || false,
            defensiveWin: defensiveWin || false,
            ragequit: ragequit || false,
            eloChange: calculations?.winnerEloChange?.totalChange,
            newElo: calculations?.winnerEloChange?.newRating,
          },
        };

        await eventBus.publish('pong:match:completed', achievementPayload);
        console.log(`[PongStats] Achievement event emitted for winner ${winnerId}`);
      } catch (error) {
        console.error(`[PongStats] Failed to emit achievement event for winner:`, error);
      }
    }

    // 14. Emit achievement events for loser (for loss tracking/shame achievements)
    if (loserId && loserId > 0) {
      try {
        const ragequit = false; // Would need to track disconnections

        const loserPayload = {
          key: 'pong:match:lost',
          userId: loserId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `pong:match:lost:${loserId}:${matchId}`,
          payload: {
            // Direct properties in payload, not wrapped in 'data'
            winnerId,
            loserId,
            matchId,
            vsAI: isAIMatch,
            aiDifficulty: isAIMatch ? PongStatsService.getAIDifficultyFromId(winnerId) : undefined,
            wager: wagerAmount, // Keep as BigInt - let rule evaluation handle conversion
            winnerScore: winnerScore || 5, // Pong games go to 5, not 11
            loserScore: loserScore || 0,
            duration: duration || 0,
            ragequit: ragequit || false,
            eloChange: calculations?.loserEloChange?.totalChange,
            newElo: calculations?.loserEloChange?.newRating,
          },
        };

        await eventBus.publish('pong:match:lost', loserPayload);
        console.log(`[PongStats] Achievement event emitted for loser ${loserId}`);
      } catch (error) {
        console.error(`[PongStats] Failed to emit achievement event for loser:`, error);
      }
    }

    // 15. Emit ELO milestone events for winner
    if (winnerId && winnerId > 0 && calculations?.winnerEloChange?.newRating) {
      try {
        const newElo = calculations.winnerEloChange.newRating;
        const oldElo = winnerStats?.eloRating || PongEloService.getDefaultElo();
        const milestones = [1400, 1800, 2200, 2600, 3000];

        for (const milestone of milestones) {
          if (oldElo < milestone && newElo >= milestone) {
            const milestonePayload = {
              key: 'pong:elo:milestone',
              userId: winnerId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `pong:elo:milestone:${winnerId}:${milestone}:${matchId}`,
              payload: {
                // Direct properties in payload, not wrapped in 'data'
                milestone,
                newElo,
                oldElo,
                matchId,
                userId: winnerId,
              },
            };

            await eventBus.publish('pong:elo:milestone', milestonePayload);
            console.log(`[PongStats] ELO milestone ${milestone} achieved by user ${winnerId}`);
          }
        }
      } catch (error) {
        console.error(`[PongStats] Failed to emit ELO milestone events:`, error);
      }
    }

    return {
      ...result,
      socketEvents: calculations?.socketEvents,
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
    const isComeback = winnerScore === 5 && loserScore >= 3;

    // Determine match mode
    const mode = aiDifficulty || loserId === SYSTEM_AI_USER_ID ? 'PVE_AI' : 'PVP';
    const isRated = PureEloService.isRatedMatch(wagerAmount);

    // Get current Elo ratings
    // If winner is AI (negative ID), use AI ELO; otherwise use human stats or default
    const winnerElo =
      winnerId < 0 ? PongEloService.getAiElo(aiDifficulty as any) : winnerStats?.eloRating || 1200;

    // If loser is AI (negative ID), use AI ELO; otherwise use human stats or default
    const loserElo =
      loserId && loserId < 0
        ? PongEloService.getAiElo(aiDifficulty as any)
        : loserStats?.eloRating || 1200;

    // Calculate Elo changes using pure Elo service if match is rated
    let winnerEloChange: EloChangeComponents;
    let loserEloChange: EloChangeComponents | undefined;

    if (isRated) {
      // Use complex hybrid Elo calculation for rated matches
      winnerEloChange = PongEloService.calculateEloChange({
        playerElo: winnerElo,
        opponentElo: loserElo,
        playerWon: true,
        wagerAmount,
        amountWon: payoutAmount,
        isAiOpponent: mode === 'PVE_AI',
        isPerfectGame,
      });

      // Calculate loser changes if human loser
      if (loserId && loserId > 0) {
        loserEloChange = PongEloService.calculateEloChange({
          playerElo: loserElo,
          opponentElo: winnerElo,
          playerWon: false,
          wagerAmount,
          amountWon: 0n,
          isAiOpponent: mode === 'PVE_AI',
          isPerfectGame: false,
        });
      }
    } else {
      // Unrated matches - no Elo change
      winnerEloChange = {
        skillChange: 0,
        economyChange: 0,
        economyComponent: 0,
        totalChange: 0,
        newRating: winnerElo,
        newTier: PongEloService.getTierFromElo(winnerElo),
      };

      if (loserId && loserId > 0) {
        loserEloChange = {
          skillChange: 0,
          economyChange: 0,
          economyComponent: 0,
          totalChange: 0,
          newRating: loserElo,
          newTier: PongEloService.getTierFromElo(loserElo),
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
    return matches.map((match) => {
      // Determine opponent from the repository's resolved data
      let opponent = null;

      // The repository already resolved the opponent name correctly and stores it as playerTwo
      // For match history, playerTwo contains the opponent data with resolved display names
      if (match.playerTwo) {
        opponent = {
          id: match.playerTwo.id,
          name: match.playerTwo.name,
          avatarUrl: match.playerTwo.avatarUrl || null,
        };
      }

      // Determine current user's score and opponent's score
      const isCurrentUserWinner = match.winnerId === userId;
      let currentUserScore, opponentScore;

      if (isCurrentUserWinner) {
        // Current user won - they get the higher score
        currentUserScore = Math.max(match.playerOneScore, match.playerTwoScore);
        opponentScore = Math.min(match.playerOneScore, match.playerTwoScore);
      } else {
        // Current user lost - they get the lower score
        currentUserScore = Math.min(match.playerOneScore, match.playerTwoScore);
        opponentScore = Math.max(match.playerOneScore, match.playerTwoScore);
      }

      // Get both player names using preserved original names
      let currentUserName = 'Unknown Player';
      let opponentName = 'Unknown Player';

      if (match.playerOneId === userId) {
        // Current user is playerOne, opponent is playerTwo
        currentUserName = match.originalPlayerOneName || 'Unknown Player';
        opponentName = match.originalPlayerTwoName || 'Unknown Player';
      } else {
        // Current user is playerTwo, opponent is playerOne
        currentUserName = match.originalPlayerTwoName || 'Unknown Player';
        opponentName = match.originalPlayerOneName || 'Unknown Player';
      }

      return {
        ...match,
        playerWon: isCurrentUserWinner,
        currentUserScore,
        opponentScore,
        currentUserName,
        opponentName,
        eloChange:
          match.playerOneId === userId
            ? (match.player1EloEnd || 0) - (match.player1EloStart || 0)
            : (match.player2EloEnd || 0) - (match.player2EloStart || 0),
        opponent,
        isAiMatch: match.mode === 'PVE_AI' || match.aiUserId,
      };
    });
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
