interface StatsDisplayProps {
  totalPredictions: number;
  activeUsers: number;
  muskBucksInCirculation: string | number;
  loading?: boolean;
  className?: string;
}

export default function StatsDisplay({
  totalPredictions,
  activeUsers,
  muskBucksInCirculation,
  loading = false,
  className = '',
}: StatsDisplayProps) {
  const stats = [
    {
      label: 'Active Predictions',
      value: totalPredictions,
      description: 'Markets tracking Musk chaos',
      icon: '🔮',
    },
    {
      label: 'Chaos Observers',
      value: activeUsers,
      description: 'Users predicting mayhem',
      icon: '👥',
    },
    {
      label: 'MuskBucks in Play',
      value: muskBucksInCirculation,
      description: 'Virtual currency circulating',
      icon: '💰',
      isString: true,
    },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-surface rounded-lg p-6 shadow hover:shadow-lg group">
          <div className="text-center">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
              {stat.icon}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
              {loading ? '...' : stat.isString ? stat.value : formatNumber(stat.value as number)}
            </div>
            <div className="text-lg font-semibold text-content mb-1">{stat.label}</div>
            <div className="text-sm text-content/70">{stat.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
