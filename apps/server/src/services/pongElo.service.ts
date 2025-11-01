import type { PongDifficulty } from '@prisma/client';
import { ECONOMY_MODIFIER_BY_TIER } from '@ems/types';

export interface EloChangeComponents {
  skillChange: number;
  economyChange: number;
  economyComponent: number; // Added missing property
  totalChange: number;
  newRating: number;
  newTier: string;
}

export interface EloCalculationInput {
  playerElo: number;
  opponentElo: number;
  playerWon: boolean;
  wagerAmount: bigint;
  amountWon: bigint;
  playerTier?: string; // Player's current tier for economy modifier scaling
  opponentId?: number; // Opponent's userId for AI detection and Master rank restrictions
  isAiOpponent?: boolean;
  isPerfectGame?: boolean; // Shutout victory (5-0)
}

export class PongEloService {
  private static readonly K_FACTOR = 32;
  private static readonly MIN_ELO = 400;
  private static readonly MAX_ELO = 3000;

  // Tier boundaries
  private static readonly TIERS = {
    BRONZE: { min: 400, max: 999 },
    SILVER: { min: 1000, max: 1399 },
    GOLD: { min: 1400, max: 1799 },
    PLATINUM: { min: 1800, max: 2199 },
    DIAMOND: { min: 2200, max: 2599 },
    MASTER: { min: 2600, max: 2999 },
    GRANDMASTER: { min: 3000, max: 10000 },
  };

  /**
   * Calculate hybrid Elo change based on skill and economy components
   */
  static calculateEloChange(input: EloCalculationInput): EloChangeComponents {
    const {
      playerElo,
      opponentElo,
      playerWon,
      wagerAmount,
      amountWon,
      playerTier,
      opponentId,
      isAiOpponent = false,
      isPerfectGame = false,
    } = input;

    // SKILL COMPONENT (50% weight)
    const expectedWin = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const actualResult = playerWon ? 1 : 0;
    let skillChange = this.K_FACTOR * (actualResult - expectedWin);

    // ECONOMY COMPONENT (50% weight)
    let economyChange = 0;
    if (wagerAmount > 0n) {
      const wagerNumber = Number(wagerAmount);
      const amountWonNumber = Number(amountWon);

      // Wager multiplier - higher wagers = higher stakes
      const wagerMultiplier = Math.log10(Math.max(wagerNumber / 100, 1));

      // Profit ratio - 2.0 for double, 0 for loss
      const profitRatio = wagerNumber > 0 ? amountWonNumber / wagerNumber : 0;

      economyChange = this.K_FACTOR * wagerMultiplier * (profitRatio - 1);

      // TIER-BASED ECONOMY MODIFIER: Scale economy component by player tier
      // Higher tier players get reduced economy rewards to prevent bot farming
      if (playerTier) {
        const tierModifier =
          ECONOMY_MODIFIER_BY_TIER[playerTier as keyof typeof ECONOMY_MODIFIER_BY_TIER];
        if (tierModifier !== undefined) {
          economyChange *= tierModifier;
        }
      }

      // Note: AI opponents give full economy rewards now to match user expectations
      // Previously reduced by 50% but this led to confusion when predictions didn't match results
      // isAiOpponent parameter is available for future differentiation if needed
      void isAiOpponent; // Acknowledge parameter to avoid unused variable warning
    }

    // Free games only apply skill component at 50% rate
    if (wagerAmount === 0n) {
      skillChange *= 0.5;
      economyChange = 0;
    }

    // BONUS MODIFIERS
    let bonusMultiplier = 1;

    // Underdog bonus: Extra points for beating higher-rated opponent with big wager
    if (playerWon && opponentElo > playerElo && wagerAmount >= 1000n) {
      const eloGap = opponentElo - playerElo;
      bonusMultiplier += Math.min(eloGap / 1000, 0.5); // Up to 50% bonus
    }

    // Perfection bonus: +10% for shutout victories (5-0)
    if (isPerfectGame && playerWon) {
      bonusMultiplier += 0.1;
    }

    // High roller bonus: Slight boost for wagers >10k
    if (wagerAmount >= 10000n) {
      bonusMultiplier += 0.05;
    }

    // Apply bonus multiplier
    skillChange *= bonusMultiplier;
    economyChange *= bonusMultiplier;

    // COMBINED RATING CHANGE (50% skill + 50% economy)
    let totalChange = Math.round(skillChange * 0.5 + economyChange * 0.5);

    // MASTER RANK AI RESTRICTIONS: Prevent elo farming
    // Master+ players cannot gain elo from Easy/Medium/Hard AI
    // Only IMPOSSIBLE AI can increase their elo (still lose elo if they lose)
    const isMasterOrAbove = playerTier === 'MASTER' || playerTier === 'GRANDMASTER';
    const isAIOpponent = opponentId !== undefined && opponentId < 0;

    if (isMasterOrAbove && isAIOpponent && totalChange > 0) {
      const aiDifficulty = this.getAIDifficultyFromId(opponentId);
      if (aiDifficulty && aiDifficulty !== 'IMPOSSIBLE') {
        // Block elo gain for Easy/Medium/Hard AI
        totalChange = 0;
      }
      // IMPOSSIBLE AI passes through normally (totalChange remains as calculated)
      // Elo loss (totalChange < 0) passes through for all AI difficulties
    }

    // Apply Elo bounds
    const newRating = Math.max(this.MIN_ELO, Math.min(this.MAX_ELO, playerElo + totalChange));

    const newTier = this.getTierFromElo(newRating);

    return {
      skillChange: Math.round(skillChange),
      economyChange: Math.round(economyChange),
      economyComponent: Math.round(economyChange), // Set economyComponent same as economyChange
      totalChange: newRating - playerElo,
      newRating,
      newTier,
    };
  }

