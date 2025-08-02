// apps/client/src/api/moderation.ts
import axios from './axios';
import type { BanType } from '@ems/types';

export interface BanRequest {
  userId: number;
  banType: BanType;
  reason: string;
  duration?: number; // minutes for temporary bans
}

export interface MuteRequest {
  userId: number;
  duration: number; // minutes
  reason: string;
}

export interface KickRequest {
  userId: number;
  reason: string;
}

export interface DeleteContentRequest {
  reason: string;
}

export interface UserBan {
  id: number;
  userId: number;
  banType: BanType;
  reason: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ModerationLogEntry {
  id: number;
  moderatorId: number;
  targetUserId?: number;
  action: string;
  reason?: string;
  details?: any;
  createdAt: string;
  moderator: {
    id: number;
    name: string;
  };
  targetUser?: {
    id: number;
    name: string;
  };
}

// User moderation
export async function banUser(data: BanRequest): Promise<UserBan> {
  const response = await axios.post('/api/moderation/ban', data);
  return response.data;
}

export async function unbanUser(userId: number): Promise<void> {
  await axios.delete(`/api/moderation/ban/${userId}`);
}

export async function muteUser(data: MuteRequest): Promise<UserBan> {
  const response = await axios.post('/api/moderation/mute', data);
  return response.data;
}

export async function kickUser(data: KickRequest): Promise<void> {
  await axios.post('/api/moderation/kick', data);
}

// Content moderation
export async function deleteMessage(messageId: number, reason: string): Promise<void> {
  await axios.delete(`/api/moderation/message/${messageId}`, {
    data: { reason },
  });
}

export async function deletePost(postId: number, reason: string): Promise<void> {
  await axios.delete(`/api/moderation/post/${postId}`, {
    data: { reason },
  });
}

// Information endpoints
export async function getActiveBans(): Promise<UserBan[]> {
  const response = await axios.get('/api/moderation/bans');
  return response.data;
}

export async function getUserBanStatus(userId: number): Promise<UserBan | null> {
  try {
    const response = await axios.get(`/api/moderation/bans/${userId}`);
    return response.data;
  } catch (error) {
    if ((error as any).response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getModerationHistory(
  targetUserId?: number,
  moderatorId?: number,
): Promise<ModerationLogEntry[]> {
  const params = new URLSearchParams();
  if (targetUserId) params.append('targetUserId', targetUserId.toString());
  if (moderatorId) params.append('moderatorId', moderatorId.toString());

  const response = await axios.get(`/api/moderation/history?${params}`);
  return response.data;
}

export async function getRecentModerationActions(limit?: number): Promise<ModerationLogEntry[]> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await axios.get(`/api/moderation/actions/recent${params}`);
  return response.data;
}
