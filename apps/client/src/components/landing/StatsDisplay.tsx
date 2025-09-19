import React from 'react';

interface StatsDisplayProps {
  totalPredictions: number;
  activeUsers: number;
  muskBucksInCirculation: string;
  loading?: boolean;
  className?: string;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  totalPredictions,
  activeUsers,
  muskBucksInCirculation,
  loading = false,
  className = '',
}) => {
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

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-surface rounded-lg p-6 shadow transition-colors duration-300 animate-pulse"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="h-8 bg-muted/20 rounded w-16 mx-auto mb-2"></div>
              <div className="h-4 bg-muted/20 rounded w-24 mx-auto mb-1"></div>
              <div className="h-3 bg-muted/20 rounded w-32 mx-auto"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

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
        <div
          key={index}
          className="bg-surface rounded-lg p-6 shadow transition-colors duration-300 hover:shadow-lg group"
        >
          <div className="text-center">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
              {stat.icon}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
              {stat.isString ? stat.value : formatNumber(stat.value as number)}
            </div>
            <div className="text-lg font-semibold text-content mb-1">{stat.label}</div>
            <div className="text-sm text-content/70">{stat.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
