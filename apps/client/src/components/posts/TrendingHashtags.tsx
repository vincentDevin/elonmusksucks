import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

interface TrendingHashtag {
  id: number;
  tag: string;
  usageCount: number;
  trendingScore?: number;
}

interface TrendingHashtagsProps {
  className?: string;
  limit?: number;
  onHashtagClick?: (tag: string) => void;
}

export const TrendingHashtags: React.FC<TrendingHashtagsProps> = ({
  className = '',
  limit = 5,
  onHashtagClick,
}) => {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingHashtags();
    // Refresh trending hashtags every 5 minutes
    const interval = setInterval(fetchTrendingHashtags, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit]);

  const fetchTrendingHashtags = async () => {
    try {
      setLoading(true);
      const response = await api.get<TrendingHashtag[]>(
        `/api/posts/hashtags/trending?limit=${limit}`,
      );
      setHashtags(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch trending hashtags:', err);
      setError('Failed to load trending topics');
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (tag: string) => {
    onHashtagClick?.(tag);
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Trending Topics</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted/20 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-muted/20 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Trending Topics</h3>
        <p className="text-tertiary text-sm">{error}</p>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className={`bg-surface rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Trending Topics</h3>
        <p className="text-tertiary text-sm">No trending topics yet</p>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-content">Trending Topics</h3>
      <div className="space-y-2">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.id}
            to={`/hashtag/${hashtag.tag}`}
            onClick={() => handleHashtagClick(hashtag.tag)}
            className="block group hover:bg-muted/10 rounded-lg p-2 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-tertiary text-sm">{index + 1}.</span>
                  <span className="font-medium text-primary group-hover:underline">
                    #{hashtag.tag}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-tertiary">
                    {hashtag.trendingScore
                      ? `${hashtag.trendingScore} posts this week`
                      : `${hashtag.usageCount} total posts`}
                  </span>
                </div>
              </div>
              {hashtag.trendingScore && hashtag.trendingScore > 10 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  🔥 Hot
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <Link
        to="/hashtags/all"
        className="block mt-3 text-sm text-primary hover:underline text-center"
      >
        View all topics →
      </Link>
    </div>
  );
};
