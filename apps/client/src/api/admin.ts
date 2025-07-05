// apps/client/src/api/admin.ts
import api from './axios';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  PublicUserBadge,
  UserStatsDTO,
  PublicAITweet,
  Role,
} from '@ems/types';

/** — User Management — **/
export async function listUsers(): Promise<PublicUser[]> {
  const res = await api.get<PublicUser[]>('/api/admin/users');
  return res.data;
}

export async function updateUserRole(userId: number, role: Role): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function activateUser(userId: number, active: boolean): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/activate`, { active });
  return res.data;
}

export async function updateUserBalance(userId: number, amount: number): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/balance`, { amount });
  return res.data;
}

/** — Prediction Management — **/
export async function listPredictions(params?: Record<string, any>): Promise<PublicPrediction[]> {
  const res = await api.get<PublicPrediction[]>('/api/admin/predictions', { params });
  return res.data;
}

export async function approvePrediction(id: number): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/approve`);
  return res.data;
}

export async function rejectPrediction(id: number): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/reject`);
  return res.data;
}

/**
 * Resolve a prediction by supplying the winning option ID.
 */
export async function resolvePrediction(
  id: number,
  winningOptionId: number,
): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/resolve`, {
    winningOptionId,
  });
  return res.data;
}

/** — Bet & Transaction Oversight — **/
export async function listBets(params?: Record<string, any>): Promise<PublicBet[]> {
  const res = await api.get<PublicBet[]>('/api/admin/bets', { params });
  return res.data;
}

export async function refundBet(id: number): Promise<PublicBet> {
  const res = await api.patch<PublicBet>(`/api/admin/bets/${id}/refund`);
  return res.data;
}

export async function listTransactions(params?: Record<string, any>): Promise<PublicTransaction[]> {
  const res = await api.get<PublicTransaction[]>('/api/admin/transactions', { params });
  return res.data;
}

/** — Content Moderation — **/
export async function listPosts(params?: Record<string, any>): Promise<any[]> {
  const res = await api.get<any[]>('/api/admin/posts', { params });
  return res.data;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/api/admin/posts/${id}`);
}

/** — Badge & Content Moderation — **/
export async function listBadges(): Promise<PublicBadge[]> {
  const res = await api.get<PublicBadge[]>('/api/admin/badges');
  return res.data;
}

export async function createBadge(data: {
  name: string;
  description?: string | null;
  iconUrl?: string | null;
}): Promise<PublicBadge> {
  const res = await api.post<PublicBadge>('/api/admin/badges', data);
  return res.data;
}

export async function assignBadge(userId: number, badgeId: number): Promise<PublicUserBadge> {
  const res = await api.patch<PublicUserBadge>(`/api/admin/users/${userId}/badges`, {
    badgeId,
  });
  return res.data;
}

export async function revokeBadge(userId: number, badgeId: number): Promise<void> {
  await api.delete(`/api/admin/users/${userId}/badges/${badgeId}`);
}

/** — Leaderboard & Stats — **/
export async function refreshLeaderboard(): Promise<void> {
  await api.post('/api/admin/leaderboard/refresh');
}

export async function getUserStats(userId: number): Promise<UserStatsDTO | null> {
  const res = await api.get<UserStatsDTO>(`/api/admin/stats/${userId}`);
  return res.data;
}

/** — Miscellaneous — **/
export async function triggerAITweet(): Promise<PublicAITweet> {
  const res = await api.post<PublicAITweet>('/api/admin/aitweet');
  return res.data;
}
