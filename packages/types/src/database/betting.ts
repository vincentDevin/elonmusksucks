/**
 * Betting Database Types
 *
 * Types for Bet, Parlay, ParlayLeg, Transaction models
 */

import type {
  PrismaBet,
  PrismaParlay,
  PrismaParlayLeg,
  PrismaTransaction,
  PrismaBetStatus,
  PrismaTransactionType,
} from '../prisma';

// ============================================================================
// Bet Types
// ============================================================================

export type DbBet = PrismaBet;

export type PublicBet = Omit<
  Pick<
    PrismaBet,
    | 'id'
    | 'userId'
    | 'predictionId'
    | 'amount'
    | 'oddsAtPlacement'
    | 'potentialPayout'
    | 'status'
    | 'optionId'
    | 'won'
    | 'payout'
    | 'createdAt'
  >,
  'amount' | 'potentialPayout' | 'payout'
> & {
  amount: string;
  potentialPayout: string | null;
  payout: string | null;
};

// BetWithUser is exported from prisma.ts - import it when needed

// ============================================================================
// Parlay Types
// ============================================================================

export type DbParlay = PrismaParlay;

export type PublicParlay = Omit<
  Pick<
    PrismaParlay,
    'id' | 'userId' | 'amount' | 'combinedOdds' | 'potentialPayout' | 'status' | 'createdAt'
  >,
  'amount' | 'potentialPayout'
> & {
  amount: string;
  potentialPayout: string;
};

export type DbParlayLeg = PrismaParlayLeg;

export interface PublicParlayLeg {
  id: number;
  parlayId: number;
  optionId: number;
  oddsAtPlacement: number;
  createdAt: string;
  parlay: {
    id: number;
    user: { id: number; name: string };
    amount: string;
    combinedOdds: number;
  };
}

// ============================================================================
// Transaction Types
// ============================================================================

export type DbTransaction = PrismaTransaction;

export type PublicTransaction = Omit<
  Pick<
    PrismaTransaction,
    | 'id'
    | 'userId'
    | 'type'
    | 'amount'
    | 'balanceAfter'
    | 'relatedBetId'
    | 'relatedParlayId'
    | 'createdAt'
  >,
  'amount' | 'balanceAfter'
> & {
  amount: string;
  balanceAfter: string;
};

// ============================================================================
// Enum Re-exports
// ============================================================================

export type { PrismaBetStatus as BetStatus, PrismaTransactionType as TransactionType };
