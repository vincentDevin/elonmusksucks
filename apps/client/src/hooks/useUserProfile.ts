// apps/client/src/hooks/useUserProfile.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getUserProfile,
  getUserFeed,
  getUserActivity,
  getUserStats,
  updateUserProfile,
  createUserPost,
} from '../api/users';
import type { PublicUserProfile, UserFeedPost, UserActivity, UserStatsDTO } from '@ems/types';
import type { UpdateProfilePayload, CreateUserPostPayload } from '../api/users';

type UseUserProfileResult = {
  profile: PublicUserProfile | null;
  loading: boolean;
  error: string | null;
  formData: UpdateProfilePayload;
  setFormData: React.Dispatch<React.SetStateAction<UpdateProfilePayload>>;
  refresh: () => void;
  feed: UserFeedPost[];
  activity: UserActivity[];
  stats: UserStatsDTO | null;
  saveProfile: (payload: UpdateProfilePayload) => Promise<void>;
  postToFeed: (payload: CreateUserPostPayload) => Promise<void>;
};

export function useUserProfile(userId?: number | null): UseUserProfileResult {
  // Core profile state
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable profile fields (for forms)
  const [formData, setFormData] = useState<UpdateProfilePayload>({
    bio: null,
    avatarUrl: null,
    location: null,
    timezone: null,
    notifyOnResolve: true,
    theme: 'dark-professional',
    twoFactorEnabled: false,
    profileComplete: false,
  });

  // User Feed & Activity & Stats
  const [feed, setFeed] = useState<UserFeedPost[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStatsDTO | null>(null);

  // --- Fetch Handlers ---
  const fetchProfile = useCallback(
    async (retryCount = 0) => {
      if (userId == null) {
        setProfile(null);
        setFormData({
          bio: null,
          avatarUrl: null,
          location: null,
          timezone: null,
          notifyOnResolve: true,
          theme: 'dark-professional',
          twoFactorEnabled: false,
          profileComplete: false,
        });
        setFeed([]);
        setActivity([]);
        setStats(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch all user info in parallel with individual error handling
        const [profileData, feedData, activityData, statsData] = await Promise.all([
          getUserProfile(userId),
          getUserFeed(userId).catch((err) => {
            console.warn('Failed to load user feed:', err);
            return []; // Return empty array on feed error
          }),
          getUserActivity(userId).catch((err) => {
            console.warn('Failed to load user activity:', err);
            return []; // Return empty array on activity error
          }),
          getUserStats(userId).catch((err) => {
            if (err?.response?.status === 404) {
              // Provide empty stats fallback for 404 matching UserStatsDTO
              return {
                totalBets: 0,
                betsWon: 0,
                betsLost: 0,
                totalParlays: 0,
                parlaysWon: 0,
                parlaysLost: 0,
                totalParlayLegs: 0,
                parlayLegsWon: 0,
                parlayLegsLost: 0,
                totalWagered: '0',
                totalWinnings: '0',
                totalLosses: '0',
                netProfit: '0',
                currentStreak: 0,
                longestWinStreak: 0,
                longestLoseStreak: 0,
                averageBetSize: '0',
                averageOdds: 0,
                biggestWin: '0',
                biggestLoss: '0',
                winRate: 0,
                roi: 0,
              };
            }
            console.warn('Failed to load user stats:', err);
            return null; // Return null on other stats errors
          }),
        ]);

        setProfile(profileData);
        setFeed(feedData);
        setActivity(activityData);
        setStats(statsData);

        setFormData({
          bio: profileData.bio ?? null,
          avatarUrl: profileData.avatarUrl ?? null,
          location: profileData.location ?? null,
          timezone: profileData.timezone ?? null,
          notifyOnResolve: profileData.notifyOnResolve,
          theme: profileData.theme,
          twoFactorEnabled: profileData.twoFactorEnabled,
          profileComplete: profileData.profileComplete,
        });
      } catch (err: any) {
        // If it's an auth error and we haven't retried yet, try once more
        if (err?.response?.status === 401 && retryCount === 0) {
          console.log('Authentication error on profile load, retrying...');
          // Wait a brief moment for token refresh to complete
          setTimeout(() => fetchProfile(1), 100);
          return;
        }

        const errorMessage =
          err?.response?.status === 401
            ? 'Authentication required. Please log in again.'
            : err?.response?.status === 403
              ? 'You do not have permission to view this profile.'
              : err?.response?.status === 404
                ? 'User profile not found.'
                : (err?.message ?? err?.toString() ?? 'Failed to load user profile');

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  // Re-fetch on mount or when userId changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Mutations ---
  const saveProfile = async (payload: UpdateProfilePayload) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateUserProfile(userId, payload);
      setProfile(updated);
      setFormData({
        bio: updated.bio ?? null,
        avatarUrl: updated.avatarUrl ?? null,
        location: updated.location ?? null,
        timezone: updated.timezone ?? null,
        notifyOnResolve: updated.notifyOnResolve,
        theme: updated.theme,
        twoFactorEnabled: updated.twoFactorEnabled,
        profileComplete: updated.profileComplete,
      });
    } catch (err: any) {
      const errorMessage =
        err?.response?.status === 401
          ? 'Authentication required. Please log in again.'
          : err?.response?.status === 403
            ? 'You do not have permission to update this profile.'
            : (err?.message ?? err?.toString() ?? 'Failed to save profile');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const postToFeed = async (payload: CreateUserPostPayload) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await createUserPost(userId, payload);
      await fetchProfile(); // Re-fetch feed
    } catch (err: any) {
      const errorMessage =
        err?.response?.status === 401
          ? 'Authentication required. Please log in again.'
          : err?.response?.status === 403
            ? 'You do not have permission to post to this profile.'
            : (err?.message ?? err?.toString() ?? 'Failed to create post');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- Return ---
  return {
    profile,
    loading,
    error,
    formData,
    setFormData,
    refresh: fetchProfile,
    feed,
    activity,
    stats,
    saveProfile,
    postToFeed,
  };
}
