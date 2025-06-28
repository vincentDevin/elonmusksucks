import { useState, useEffect, useCallback } from 'react';
import { getUserProfile } from '../api/users';
import type { PublicUserProfile } from '@ems/types';
import type { UpdateProfilePayload } from '../api/users';

export function useUserProfile(userId?: number | null) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with all required keys so TS won’t complain later
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

  const fetchProfile = useCallback(async () => {
    if (userId == null) {
      // clear when there's no user
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
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
      setFormData({
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
        location: data.location ?? null,
        timezone: data.timezone ?? null,
        notifyOnResolve: data.notifyOnResolve,
        theme: data.theme,
        twoFactorEnabled: data.twoFactorEnabled,
        profileComplete: data.profileComplete,
      });
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    formData,
    setFormData,
    refresh: fetchProfile,
  };
}
