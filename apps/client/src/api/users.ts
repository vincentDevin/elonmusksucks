import api from './axios';

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
  displayName: string;
  avatarUrl: string;
  bio: string;
  stats: UserStats;
  badges: Badge[];
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  muskBucks: number;
  rank: string;
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
