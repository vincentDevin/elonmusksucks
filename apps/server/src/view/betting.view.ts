import type { UserBetView, UserParlayView } from '@ems/types';

/**
 * Maps user bet data to standardized UserBetView DTO
 * Repository already provides strings/ISO dates, just maps to our DTO shape
 */
export const toUserBetView = (bet: {
  id: number;
  predictionId: number;
  predictionTitle: string;
  amount: string;
  odds: number;
  optionLabel?: string;
  status: string;
  createdAt: string;
}): UserBetView => ({
  id: bet.id,
  predictionId: bet.predictionId,
  predictionTitle: bet.predictionTitle,
  optionId: null, // Not provided by current repository
  optionLabel: bet.optionLabel || null,
  amount: bet.amount,
  potentialPayout: null, // Could be calculated from amount * odds if needed
  payout: null, // Not available for active bets
  status: bet.status as UserBetView['status'],
  won: null, // Not determined for active bets
  oddsAtPlacement: bet.odds,
  createdAt: bet.createdAt,
});

/**
 * Maps user parlay data to standardized UserParlayView DTO
 * Repository already provides strings/ISO dates, just maps to our DTO shape
 */
export const toUserParlayView = (parlay: {
  id: number;
  amount: string;
  combinedOdds: number;
  potentialPayout: string;
  legCount: number;
  status: string;
  createdAt: string;
  legs: Array<{
    predictionTitle: string;
    optionLabel: string;
  }>;
}): UserParlayView => ({
  id: parlay.id,
  amount: parlay.amount,
  combinedOdds: parlay.combinedOdds,
  potentialPayout: parlay.potentialPayout,
  status: parlay.status as UserParlayView['status'],
  createdAt: parlay.createdAt,
  legs: parlay.legs.map((leg, index) => ({
    id: index, // Using index as ID since not provided
    predictionId: 0, // Not provided by current repository
    predictionTitle: leg.predictionTitle,
    optionId: 0, // Not provided by current repository
    optionLabel: leg.optionLabel,
    oddsAtPlacement: 0, // Not provided by current repository
  })),
});
