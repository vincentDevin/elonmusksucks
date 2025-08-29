export interface PureEloInput {
  playerElo: number;
  opponentElo: number;
  won: boolean;
  mode: 'PVP' | 'PVE_AI';
}

export interface PureEloResult {
  delta: number;
  newRating: number;
  opponentDelta: number;
  opponentNewRating: number;
}

/**
 * Pure Elo rating service following the standard Elo formula
 * as specified in the ground truth documentation.
 */
export class PureEloService {
  private static readonly K_FACTOR_PVP = 32;
  private static readonly K_FACTOR_PVE_AI = 24;
  private static readonly MIN_ELO = 400;
  private static readonly MAX_ELO = 3000;

  /**
   * Calculate pure Elo rating change based on match outcome
   * Uses standard Elo formula: delta = k * (score - expected)
   * where expected = 1 / (1 + 10^((opponent - me) / 400))
   */
  static calculateEloChange(input: PureEloInput): PureEloResult {
    const { playerElo, opponentElo, won, mode } = input;

    // Select K-factor based on mode
    const k = mode === 'PVP' ? this.K_FACTOR_PVP : this.K_FACTOR_PVE_AI;

    // Calculate expected score for player
    const expectedPlayer = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const expectedOpponent = 1 / (1 + Math.pow(10, (playerElo - opponentElo) / 400));

    // Actual scores (1 for win, 0 for loss)
    const scorePlayer = won ? 1 : 0;
    const scoreOpponent = won ? 0 : 1;

    // Calculate rating changes
    const deltaPlayer = Math.round(k * (scorePlayer - expectedPlayer));
    const deltaOpponent = Math.round(k * (scoreOpponent - expectedOpponent));

    // Apply changes with bounds
    const newPlayerRating = Math.max(this.MIN_ELO, Math.min(this.MAX_ELO, playerElo + deltaPlayer));

    const newOpponentRating = Math.max(
      this.MIN_ELO,
      Math.min(this.MAX_ELO, opponentElo + deltaOpponent),
    );

    return {
      delta: deltaPlayer,
      newRating: newPlayerRating,
      opponentDelta: deltaOpponent,
      opponentNewRating: newOpponentRating,
    };
  }

  /**
   * Get the appropriate K-factor for a match
   */
  static getKFactor(mode: 'PVP' | 'PVE_AI'): number {
    return mode === 'PVP' ? this.K_FACTOR_PVP : this.K_FACTOR_PVE_AI;
  }

  /**
   * Determine tier based on Elo rating
   */
  static getTier(elo: number): string {
    if (elo < 1000) return 'BRONZE';
    if (elo < 1400) return 'SILVER';
    if (elo < 1800) return 'GOLD';
    if (elo < 2200) return 'PLATINUM';
    if (elo < 2600) return 'DIAMOND';
    if (elo < 3000) return 'MASTER';
    return 'GRANDMASTER';
  }

  /**
   * Check if match should be rated
   * A match is rated if the stake amount is greater than 0
   */
  static isRatedMatch(stakeAmount: bigint): boolean {
    return stakeAmount > 0n;
  }

  /**
   * Get AI's current Elo rating based on difficulty
   * This maps AI difficulty to Elo ratings for initial calculation
   * The actual AI Elo should be tracked in the database
   */
  static getAIEloByDifficulty(difficulty: string): number {
    const difficultyMap: Record<string, number> = {
      BABY: 800,
      EASY: 1000,
      MEDIUM: 1200,
      HARD: 1500,
      IMPOSSIBLE: 1800,
    };

    return difficultyMap[difficulty] || 1200;
  }

  /**
   * Verify Elo calculation matches spec
   * For equal Elo (1500 vs 1500):
   * - PVP win: +16, loss: -16
   * - PVE_AI win: +12, loss: -12
   */
  static verifyCalculation(): boolean {
    // Test PVP equal Elo
    const pvpWin = this.calculateEloChange({
      playerElo: 1500,
      opponentElo: 1500,
      won: true,
      mode: 'PVP',
    });
    const pvpLoss = this.calculateEloChange({
      playerElo: 1500,
      opponentElo: 1500,
      won: false,
      mode: 'PVP',
    });

    // Test PVE_AI equal Elo
    const pveWin = this.calculateEloChange({
      playerElo: 1500,
      opponentElo: 1500,
      won: true,
      mode: 'PVE_AI',
    });
    const pveLoss = this.calculateEloChange({
      playerElo: 1500,
      opponentElo: 1500,
      won: false,
      mode: 'PVE_AI',
    });

    const isValid =
      pvpWin.delta === 16 && pvpLoss.delta === -16 && pveWin.delta === 12 && pveLoss.delta === -12;

    if (!isValid) {
      console.error('Pure Elo calculation verification failed:', {
        pvpWin: pvpWin.delta,
        pvpLoss: pvpLoss.delta,
        pveWin: pveWin.delta,
        pveLoss: pveLoss.delta,
      });
    }

    return isValid;
  }
}
