// apps/server/src/services/admin.service.ts
import type { Role } from '@prisma/client';
import type { IAdminRepository, QueryParams } from '../repositories/IAdminRepository';
import { PrismaAdminRepository } from '../repositories/AdminRepository';
import type { UserStatsDTO } from '@ems/types';

const repo: IAdminRepository = new PrismaAdminRepository();

// -- User Management --
export const listUsers = async () => {
  return repo.findAllUsers();
};

export const changeUserRole = async (userId: number, role: Role) => {
  return repo.updateUserRole(userId, role);
};

export const setUserActive = async (userId: number, active: boolean) => {
  return repo.updateUserActive(userId, active);
};

export const adjustUserBalance = async (userId: number, amount: number) => {
  return repo.updateUserBalance(userId, amount);
};

// -- Prediction Management --
export const listPredictions = async (filters?: QueryParams) => {
  return repo.findPredictions(filters);
};

export const setPredictionStatus = async (
  predictionId: number,
  status: 'approved' | 'rejected',
) => {
  return repo.updatePredictionStatus(predictionId, status);
};

// -- Bet & Transaction Oversight --
export const listBets = async (filters?: QueryParams) => {
  return repo.findBets(filters);
};

export const refundBet = async (betId: number) => {
  return repo.refundBet(betId);
};

export const listTransactions = async (filters?: QueryParams) => {
  return repo.findTransactions(filters);
};

// -- Badge & Content Moderation --
export const listPosts = async (filters?: QueryParams) => {
  return repo.findPosts(filters);
};

export const removePost = async (postId: number) => {
  return repo.deletePost(postId);
};

export const listBadges = async () => {
  return repo.findAllBadges();
};

export const createBadge = async (data: {
  name: string;
  description?: string;
  iconUrl?: string;
}) => {
  return repo.insertBadge(data);
};

export const assignBadge = async (userId: number, badgeId: number) => {
  return repo.addBadgeToUser(userId, badgeId);
};

export const revokeBadge = async (userId: number, badgeId: number) => {
  return repo.removeBadgeFromUser(userId, badgeId);
};

// -- Leaderboard & Stats --
export const refreshLeaderboard = async () => {
  return repo.recalculateLeaderboard();
};

/**
 * Fetches raw stats, then maps Date→ISO and returns the DTO.
 */
export const getUserStats = async (userId: number): Promise<UserStatsDTO | null> => {
  const raw = await repo.findUserStats(userId);
  if (!raw) return null;

  return {
    totalBets: raw.totalBets,
    betsWon: raw.betsWon,
    betsLost: raw.betsLost,
    totalParlays: raw.totalParlays,
    parlaysWon: raw.parlaysWon,
    parlaysLost: raw.parlaysLost,
    totalParlayLegs: raw.totalParlayLegs,
    parlayLegsWon: raw.parlayLegsWon,
    parlayLegsLost: raw.parlayLegsLost,
    totalWagered: raw.totalWagered,
    totalWon: raw.totalWon,
    profit: raw.profit,
    roi: raw.roi,
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    mostCommonBet: raw.mostCommonBet,
    biggestWin: raw.biggestWin,
    updatedAt: raw.updatedAt.toISOString(),
  };
};

// -- Miscellaneous --
export const generateAITweet = async () => {
  return repo.triggerAITweet();
};
