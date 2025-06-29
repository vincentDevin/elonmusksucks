export function ProfileHeader({
  profile,
  isOwn,
  editing,
  setEditing,
  following,
  toggleFollow,
}: {
  profile: any;
  isOwn: boolean;
  editing: boolean;
  setEditing: (val: boolean) => void;
  following: boolean;
  toggleFollow: () => void;
}) {
  return (
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
          onClick={() => setEditing(!editing)}
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
  );
}
