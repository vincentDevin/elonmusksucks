import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, followUser, unfollowUser } from '../api/users';
import type { UserProfile } from '../api/users';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getUserProfile(Number(userId))
      .then((data) => {
        setProfile(data);
        setFollowing(data.isFollowing);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleFollow = async () => {
    if (!profile) return;
    try {
      if (following) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      setFollowing(!following);
      setProfile({ ...profile, followersCount: profile.followersCount + (following ? -1 : 1) });
    } catch (e: any) {
      console.error(e);
    }
  };

  if (loading) {
    return <p className="text-center py-8">Loading profile…</p>;
  }
  if (error || !profile) {
    return <p className="text-center py-8 text-red-500">Error: {error}</p>;
  }

  const isOwn = currentUser?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <img
          src={profile.avatarUrl || '/default-avatar.png'}
          alt={profile.displayName || profile.username}
          className="w-32 h-32 rounded-full object-cover border-2 border-muted"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{profile.displayName || profile.username}</h1>
          <p className="text-gray-500">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-base">{profile.bio}</p>}
        </div>
        {!isOwn && (
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
          <div className="text-xl font-bold">{(profile.stats.successRate * 100).toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-surface rounded-lg text-center">
          <div className="text-sm text-gray-500">Streak</div>
          <div className="text-xl font-bold">
            {profile.stats.currentStreak} 🏆 (Best: {profile.stats.longestStreak})
          </div>
        </div>
      </div>

      {/* Social Counts */}
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
    </div>
  );
}
