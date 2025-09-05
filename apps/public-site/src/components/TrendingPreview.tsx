import React from 'react';
import type { TrendingPreviewProps } from '../types';

export default function TrendingPreview({
  data,
  className = '',
  clientAppUrl,
}: TrendingPreviewProps) {
  // Use fallback data if API data is not available or not an array
  const predictions = (Array.isArray(data) ? data : null) || [
    {
      id: 1,
      title: 'Will Tesla stock hit $300 this month?',
      category: 'Tesla',
      volume: 125000,
      betCount: 234,
      expiresAt: '2025-01-31T23:59:59Z',
    },
    {
      id: 2,
      title: 'Next Twitter/X controversy prediction',
      category: 'Twitter',
      volume: 98500,
      betCount: 189,
      expiresAt: '2025-01-28T23:59:59Z',
    },
    {
      id: 3,
      title: 'SpaceX launch delays this quarter',
      category: 'SpaceX',
      volume: 87200,
      betCount: 156,
      expiresAt: '2025-03-31T23:59:59Z',
    },
  ];

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Tesla: 'bg-red-100 text-red-800',
      Twitter: 'bg-blue-100 text-blue-800',
      SpaceX: 'bg-purple-100 text-purple-800',
      Neuralink: 'bg-green-100 text-green-800',
      default: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.default;
  };

  return (
    <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">🔥 Trending Predictions</h2>
        <a href="/predictions" className="text-primary hover:underline text-sm font-medium">
          View all →
        </a>
      </div>

      <div className="space-y-4">
        {predictions.slice(0, 5).map((prediction, index) => (
          <div
            key={prediction.id}
            className="border border-border rounded-lg p-4 hover:bg-muted/5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-tertiary text-sm">#{index + 1}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(prediction.category)}`}
                  >
                    {prediction.category}
                  </span>
                </div>
                <h3 className="font-medium text-content text-sm leading-snug mb-2">
                  {prediction.title}
                </h3>
                <div className="flex items-center space-x-4 text-xs text-tertiary">
                  <span>💰 {formatVolume(prediction.volume)} MuskBucks</span>
                  <span>👥 {prediction.betCount} bets</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`${clientAppUrl}/register`}
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Join the action!
        </a>
      </div>
    </div>
  );
}
