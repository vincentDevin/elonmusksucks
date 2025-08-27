import type { AdminUserView, AdminBetView, AdminTransactionView } from '@ems/types';

/**
 * Maps PublicUser data to standardized AdminUserView DTO
 * Handles BigInt → string conversion for muskBucks
 */
export const toAdminUserView = (user: {
  id: number;
  name: string;
  email: string;
  muskBucks: bigint;
  role: string;
  isEmailVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}): AdminUserView => ({
  id: user.id,
  name: user.name,
  email: user.email,
  muskBucks: user.muskBucks.toString(),
  role: user.role,
  isEmailVerified: user.isEmailVerified ?? false,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.createdAt.toISOString(),
});

/**
 * Maps AdminBet data to standardized AdminBetView DTO
 * Handles BigInt → string conversion for amounts
 */
export const toAdminBetView = (bet: {
  id: number;
  userId: number;
  userName?: string;
  predictionId: number;
  optionId: number | null;
  amount: bigint;
  potentialPayout: bigint | null;
  payout: bigint | null;
  status: string;
  createdAt: Date;
  prediction?: {
    title: string;
  };
}): AdminBetView => ({
  id: bet.id,
  userId: bet.userId,
  userName: bet.userName || 'Unknown',
  predictionId: bet.predictionId,
  predictionTitle: bet.prediction?.title || 'Unknown',
  optionId: bet.optionId,
  optionLabel: null,
  amount: bet.amount.toString(),
  potentialPayout: bet.potentialPayout ? bet.potentialPayout.toString() : null,
  payout: bet.payout ? bet.payout.toString() : null,
  status: bet.status,
  createdAt: bet.createdAt.toISOString(),
});

/**
 * Maps AdminTransaction data to standardized AdminTransactionView DTO
 * Handles amount/balanceAfter which are already strings in AdminTransaction
 */
export const toAdminTransactionView = (transaction: {
  id: number;
  userId: number;
  userName: string;
  type: string;
  amount: string;
  balanceAfter: string;
  relatedBetId: number | null;
  relatedParlayId: number | null;
  createdAt: Date;
}): AdminTransactionView => ({
  id: transaction.id,
  userId: transaction.userId,
  userName: transaction.userName,
  type: transaction.type,
  amount: transaction.amount,
  balanceAfter: transaction.balanceAfter,
  relatedBetId: transaction.relatedBetId,
  relatedParlayId: transaction.relatedParlayId,
  createdAt: transaction.createdAt.toISOString(),
});
