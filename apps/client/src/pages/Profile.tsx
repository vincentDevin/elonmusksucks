// apps/client/src/pages/Profile.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { followUser, unfollowUser } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UpdateProfilePayload } from '../api/users';

// Profile sections
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileEditForm } from '../components/profile/ProfileEditForm';
import { ProfileFollowers } from '../components/profile/ProfileFollowers';
import { ProfileStats } from '../components/profile/ProfileStats';
import { ProfileBadges } from '../components/profile/ProfileBadges';
import { CreatePostForm } from '../components/profile/CreatePostForm';
import { ProfileFeed } from '../components/profile/ProfileFeed';
import { ProfileActivity } from '../components/profile/ProfileActivity';

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
    activity,
    stats,
    saveProfile, // from hook
    postToFeed,
  } = useUserProfile(numericId);

  const isOwn = currentUser?.id === profile?.id;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(profile?.isFollowing ?? false);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);

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
    setReplyParentId(null);
  };

  if (loading) {
    return <p className="text-center py-8">Loading profile…</p>;
  }
  if (error || !profile) {
    return <p className="text-center py-8 text-red-500">Error: {error}</p>;
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
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileHeader
        profile={profile}
        isOwn={isOwn}
        editing={editing}
        setEditing={setEditing}
        following={following}
        toggleFollow={toggleFollow}
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
          <ProfileStats
            profile={{ muskBucks: profile.muskBucks, rank: profile.rank }}
            stats={statsData}
            isOwn={isOwn}
          />
          <ProfileFollowers
            followersCount={profile.followersCount}
            followingCount={profile.followingCount}
          />
          <ProfileBadges badges={profile.badges} />

          <ProfileActivity activity={activity ?? []} />

          {isOwn ? (
            <CreatePostForm onSubmit={handlePost} disabled={loading} />
          ) : (
            <p className="text-gray-500">
              Only {profile.name} can post on their own wall. You can reply to posts below.
            </p>
          )}

          <ProfileFeed feed={feed} loading={loading} onReply={setReplyParentId} />

          {replyParentId !== null && currentUser && (
            <CreatePostForm onSubmit={handlePost} parentId={replyParentId} disabled={loading} />
          )}
        </>
      )}
    </div>
  );
}
