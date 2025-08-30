export interface EloChangeComponents {
  skillChange: number;
  economyChange: number;
  economyComponent: number;
  totalChange: number;
  newRating: number;
  newTier: string;
}

export interface EloCalculationInput {
  playerElo: number;
  opponentElo: number;
  playerWon: boolean;
  wagerAmount: number; // Use number on client (convert to bigint for calculation)
  amountWon: number;
  isAiOpponent?: boolean;
  isPerfectGame?: boolean;
}

export class ClientEloCalculator {
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

  // AI Elo mappings (standardized)
  private static readonly AI_ELO_MAP: Record<string, number> = {
    easy: 800,
    medium: 1200,
    hard: 1600,
    impossible: 2400,
    EASY: 800,
    MEDIUM: 1200,
    HARD: 1600,
    IMPOSSIBLE: 2400,
  };

  static calculateEloChange(input: EloCalculationInput): EloChangeComponents {
    const {
      playerElo,
      opponentElo,
      playerWon,
      wagerAmount,
      amountWon,
      isAiOpponent = false,
      isPerfectGame = false,
    } = input;

    // Convert to bigint for calculations to match server logic
    const wagerAmountBigInt = BigInt(Math.floor(wagerAmount));
    const amountWonBigInt = BigInt(Math.floor(amountWon));

    // SKILL COMPONENT (50% weight)
    const expectedWin = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const actualResult = playerWon ? 1 : 0;
    let skillChange = this.K_FACTOR * (actualResult - expectedWin);

    // ECONOMY COMPONENT (50% weight)
    let economyChange = 0;
    if (wagerAmountBigInt > 0n) {
      const wagerNumber = Number(wagerAmountBigInt);
      const amountWonNumber = Number(amountWonBigInt);

      // Wager multiplier - higher wagers = higher stakes
      const wagerMultiplier = Math.log10(Math.max(wagerNumber / 100, 1));

      // Profit ratio - 2.0 for double, 0 for loss
      const profitRatio = wagerNumber > 0 ? amountWonNumber / wagerNumber : 0;

      economyChange = this.K_FACTOR * wagerMultiplier * (profitRatio - 1);

      // Note: AI opponents give full economy rewards now to match user expectations
      // Previously reduced by 50% but this led to confusion when predictions didn't match results
    }

    // Free games only apply skill component at 50% rate
    if (wagerAmountBigInt === 0n) {
      skillChange *= 0.5;
      economyChange = 0;
    }

    // BONUS MODIFIERS
    let bonusMultiplier = 1;

    // Underdog bonus: Extra points for beating higher-rated opponent with big wager
    if (playerWon && opponentElo > playerElo && wagerAmountBigInt >= 1000n) {
      const eloGap = opponentElo - playerElo;
      bonusMultiplier += Math.min(eloGap / 1000, 0.5); // Up to 50% bonus
    }

    // Perfection bonus: +10% for 11-0 victories
    if (isPerfectGame && playerWon) {
      bonusMultiplier += 0.1;
    }

    // High roller bonus: Slight boost for wagers >10k
    if (wagerAmountBigInt >= 10000n) {
      bonusMultiplier += 0.05;
    }

    // Apply bonus multiplier
    skillChange *= bonusMultiplier;
    economyChange *= bonusMultiplier;

    // COMBINED RATING CHANGE (50% skill + 50% economy)
    const totalChange = Math.round(skillChange * 0.5 + economyChange * 0.5);

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

  static getTierFromElo(elo: number): string {
    for (const [tier, bounds] of Object.entries(this.TIERS)) {
      if (elo >= bounds.min && elo <= bounds.max) {
        return tier;
      }
    }
    return 'BRONZE';
  }

  static getAiElo(difficulty: string): number {
    return this.AI_ELO_MAP[difficulty] || 1200;
  }

  static predictEloChange(
    playerElo: number,
    opponentElo: number,
    wagerAmount: number,
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
      amountWon: wagerAmount * 2, // Assume 2x payout
    });

    const lossScenario = this.calculateEloChange({
      playerElo,
      opponentElo,
      playerWon: false,
      wagerAmount,
      amountWon: 0,
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

  static getDefaultElo(): number {
    return 1200;
  }

  static getDefaultTier(): string {
    return 'SILVER';
  }
}
