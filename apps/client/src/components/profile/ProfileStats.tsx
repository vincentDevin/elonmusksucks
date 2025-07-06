export function ProfileStats({
  profile,
  stats,
  isOwn,
}: {
  profile: {
    muskBucks: number;
    rank?: number;
  };
  stats: {
    successRate: number;
    totalPredictions: number;
    currentStreak: number;
    longestStreak: number;
  };
  isOwn: boolean;
}) {
  // build an array of tiles, filtering out `rank` when not own
  const tiles = [
    { label: 'MuskBucks', value: `${profile.muskBucks} 🪙` },
    isOwn && { label: 'Rank', value: `#${profile.rank ?? '-'}` },
    { label: 'Predictions', value: stats.totalPredictions.toString() },
    {
      label: 'Win Rate',
      value: `${isNaN(stats.successRate) ? '0.0' : (stats.successRate * 100).toFixed(1)}%`,
    },
    { label: 'Current Streak', value: `${stats.currentStreak}` },
    { label: 'Best Streak', value: `${stats.longestStreak}` },
  ].filter((t): t is { label: string; value: string } => Boolean(t));

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(({ label, value }) => (
        <div
          key={label}
          className="p-4 bg-surface rounded-lg text-center flex flex-col justify-center"
        >
          <div className="text-sm text-tertiary uppercase">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      ))}
    </div>
  );
}
