import { useState, useEffect, useCallback } from 'react';
import { getUserProfile } from '../api/users';
import type { UserProfile } from '../api/users';

export function useUserProfile(userId: number | null | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (userId == null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile };
}
