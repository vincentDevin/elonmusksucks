// apps/client/src/pages/Profile.tsx
import { useState, useEffect, useCallback } from 'react';

// Helper to convert string/number to number
import { useParams } from 'react-router-dom';
import { followUser, unfollowUser } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UpdateProfilePayload } from '../api/users';
import PageContainer from '../components/PageContainer';

// Profile sections
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileEditForm } from '../components/profile/ProfileEditForm';
import { ProfileStatsPanel } from '../components/profile/ProfileStats';
import { CreatePostForm } from '../components/profile/CreatePostForm';
import { ProfileFeed } from '../components/profile/ProfileFeed';

export default function Profile() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const numericId = Number(userId);

  const {
    profile,
    loading,
    error,
    formData,
    setFormData,
    refresh: reloadProfile,
    feed,
    stats,
    saveProfile, // from hook
    postToFeed,
  } = useUserProfile(numericId);

  const isOwn = currentUser?.id === profile?.id;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(profile?.isFollowing ?? false);

  // Sync the follow‐button state
  useEffect(() => {
    setFollowing(profile?.isFollowing ?? false);
  }, [profile?.isFollowing]);

  const toggleFollow = useCallback(async () => {
    if (!profile) return;
    try {
      if (following) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      setFollowing(!following);
      await reloadProfile();
    } catch (e: any) {
      console.error(e);
      alert('Action failed: ' + (e?.message || e.toString()));
    }
  }, [profile, following, reloadProfile]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      setSaving(true);
      try {
        // saveProfile comes from the hook
        await saveProfile(formData as UpdateProfilePayload);
        setEditing(false);
      } catch (e: any) {
        console.error(e);
        alert('Save failed: ' + (e?.message || e.toString()));
      } finally {
        setSaving(false);
      }
    },
    [profile, formData, saveProfile],
  );

  const handlePost = async (content: string, parentId?: number | null) => {
    await postToFeed({ content, parentId });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-content">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-surface border border-muted rounded-2xl p-8 shadow-lg">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-content mb-2">Profile Error</h2>
          <p className="text-red-500 mb-4">{error || 'Failed to load profile'}</p>
          {error?.includes('Authentication required') && (
            <button
              onClick={() => (window.location.href = '/login')}
              className="px-4 py-2 bg-primary text-surface rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Login
            </button>
          )}
          {!error?.includes('Authentication required') && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-content rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full stats object (new fields) with a fallback
  const statsData = stats ?? {
    totalBets: 0,
    betsWon: 0,
    betsLost: 0,
    totalParlays: 0,
    parlaysWon: 0,
    parlaysLost: 0,
    totalParlayLegs: 0,
    parlayLegsWon: 0,
    parlayLegsLost: 0,
    totalWagered: 0,
    totalWon: 0,
    profit: 0,
    roi: 0,
    currentStreak: 0,
    longestStreak: 0,
    mostCommonBet: null,
    biggestWin: 0,
    updatedAt: new Date().toISOString(),
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        <ProfileHeader
          profile={profile}
          isOwn={isOwn}
          editing={editing}
          setEditing={setEditing}
          following={following}
          toggleFollow={toggleFollow}
          followersCount={profile.followersCount}
          followingCount={profile.followingCount}
        />

        {editing ? (
          <ProfileEditForm
            userId={profile.id}
            formData={formData}
            setFormData={setFormData}
            handleSave={handleSave}
            saving={saving}
          />
        ) : (
          <>
            <ProfileStatsPanel
              profile={{
                id: profile.id,
                name: profile.name,
                muskBucks: profile.muskBucks,
                rank: profile.rank,
                achievements: profile.achievements,
                badges: profile.badges,
              }}
              stats={statsData}
              isOwn={isOwn}
            />

            {isOwn ? (
              <CreatePostForm onSubmit={handlePost} disabled={loading} />
            ) : (
              <p className="text-gray-500">
                Only {profile.name} can post on their own wall. You can reply to posts below.
              </p>
            )}

            <ProfileFeed feed={feed} loading={loading} onSubmit={handlePost} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
