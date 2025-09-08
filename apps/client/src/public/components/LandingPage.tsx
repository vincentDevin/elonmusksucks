import React from 'react';
import type { LandingPageProps } from '../types';
import Layout from './Layout';
import StatsDisplay from './StatsDisplay';
import TrendingPreview from './TrendingPreview';
import LeaderboardPreview from './LeaderboardPreview';
import ActivityPreview from './ActivityPreview';
import TimelinePreview from './TimelinePreview';

export default function LandingPage({
  marketData,
  trendingData,
  leaderboardData,
  activityData,
  articlesData,
  postsData,
  clientAppUrl,
  currentPath,
}: LandingPageProps) {
  // Transform market data for stats display
  const stats = marketData
    ? {
        totalPredictions: marketData.activeMarkets || 0,
        activeUsers: marketData.totalUsers || 0,
        muskBucksInCirculation: marketData.totalVolume
          ? `${(marketData.totalVolume / 1000000).toFixed(1)}M`
          : '0',
      }
    : {
        totalPredictions: 247,
        activeUsers: 1423,
        muskBucksInCirculation: '12.8M',
      };

  return (
    <Layout currentPath={currentPath} clientAppUrl={clientAppUrl}>
      <div className="bg-background text-content min-h-screen">
        <div className="container mx-auto px-4">
          {/* Landing Hero */}
          <div className="bg-surface shadow rounded-lg p-8 mb-8">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-4">ElonMuskSucks.net</h1>
              <p className="text-xl text-content/80 mb-2">
                Welcome to the world's most accurate Musk weather report.
              </p>
              <p className="text-lg text-content/70 mb-6">Forecast: erratic.</p>

              {/* Enhanced Stats Display */}
              <StatsDisplay {...stats} className="mb-8" />

              {/* CTAs */}
              <div className="flex justify-center space-x-4 mb-6">
                <a
                  href={`${clientAppUrl}/register`}
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Join the Community
                </a>
                <a
                  href="/predictions"
                  className="px-8 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold text-lg transition-colors"
                >
                  Browse Predictions
                </a>
              </div>

              {/* Secondary CTAs */}
              <div className="flex justify-center space-x-6 text-sm">
                <a
                  href={`${clientAppUrl}/login`}
                  className="text-primary hover:text-primary-hover font-medium"
                >
                  Already have an account? Sign in
                </a>
                <a href="/leaderboard" className="text-content/70 hover:text-content font-medium">
                  View Leaderboard
                </a>
              </div>
            </div>
          </div>

          {/* Public Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <TrendingPreview data={trendingData} clientAppUrl={clientAppUrl} />
            <LeaderboardPreview data={leaderboardData} clientAppUrl={clientAppUrl} />
          </div>

          {/* Activity Preview */}
          <div className="mb-8">
            <ActivityPreview data={activityData} clientAppUrl={clientAppUrl} />
          </div>

          {/* Timeline Preview */}
          <div className="mb-8">
            <TimelinePreview
              articlesData={articlesData}
              postsData={postsData}
              clientAppUrl={clientAppUrl}
            />
          </div>

          {/* How It Works Section */}
          <div className="bg-surface shadow rounded-lg p-8">
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
      </div>
    </Layout>
  );
}
