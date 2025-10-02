import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TimelineProvider } from '../contexts/TimelineContext';
import {
  TimelineWithPosts,
  TimelineSearch,
  TimelineFilters,
  type TimelineFilter,
  ContentModal,
  CreatePost,
} from '../components/timeline/core';
import { TrendingHashtags } from '../components/posts/feeds';
import {
  TrendingContent,
  ActivitySummary,
  NotificationWidget,
  BookmarkSystem,
} from '../components/timeline/widgets';
import { convertArticleToFeedItem, type UnifiedFeedItem } from '../utils/feedAdapter';
import { useAuth } from '../contexts/AuthContext';
import { timelineApi } from '../api/timeline';
import type { TimelineItem } from '@ems/types';

export default function Timeline() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<UnifiedFeedItem | null>(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
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
  const [refreshKey, setRefreshKey] = useState(0);

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
    if (suggestion.type === 'article' && suggestion.id) {
      try {
        // Extract article ID from suggestion (assuming format 'article-123' or just '123')
        const articleId = parseInt(suggestion.id.toString().replace('article-', ''));

        if (!isNaN(articleId)) {
          // Fetch full article details using existing API
          const articleData = await timelineApi.getArticleDetails(articleId);

          // Convert to TimelineItem format for ArticleDrawer
          const timelineItem: TimelineItem = {
            id: `article-${articleId}`,
            type: 'article',
            timestamp: articleData.publishedAt || new Date().toISOString(),
            content: {
              title: articleData.title,
              excerpt: articleData.excerpt || undefined,
              author: articleData.feed?.name || 'Unknown Source',
              imageUrl: articleData.leadImageUrl || undefined,
              url: articleData.url,
            },
            engagement: {
              reactions: articleData.reactionsCount || 0,
              comments: articleData.commentsCount || 0,
            },
            tags: articleData.tags?.map((t) => t.name || String(t)) || [],
          };

          // Convert to UnifiedFeedItem and open ContentModal
          const unifiedItem = convertArticleToFeedItem(timelineItem);
          setSelectedContent(unifiedItem);
          setShowUnifiedModal(true);
          return;
        }
      } catch (error) {
        console.error('Failed to load article from suggestion:', error);
      }
    }

    // Fallback: just perform a search for all other types or if article loading fails
    setSearchQuery(suggestion.title || suggestion.value || suggestion);
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

  // Handle post created - refresh timeline feed
  const handlePostCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
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
              <div className="lg:col-span-3 space-y-6">
                {/* Create Post Component - Only shown for authenticated users */}
                {user && <CreatePost onPostCreated={handlePostCreated} />}

                {/* Timeline Feed */}
                <div className="bg-surface shadow rounded-lg transition-colors duration-300">
                  <div className="p-6">
                    <TimelineWithPosts
                      key={refreshKey}
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
                        className="block w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors text-center"
                      >
                        Make Prediction
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="block w-full px-4 py-2 text-sm bg-surface border border-border text-content rounded hover:bg-primary/10 transition-colors text-center"
                      >
                        View Leaderboard
                      </Link>
                      <Link
                        to="/pong"
                        className="block w-full px-4 py-2 text-sm bg-surface border border-border text-content rounded hover:bg-primary/10 transition-colors text-center"
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

      {/* Unified Content Modal for search suggestions */}
      {showUnifiedModal && selectedContent && (
        <ContentModal
          content={selectedContent}
          isOpen={showUnifiedModal}
          onClose={() => {
            setShowUnifiedModal(false);
            setSelectedContent(null);
          }}
        />
      )}
    </div>
  );
}
