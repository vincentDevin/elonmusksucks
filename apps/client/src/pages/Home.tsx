import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TimelineProvider } from '../contexts/TimelineContext';
import Timeline from '../components/timeline/Timeline';
import { useMarketOverview } from '../hooks/useMarketOverview';
import {
  TrendingPreview,
  LeaderboardPreview,
  ActivityPreview,
  StatsDisplay,
} from '../components/landing';

interface HomeStats {
  totalPredictions: number;
  activeUsers: number;
  muskBucksInCirculation: string;
}

/**
 * Public Home/Landing Page - Pure marketing and conversion focus
 * Authenticated users are redirected to /timeline for social features
 */
export default function Home() {
  const { data: marketData, loading: loadingStats, error } = useMarketOverview();

  const [stats, setStats] = useState<HomeStats>({
    totalPredictions: 0,
    activeUsers: 0,
    muskBucksInCirculation: '0',
  });

  useEffect(() => {
    if (marketData) {
      setStats({
        totalPredictions: marketData.activeMarkets || 0,
        activeUsers: marketData.totalUsers || 0,
        muskBucksInCirculation: marketData.totalVolume
          ? `${(marketData.totalVolume / 1000000).toFixed(1)}M`
          : '0',
      });
    } else if (error) {
      // Fallback to placeholder values on error
      setStats({
        totalPredictions: 247,
        activeUsers: 1423,
        muskBucksInCirculation: '12.8M',
      });
    }
  }, [marketData, error]);

  // Pure public landing page - authenticated users should go to /timeline
  return (
    <div className="bg-background text-content min-h-screen transition-colors duration-300">
      <TimelineProvider>
        <div className="container mx-auto px-4">
          {/* Landing Hero */}
          <div className="bg-surface shadow rounded-lg p-8 mb-8 transition-colors duration-300">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-4">ElonMuskSucks.net</h1>
              <p className="text-xl text-content/80 mb-2">
                Welcome to the world's most accurate Musk weather report.
              </p>
              <p className="text-lg text-content/70 mb-6">Forecast: erratic.</p>

              {/* Enhanced Stats Display */}
              <StatsDisplay
                totalPredictions={stats.totalPredictions}
                activeUsers={stats.activeUsers}
                muskBucksInCirculation={stats.muskBucksInCirculation}
                loading={loadingStats}
                className="mb-8"
              />

              {/* CTAs */}
              <div className="flex justify-center space-x-4 mb-6">
                <Link
                  to="/register"
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Join the Community
                </Link>
                <Link
                  to="/predictions"
                  className="px-8 py-3 bg-surface border border-border text-content rounded-lg hover:bg-hover font-semibold text-lg transition-colors"
                >
                  Browse Predictions
                </Link>
              </div>

              {/* Secondary CTAs */}
              <div className="flex justify-center space-x-6 text-sm">
                <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
                  Already have an account? Sign in
                </Link>
                <Link to="/leaderboard" className="text-content/70 hover:text-content font-medium">
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>

          {/* Public Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <TrendingPreview />
            <LeaderboardPreview />
          </div>

          {/* Activity Preview */}
          <div className="mb-8">
            <ActivityPreview />
          </div>

          {/* Timeline Section */}
          <div className="bg-surface shadow rounded-lg mb-8 transition-colors duration-300">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Live Musk Timeline</h2>
                  <p className="text-content/70">
                    Track the latest articles and tweets to predict what chaos comes next
                  </p>
                </div>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover font-medium text-sm"
                >
                  Join the community
                </Link>
              </div>
            </div>
            <div className="p-6">
              <Timeline />
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-surface shadow rounded-lg p-8 transition-colors duration-300">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Join the Community</h3>
                <p className="text-content/70 text-sm">
                  Connect with fellow Musk watchers, share insights, and react to community posts
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Make Predictions</h3>
                <p className="text-content/70 text-sm">
                  Use timeline events and community insights to predict Tesla stock moves, SpaceX
                  launches, and Twitter chaos
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Earn MuskBucks</h3>
                <p className="text-content/70 text-sm">
                  Climb the leaderboard and earn bragging rights for your prediction skills
                </p>
              </div>
            </div>
          </div>
        </div>
      </TimelineProvider>
    </div>
  );
}
