export function ProfileStats({
  profile,
  stats,
  isOwn,
}: {
  profile: any;
  stats: any;
  isOwn: boolean;
}) {
  return (
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
          {isNaN(stats.successRate) ? '0%' : `${(stats.successRate * 100).toFixed(1)}%`}
        </div>
      </div>
      <div className="p-4 bg-surface rounded-lg text-center">
        <div className="text-sm text-gray-500">Streak</div>
        <div className="text-xl font-bold">
          {stats.currentStreak} 🏆 (Best: {stats.longestStreak})
        </div>
      </div>
    </div>
  );
}
