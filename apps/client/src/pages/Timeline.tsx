import { Link } from 'react-router-dom';
import { TimelineProvider } from '../contexts/TimelineContext';
import { TimelineWithPosts } from '../components/timeline/TimelineWithPosts';
import { TrendingHashtags } from '../components/posts/TrendingHashtags';
import { useAuth } from '../contexts/AuthContext';

export default function Timeline() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 bg-background text-content min-h-screen transition-colors duration-300">
      <TimelineProvider>
        <div className="max-w-7xl mx-auto">
          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Timeline Content - Takes up 3 columns on large screens */}
            <div className="lg:col-span-3">
              <div className="bg-surface shadow rounded-lg transition-colors duration-300">
                <div className="p-6 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Community Feed</h2>
                      <p className="text-content/70">
                        Stay updated with articles and join the conversation
                      </p>
                    </div>
                    {user && (
                      <div className="text-sm text-content/60">
                        Welcome back, <span className="font-medium text-primary">{user.name}</span>!
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <TimelineWithPosts initialTab="posts" />
                </div>
              </div>
            </div>

            {/* Right Sidebar - Takes up 1 column on large screens */}
            <div className="lg:col-span-1 space-y-6">
              {/* Trending Hashtags */}
              <TrendingHashtags limit={8} className="sticky top-4" />

              {/* Quick Actions Card */}
              <div className="bg-surface rounded-lg p-4 shadow transition-colors duration-300">
                <h3 className="text-lg font-semibold mb-3 text-content">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    to="/predictions"
                    className="block w-full px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors text-center"
                  >
                    Make Prediction
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="block w-full px-4 py-2 text-sm bg-surface border border-border text-content rounded hover:bg-hover transition-colors text-center"
                  >
                    View Leaderboard
                  </Link>
                  <Link
                    to="/pong"
                    className="block w-full px-4 py-2 text-sm bg-surface border border-border text-content rounded hover:bg-hover transition-colors text-center"
                  >
                    Play Pong
                  </Link>
                </div>
              </div>

              {/* Community Stats */}
              <div className="bg-surface rounded-lg p-4 shadow transition-colors duration-300">
                <h3 className="text-lg font-semibold mb-3 text-content">Your Activity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content/70">Posts today:</span>
                    <span className="font-medium">--</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content/70">Reactions given:</span>
                    <span className="font-medium">--</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content/70">Comments posted:</span>
                    <span className="font-medium">--</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <Link to="/profile" className="text-primary hover:underline text-sm">
                    View your profile →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TimelineProvider>
    </div>
  );
}
