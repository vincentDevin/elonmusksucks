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
    theme: 'LIGHT',
    twoFactorEnabled: false,
    profileComplete: false,
  });

  // User Feed & Activity & Stats
  const [feed, setFeed] = useState<UserFeedPost[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStatsDTO | null>(null);

  // --- Fetch Handlers ---
  const fetchProfile = useCallback(async () => {
    if (userId == null) {
      setProfile(null);
      setFormData({
        bio: null,
        avatarUrl: null,
        location: null,
        timezone: null,
        notifyOnResolve: true,
        theme: 'LIGHT',
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
      // Fetch all user info in parallel
      const [profileData, feedData, activityData, statsData] = await Promise.all([
        getUserProfile(userId),
        getUserFeed(userId),
        getUserActivity(userId),
        getUserStats(userId).catch((err) => {
          if (err?.response?.status === 404) {
            // Fallback object if desired:
            return {
              totalBets: 0,
              betsWon: 0,
              betsLost: 0,
              parlaysStarted: 0,
              parlaysWon: 0,
              totalWagered: 0,
              totalWon: 0,
              streak: 0,
              maxStreak: 0,
              profit: 0,
              roi: 0,
              mostCommonBet: null,
              biggestWin: 0,
              updatedAt: new Date().toISOString(),
            };
          }
          throw err;
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
      setError(err?.message ?? err?.toString() ?? 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      setError(err?.message ?? err?.toString() ?? 'Failed to save profile');
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
      setError(err?.message ?? err?.toString() ?? 'Failed to post');
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
