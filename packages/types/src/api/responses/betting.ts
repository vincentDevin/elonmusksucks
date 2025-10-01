/**
 * Betting Response DTOs
 *
 * Response types for betting endpoints
 */

import type { BetStatus } from '../../database/betting';

// ============================================================================
// User Bet View
// ============================================================================

export interface UserBetView {
  id: number;
  predictionId: number;
  predictionTitle: string;
  optionId: number | null;
  optionLabel: string | null;
  amount: string; // BigInt → string
  potentialPayout: string | null;
  payout: string | null;
  status: BetStatus;
  won: boolean | null;
  oddsAtPlacement: number;
  createdAt: string; // Date → ISO
}

// ============================================================================
// User Parlay View
// ============================================================================

export interface UserParlayView {
  id: number;
  amount: string; // BigInt → string
  combinedOdds: number;
  potentialPayout: string; // BigInt → string
  status: BetStatus;
  createdAt: string; // Date → ISO
  legs: Array<{
    id: number;
    predictionId: number;
    predictionTitle: string;
    optionId: number;
    optionLabel: string;
    oddsAtPlacement: number;
  }>;
}