  /**
   * Get tier name from Elo rating
   */
  static getTierFromElo(elo: number): string {
    for (const [tier, bounds] of Object.entries(this.TIERS)) {
      if (elo >= bounds.min && elo <= bounds.max) {
        return tier;
      }
    }
    return 'BRONZE'; // Fallback
  }

  /**
   * Get AI opponent Elo based on difficulty
   */
  static getAiElo(difficulty: PongDifficulty): number {
    switch (difficulty) {
      case 'EASY':
        return 800;
      case 'MEDIUM':
        return 1200;
      case 'HARD':
        return 1600;
      case 'IMPOSSIBLE':
        return 2400;
      default:
        return 1200;
    }
  }

  /**
   * Get AI difficulty from userId
   * AI players have negative IDs: -1 (EASY), -2 (MEDIUM), -3 (HARD), -4 (IMPOSSIBLE)
   */
  private static getAIDifficultyFromId(userId: number): PongDifficulty | null {
    switch (userId) {
      case -1:
        return 'EASY';
      case -2:
        return 'MEDIUM';
      case -3:
        return 'HARD';
      case -4:
        return 'IMPOSSIBLE';
      default:
        return null;
    }
  }

  /**
   * Generate Elo history entry for a match
   */
  static generateEloHistoryEntry(eloChange: EloChangeComponents, matchId: string): any {
    return {
      date: new Date().toISOString(),
      rating: eloChange.newRating,
      matchId,
      change: eloChange.totalChange,
      skillComponent: eloChange.skillChange,
      economyComponent: eloChange.economyComponent,
    };
  }

  /**
   * Update Elo history with new entry, maintaining max size
   */
  static updateEloHistory(currentHistory: any[], newEntry: any, maxEntries: number = 100): any[] {
    const history = [...(currentHistory || []), newEntry];

    // Keep only last N entries to prevent JSON bloat
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }

    return history;
  }

  /**
   * Calculate new peak Elo
   */
  static calculatePeakElo(currentPeak: number, newRating: number): number {
    return Math.max(currentPeak, newRating);
  }

  /**
   * Calculate Elo gain/loss tracking
   */
  static calculateEloTracking(
    currentGained: number,
    currentLost: number,
    eloChange: number,
  ): { totalEloGained: number; totalEloLost: number } {
    const isGain = eloChange > 0;
    return {
      totalEloGained: isGain ? currentGained + eloChange : currentGained,
      totalEloLost: !isGain ? currentLost + Math.abs(eloChange) : currentLost,
    };
  }

  /**
   * Predict Elo change for a potential wager
   */
  static predictEloChange(
    playerElo: number,
    opponentElo: number,
    wagerAmount: bigint,
  ): {
    winChange: number;
    lossChange: number;
    skillComponent: { win: number; loss: number };
    economyComponent: { win: number; loss: number };
    confidenceLevel: 'high' | 'medium' | 'low';
  } {
    const winScenario = this.calculateEloChange({
      playerElo,
      opponentElo,
      playerWon: true,
      wagerAmount,
      amountWon: wagerAmount * 2n, // Assume 2x payout
    });

    const lossScenario = this.calculateEloChange({
      playerElo,
      opponentElo,
      playerWon: false,
      wagerAmount,
      amountWon: 0n,
    });

    // Determine confidence level based on Elo difference
    const eloDiff = Math.abs(playerElo - opponentElo);
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    if (eloDiff > 300) confidenceLevel = 'high';
    else if (eloDiff < 100) confidenceLevel = 'low';

    return {
      winChange: winScenario.totalChange,
      lossChange: lossScenario.totalChange,
      skillComponent: {
        win: winScenario.skillChange,
        loss: lossScenario.skillChange,
      },
      economyComponent: {
        win: winScenario.economyChange,
        loss: lossScenario.economyChange,
      },
      confidenceLevel,
    };
  }

  /**
   * Check if player should be flagged as risk taker
   */
  static shouldFlagAsRiskTaker(recentWagers: bigint[]): boolean {
    if (recentWagers.length < 5) return false;

    const highWagerCount = recentWagers.filter((w) => w >= 1000n).length;
    return highWagerCount >= 3; // 3+ high wagers in recent history
  }

  /**
   * Get default Elo rating for new players
   */
  static getDefaultElo(): number {
    return 1200;
  }

  /**
   * Get default tier for new players
   */
  static getDefaultTier(): string {
    return 'SILVER';
  }
}
