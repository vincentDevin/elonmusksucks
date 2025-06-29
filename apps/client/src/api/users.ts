import api from './axios';
import type { PublicUserProfile, UserFeedPost, UserActivity, UserStatsDTO } from '@ems/types';

export type UserProfile = PublicUserProfile;

/** Fetch a user's profile */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await api.get<UserProfile>(`/api/users/profile/${userId}`);
  return response.data;
}

/** Follow another user */
export async function followUser(userId: number): Promise<void> {
  await api.post(`/api/users/${userId}/follow`);
}

/** Unfollow a user */
export async function unfollowUser(userId: number): Promise<void> {
  await api.delete(`/api/users/${userId}/follow`);
}

/** Update profile for the authenticated user */
export type UpdateProfilePayload = Pick<
  PublicUserProfile,
  | 'bio'
  | 'avatarUrl'
  | 'location'
  | 'timezone'
  | 'notifyOnResolve'
  | 'theme'
  | 'twoFactorEnabled'
  | 'profileComplete'
>;

export async function updateUserProfile(
  userId: number,
  data: UpdateProfilePayload,
): Promise<UserProfile> {
  const res = await api.put<UserProfile>(`/api/users/${userId}`, data);
  return res.data;
}

/** ----------- FEED/POSTS ----------- */

export type CreateUserPostPayload = {
  content: string;
  parentId?: number | null;
};

export async function getUserFeed(userId: number): Promise<UserFeedPost[]> {
  const res = await api.get<UserFeedPost[]>(`/api/users/${userId}/feed`);
  return res.data;
}

export async function createUserPost(
  userId: number,
  payload: CreateUserPostPayload,
): Promise<UserFeedPost> {
  const res = await api.post<UserFeedPost>(`/api/users/${userId}/feed`, payload);
  return res.data;
}

/** ----------- ACTIVITY ----------- */

export async function getUserActivity(userId: number): Promise<UserActivity[]> {
  const res = await api.get<UserActivity[]>(`/api/users/${userId}/activity`);
  return res.data;
}

/** ----------- STATS (OPTIONAL) ----------- */

export async function getUserStats(userId: number): Promise<UserStatsDTO> {
  const res = await api.get<UserStatsDTO>(`/api/users/${userId}/stats`);
  return res.data;
}
