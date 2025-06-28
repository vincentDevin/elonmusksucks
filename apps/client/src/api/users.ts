// apps/client/src/api/users.ts
import api from './axios';
import type { PublicUserProfile } from '@ems/types';

/**
 * This is exactly the shape returned by the backend.
 */
export type UserProfile = PublicUserProfile;

/**
 * Fetch a user's profile
 */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await api.get<UserProfile>(`/api/users/profile/${userId}`);
  return response.data;
}

/**
 * Follow another user
 */
export async function followUser(userId: number): Promise<void> {
  await api.post(`/api/users/${userId}/follow`);
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: number): Promise<void> {
  await api.delete(`/api/users/${userId}/follow`);
}

/**
 * Payload for updating a user's profile
 */
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

/**
 * Update profile for the authenticated user
 */
export async function updateUserProfile(
  userId: number,
  data: UpdateProfilePayload,
): Promise<UserProfile> {
  const res = await api.put<UserProfile>(`/api/users/${userId}`, data);
  return res.data;
}
