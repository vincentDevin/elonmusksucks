export function ProfileHeader({
  profile,
  isOwn,
  editing,
  setEditing,
  following,
  toggleFollow,
  followersCount,
  followingCount,
}: {
  profile: any;
  isOwn: boolean;
  editing: boolean;
  setEditing: (val: boolean) => void;
  following: boolean;
  toggleFollow: () => void;
  followersCount: number;
  followingCount: number;
}) {
  return (
    <div className="bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <img
          src={profile.avatarUrl || '/default-avatar.png'}
          alt={profile.name}
          className="w-32 h-32 rounded-full object-cover border-2 border-muted"
        />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-content">{profile.name}</h1>
          <p className="text-tertiary">@{profile.name}</p>
          {profile.bio && <p className="mt-2 text-base text-content">{profile.bio}</p>}

          {/* Followers/Following counts */}
          <div className="flex justify-center sm:justify-start space-x-6 mt-3">
            <div>
              <span className="font-semibold text-content">{followersCount}</span>{' '}
              <span className="text-tertiary">Followers</span>
            </div>
            <div>
              <span className="font-semibold text-content">{followingCount}</span>{' '}
              <span className="text-tertiary">Following</span>
            </div>
          </div>
        </div>
        {isOwn ? (
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-primary text-surface rounded-lg hover:bg-primary/90 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        ) : (
          <button
            onClick={toggleFollow}
            className={`px-4 py-2 rounded-lg font-medium shadow transition-colors ${
              following
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {following ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
}
