// apps/client/src/pages/Profile.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { followUser, unfollowUser, updateUserProfile } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UpdateProfilePayload } from '../api/users';

export default function Profile() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const numericId = Number(userId);

  // pull everything from the hook
  const {
    profile,
    loading,
    error,
    formData,
    setFormData,
    refresh: reloadProfile,
  } = useUserProfile(numericId);

  const isOwn = currentUser?.id === profile?.id;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(profile?.isFollowing ?? false);

  // Keep `following` in sync when profile changes
  useEffect(() => {
    setFollowing(profile?.isFollowing ?? false);
  }, [profile?.isFollowing]);

  const toggleFollow = useCallback(async () => {
    if (!profile) return;
    try {
      if (following) {
        await unfollowUser(profile.id);
        setFollowing(false);
      } else {
        await followUser(profile.id);
        setFollowing(true);
      }
      // Optimistically update count
      reloadProfile();
    } catch (e: any) {
      console.error(e);
      alert('Action failed: ' + e.toString());
    }
  }, [profile, following, reloadProfile]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile || !formData) return;
      setSaving(true);
      try {
        await updateUserProfile(profile.id, formData as UpdateProfilePayload);
        setEditing(false);
        await reloadProfile();
      } catch (e: any) {
        console.error(e);
        alert('Save failed: ' + e.toString());
      } finally {
        setSaving(false);
      }
    },
    [profile, formData, reloadProfile],
  );

  if (loading) {
    return <p className="text-center py-8">Loading profile…</p>;
  }
  if (error || !profile) {
    return <p className="text-center py-8 text-red-500">Error: {error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <img
          src={profile.avatarUrl || '/default-avatar.png'}
          alt={profile.name}
          className="w-32 h-32 rounded-full object-cover border-2 border-muted"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <p className="text-gray-500">@{profile.name}</p>
          {profile.bio && <p className="mt-2 text-base">{profile.bio}</p>}
        </div>
        {isOwn ? (
          <button
            onClick={() => setEditing((e) => !e)}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        ) : (
          <button
            onClick={toggleFollow}
            className={`px-4 py-2 rounded-full font-medium shadow ${
              following
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {following ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>

      {/* Edit Form */}
      {editing && formData && (
        <div className="bg-surface p-6 rounded-lg shadow space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Bio</span>
              <textarea
                value={formData.bio ?? ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Avatar URL</span>
              <input
                value={formData.avatarUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Location</span>
              <input
                value={formData.location ?? ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Timezone</span>
              <input
                value={formData.timezone ?? ''}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Stats & Content */}
      {!editing && (
        <>
          {/* Balance & Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-surface rounded-lg text-center">
              <div className="text-sm text-gray-500">MuskBucks</div>
              <div className="text-xl font-bold">{profile.muskBucks} 🪙</div>
            </div>
            {isOwn && (
              <div className="p-4 bg-surface rounded-lg text-center">
                <div className="text-sm text-gray-500">Rank</div>
                <div className="text-xl font-bold">#{profile.rank ?? '-'}</div>
              </div>
            )}
            <div className="p-4 bg-surface rounded-lg text-center">
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-xl font-bold">
                {(profile.stats.successRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-4 bg-surface rounded-lg text-center">
              <div className="text-sm text-gray-500">Streak</div>
              <div className="text-xl font-bold">
                {profile.stats.currentStreak} 🏆 (Best: {profile.stats.longestStreak})
              </div>
            </div>
          </div>

          {/* Followers/Following */}
          <div className="flex space-x-6">
            <div>
              <span className="font-semibold">{profile.followersCount}</span>{' '}
              <span className="text-gray-500">Followers</span>
            </div>
            <div>
              <span className="font-semibold">{profile.followingCount}</span>{' '}
              <span className="text-gray-500">Following</span>
            </div>
          </div>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Badges</h2>
              <div className="flex flex-wrap gap-3">
                {profile.badges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center space-x-2 bg-surface p-2 rounded-lg shadow-sm"
                  >
                    {b.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-6 h-6" />}
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-gray-500">
                        Awarded {new Date(b.awardedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
