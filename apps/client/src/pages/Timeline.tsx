import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TimelineProvider } from '../contexts/TimelineContext';
import { TimelineWithPosts } from '../components/timeline/TimelineWithPosts';
import { TrendingHashtags } from '../components/posts/TrendingHashtags';
import { TimelineSearch } from '../components/timeline/TimelineSearch';
import { TimelineFilters, type TimelineFilter } from '../components/timeline/TimelineFilters';
import { TrendingContent } from '../components/timeline/TrendingContent';
import { ActivitySummary } from '../components/timeline/ActivitySummary';
import { NotificationWidget } from '../components/timeline/NotificationWidget';
import { BookmarkSystem } from '../components/timeline/BookmarkSystem';
import { useAuth } from '../contexts/AuthContext';
import { timelineApi } from '../api/timeline';

export default function Timeline() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TimelineFilter>({
    dateRange: { start: null, end: null, preset: 'all' },
    contentType: ['all'],
    sources: [],
    authors: [],
    engagementLevel: 'all',
    sortBy: 'recent',
    hasMedia: null,
    hasReactions: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      // Clear search results if query is empty
      return;
    }

    try {
      // Call the search API using the existing axios pattern
      const data = await timelineApi.search({
        query,
        limit: 20,
      });
      console.log('Search results:', data);
      // Results will be handled by the TimelineWithPosts component
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, []);

  // Handle search suggestion clicks
  const handleSuggestionClick = useCallback(async (suggestion: any) => {
    // For now, just perform a regular search for all suggestion types
    // until we properly implement article ID mapping from suggestions
    setSearchQuery(suggestion.title);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: TimelineFilter) => {
    setFilters(newFilters);
    // TODO: Implement filter functionality
    console.log('Filters updated:', newFilters);
  }, []);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters({
      dateRange: { start: null, end: null, preset: 'all' },
      contentType: ['all'],
      sources: [],
      authors: [],
      engagementLevel: 'all',
      sortBy: 'recent',
      hasMedia: null,
      hasReactions: null,
    });
  }, []);

  return (
    <div className="bg-background text-content min-h-screen transition-colors duration-300">
      <TimelineProvider>
        <div className="w-full px-4 lg:px-6 xl:px-8">
          <div className="max-w-none">
            {/* Header Section with Search and Navigation */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Community Timeline</h1>
                  <p className="text-content/70">
                    Discover articles, join discussions, and stay connected with the community
                  </p>
                </div>
                {user && (
                  <div className="flex items-center space-x-3">
                    <NotificationWidget variant="bell" />
                    <div className="text-sm text-content/60">
                      Welcome back, <span className="font-medium text-primary">{user.name}</span>!
                    </div>
                  </div>
                )}
              </div>

              {/* Search and Filters Section */}
              <div className="bg-surface rounded-lg p-4 shadow mb-6">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <TimelineSearch
                    onSearch={handleSearch}
                    onSuggestionClick={handleSuggestionClick}
                    placeholder="Search articles, posts, users, or hashtags..."
                    className="w-full"
                  />

                  {/* Filter Toggle and Filters */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    {searchQuery && (
                      <div className="text-sm text-content/70">
                        Searching for: <span className="font-medium">"{searchQuery}"</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Filters */}
                  {showFilters && (
                    <TimelineFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                      compact={false}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Timeline Content - Takes up 3 columns on large screens */}
              <div className="lg:col-span-3">
                <div className="bg-surface shadow rounded-lg transition-colors duration-300">
                  <div className="p-6">
                    <TimelineWithPosts
                      initialTab="posts"
                      searchQuery={searchQuery}
                      filters={filters}
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Takes up 1 column on large screens */}
              <div className="lg:col-span-1">
                {/* Sticky sidebar container */}
                <div className="sticky top-4 space-y-6">
                  {/* Trending Content */}
                  <TrendingContent variant="sidebar" timeRange="day" limit={5} />

                  {/* Activity Summary - Replaces static stats */}
                  <ActivitySummary variant="compact" />

                  {/* Trending Hashtags */}
                  <TrendingHashtags limit={6} />

                  {/* Bookmarks Widget */}
                  <BookmarkSystem variant="widget" />

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
                </div>
              </div>
            </div>
          </div>
        </div>
      </TimelineProvider>
    </div>
  );
}
