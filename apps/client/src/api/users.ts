import api from './axios';
import type { User } from './auth';

export interface Badge {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  awardedAt: string;
}

export interface UserStats {
  followers: number;
  following: number;
  posts: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserProfile {
  id: number;
  username: string;
  avatarUrl: string;
  bio: string;
  stats: UserStats;
  badges: Badge[];
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  muskBucks: number;
  rank: string;
  location: string | null;
  timezone: string | null;
  notifyOnResolve: boolean;
  theme: 'LIGHT' | 'DARK';
  twoFactorEnabled: boolean;
  profileComplete: boolean;
}

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await api.get<UserProfile>(`/api/users/profile/${userId}`);
  return response.data;
}

export async function followUser(userId: number): Promise<void> {
  await api.post(`/api/users/${userId}/follow`);
}

export async function unfollowUser(userId: number): Promise<void> {
  await api.delete(`/api/users/${userId}/follow`);
}

/**
 * Update profile fields for the authenticated user.
 */
export interface UpdateProfilePayload {
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve?: boolean;
  theme?: 'LIGHT' | 'DARK';
  twoFactorEnabled?: boolean;
  profileComplete?: boolean;
}

export async function updateUserProfile(userId: number, data: UpdateProfilePayload): Promise<User> {
  const res = await api.put<User>(`/api/users/${userId}`, data);
  return res.data;
}
