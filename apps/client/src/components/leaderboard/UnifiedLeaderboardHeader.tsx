import React from 'react';
import type { LeaderboardVariant, LeaderboardHeaderStats } from './types';

interface UnifiedLeaderboardHeaderProps {
  variant: LeaderboardVariant;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  stats?: LeaderboardHeaderStats;
  isLoading?: boolean;
}

const variantStyles = {
  betting: {
    iconColor: 'text-primary',
    titleColor: 'text-primary',
    bgGradient: 'from-primary/5 to-primary/10',
    borderColor: 'border-primary/20',
  },
  pong: {
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-500',
    bgGradient: 'from-blue-500/5 to-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  shame: {
    iconColor: 'text-red-500',
    titleColor: 'text-red-500',
    bgGradient: 'from-red-500/5 to-red-500/10',
    borderColor: 'border-red-500/20',
  },
};

export function UnifiedLeaderboardHeader({
  variant,
  title,
  subtitle,
  icon: Icon,
  stats,
  isLoading = false,
}: UnifiedLeaderboardHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`bg-gradient-to-r ${styles.bgGradient} border ${styles.borderColor} rounded-2xl overflow-hidden`}
    >
      <div className="p-6">
        {/* Title Section */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Icon className={`w-10 h-10 ${styles.iconColor}`} />
          <div className="text-center">
            <h1 className={`text-4xl font-extrabold ${styles.titleColor}`}>{title}</h1>
            <p className="text-sm text-tertiary mt-1">{subtitle}</p>
          </div>
          <Icon className={`w-10 h-10 ${styles.iconColor}`} />
        </div>

        {/* All Stats in Single Row */}
        {stats && (
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8">
            {/* Primary Stat */}
            <div className="text-center">
              <div className="text-2xl font-bold text-content">
                {isLoading ? (
                  <div className="h-8 bg-muted rounded animate-pulse w-20" />
                ) : (
                  stats.primary.value
                )}
              </div>
              <div className="text-sm text-tertiary">{stats.primary.label}</div>
            </div>

            {/* All Secondary Stats */}
            {stats.secondary.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-lg font-semibold text-content">
                  {isLoading ? (
                    <div className="h-6 bg-muted rounded animate-pulse w-16" />
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="text-xs text-tertiary">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
