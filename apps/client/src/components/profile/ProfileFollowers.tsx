export function ProfileFollowers({
  followersCount,
  followingCount,
}: {
  followersCount: number;
  followingCount: number;
}) {
  return (
    <div className="flex space-x-6">
      <div>
        <span className="font-semibold">{followersCount}</span>{' '}
        <span className="text-gray-500">Followers</span>
      </div>
      <div>
        <span className="font-semibold">{followingCount}</span>{' '}
        <span className="text-gray-500">Following</span>
      </div>
    </div>
  );
}
