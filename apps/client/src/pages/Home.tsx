import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TimelineProvider } from '../contexts/TimelineContext';
import Timeline from '../components/timeline/Timeline';
import { useAuth } from '../hooks/useAuth';

interface HomeStats {
  totalPredictions: number;
  activeUsers: number;
  muskBucksInCirculation: string;
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HomeStats>({
    totalPredictions: 0,
    activeUsers: 0,
    muskBucksInCirculation: '0'
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch real stats from market overview API
        const response = await fetch('/api/market/overview');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalPredictions: data.totalPredictions || 0,
            activeUsers: data.totalUsers || 0,
            muskBucksInCirculation: data.totalVolume ? `${(data.totalVolume / 1000000).toFixed(1)}M` : '0'
          });
        } else {
          // Fallback to placeholder values
          setStats({
            totalPredictions: 247,
            activeUsers: 1423,
            muskBucksInCirculation: '12.8M'
          });
        }
      } catch (error) {
        console.error('Failed to fetch market stats:', error);
        // Fallback to placeholder values
        setStats({
          totalPredictions: 247,
          activeUsers: 1423,
          muskBucksInCirculation: '12.8M'
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // If user is logged in, redirect to dashboard or show different layout
  if (user) {
    return (
      <div className="container mx-auto px-4 bg-background text-content min-h-screen transition-colors duration-300">
        <TimelineProvider>
          <div className="max-w-6xl mx-auto">
            {/* Welcome Back Hero */}
            <div className="bg-surface shadow rounded-lg p-6 mb-8 transition-colors duration-300">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
                <p className="text-muted mb-4">Ready for more Musk chaos predictions?</p>
                <div className="flex justify-center space-x-4">
                  <Link 
                    to="/dashboard" 
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                  >
                    Your Dashboard
                  </Link>
                  <Link 
                    to="/predictions" 
                    className="px-6 py-2 bg-surface border border-border text-content rounded hover:bg-hover font-medium"
                  >
                    Browse Predictions
                  </Link>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="bg-surface shadow rounded-lg transition-colors duration-300">
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-bold mb-2">Latest Musk Timeline</h2>
                <p className="text-muted">Stay updated with the latest chaos from the Musk-verse</p>
              </div>
              <div className="p-6">
                <Timeline />
              </div>
            </div>
          </div>
        </TimelineProvider>
      </div>
    );
  }

  // Landing page for non-logged in users
  return (
    <div className="bg-background text-content min-h-screen transition-colors duration-300">
      <TimelineProvider>
        <div className="container mx-auto px-4">
          {/* Landing Hero */}
          <div className="bg-surface shadow rounded-lg p-8 mb-8 transition-colors duration-300">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-4">ElonMuskSucks.net</h1>
              <p className="text-xl text-muted mb-2">
                Welcome to the world's most accurate Musk weather report.
              </p>
              <p className="text-lg text-muted mb-6">
                Forecast: erratic.
              </p>
              
              {/* Stats Row */}
              <div className="flex justify-center space-x-8 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {loadingStats ? '...' : stats.totalPredictions}
                  </div>
                  <div className="text-sm text-muted">Active Predictions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {loadingStats ? '...' : stats.activeUsers}
                  </div>
                  <div className="text-sm text-muted">Chaos Observers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {loadingStats ? '...' : stats.muskBucksInCirculation}
                  </div>
                  <div className="text-sm text-muted">MuskBucks in Play</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex justify-center space-x-4 mb-6">
                <Link 
                  to="/register" 
                  className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors"
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
                <Link to="/leaderboard" className="text-muted hover:text-content font-medium">
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-surface shadow rounded-lg mb-8 transition-colors duration-300">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Live Musk Timeline</h2>
                  <p className="text-muted">
                    Track the latest articles and tweets to predict what chaos comes next
                  </p>
                </div>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover font-medium text-sm"
                >
                  Sign up to predict
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
                <h3 className="font-semibold mb-2">Track the Timeline</h3>
                <p className="text-muted text-sm">
                  Follow real-time articles and tweets about Elon Musk's ventures
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Make Predictions</h3>
                <p className="text-muted text-sm">
                  Use timeline events to predict Tesla stock moves, SpaceX launches, and Twitter chaos
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Earn MuskBucks</h3>
                <p className="text-muted text-sm">
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
