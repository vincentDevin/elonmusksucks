import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { TimelineProvider } from '../contexts/TimelineContext';
import {
  TimelineWithPosts,
  TimelineSearch,
  TimelineFilters,
  type TimelineFilter,
  ContentModal,
  CreatePost,
} from '../components/timeline/core';
import { TrendingWidget, ActivitySummary, BookmarkSystem } from '../components/timeline/widgets';
import {
  convertArticleToFeedItem,
  convertPostToFeedItem,
  type UnifiedFeedItem,
} from '../utils/feedAdapter';
import { useAuth } from '../contexts/AuthContext';
import { timelineApi } from '../api/timeline';
import { getPost } from '../api/posts';
import type { TimelineItem, TrendingItem } from '@ems/types';

export default function Timeline() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<UnifiedFeedItem | null>(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [filters, setFilters] = useState<TimelineFilter>({
    contentType: ['all'],
    sortBy: 'newest',
    hasMedia: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Widget expansion states
  const [expandedWidgets, setExpandedWidgets] = useState({
    trending: false,
    activity: false,
    bookmarks: false,
  });

  // Initialize from URL parameters on mount, then clear them
  useEffect(() => {
    const search = searchParams.get('search');
    const hashtag = searchParams.get('hashtag');

    // Only process if there are URL params
    if (search || hashtag) {
      // Set search query if present
      if (search) {
        setSearchQuery(search);
      }

      // Set hashtag filter if present
      if (hashtag) {
        setSearchQuery(`#${hashtag}`);
      }

      // Clear URL params after reading them so they don't persist
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Helper function to fetch and open article in modal
  const fetchAndOpenArticle = useCallback(async (articleId: number) => {
    try {
      // Fetch full article details
      const articleData = await timelineApi.getArticleDetails(articleId);

      // Convert to TimelineItem format
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

      // Convert to UnifiedFeedItem and open modal
      const unifiedItem = convertArticleToFeedItem(timelineItem);
      setSelectedContent(unifiedItem);
      setShowUnifiedModal(true);
    } catch (error) {
      console.error('Failed to load article:', error);
    }
  }, []);

  // Helper function to fetch and open post in modal
  const fetchAndOpenPost = useCallback(async (postId: number) => {
    try {
      // Fetch full post details
      const postData = await getPost(postId);

      // Convert to UnifiedFeedItem and open modal
      const unifiedItem = convertPostToFeedItem(postData);
      setSelectedContent(unifiedItem);
      setShowUnifiedModal(true);
    } catch (error) {
      console.error('Failed to load post:', error);
    }
  }, []);

  // Handle search - clears filters and sets new search query
  const handleSearch = useCallback((query: string) => {
    // Check if searching for a user (starts with @)
    if (query.trim().startsWith('@')) {
      // Extract username (remove @ prefix)
      const username = query.trim().substring(1);

      // Set search query without the @ for backend
      setSearchQuery(username);

      // Filter to show only posts (users don't write articles)
      setFilters({
        contentType: ['post'],
        sortBy: 'newest',
        hasMedia: null,
      });
    } else {
      // Regular search - reset all filters
      setFilters({
        contentType: ['all'],
        sortBy: 'newest',
        hasMedia: null,
      });
      setSearchQuery(query);
    }

    // Trigger a refresh to fetch new results
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: TimelineFilter) => {
      // Check if filters that require a fresh fetch changed
      const contentTypeChanged =
        JSON.stringify(filters.contentType) !== JSON.stringify(newFilters.contentType);
      const sortByChanged = filters.sortBy !== newFilters.sortBy;
      const mediaFilterChanged = filters.hasMedia !== newFilters.hasMedia;

      setFilters(newFilters);

      // Force refresh when meaningful filters change
      if (contentTypeChanged || sortByChanged || mediaFilterChanged) {
        setRefreshKey((prev) => prev + 1);
      }
    },
    [filters],
  );

  // Reset filters and search completely
  const handleResetFilters = useCallback(() => {
    setSearchQuery(''); // Clear search query
    setFilters({
      contentType: ['all'],
      sortBy: 'newest',
      hasMedia: null,
    });
    setRefreshKey((prev) => prev + 1); // Force refresh to show default timeline
  }, []);

  // Handle post created - refresh timeline feed
  const handlePostCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Toggle widget expansion
  const toggleWidget = useCallback((widget: keyof typeof expandedWidgets) => {
    setExpandedWidgets((prev) => ({
      ...prev,
      [widget]: !prev[widget],
    }));
  }, []);

  // Handle trending item clicks
  const handleTrendingItemClick = useCallback(
    async (item: TrendingItem) => {
      // Extract numeric ID from string ID (e.g., "article-123" -> 123)
      const numericId = parseInt(item.id.replace(/^(article-|post-)/, ''));

      if (isNaN(numericId)) {
        console.error('Invalid content ID:', item.id);
        return;
      }

      if (item.type === 'article') {
        await fetchAndOpenArticle(numericId);
      } else if (item.type === 'post') {
        await fetchAndOpenPost(numericId);
      }
    },
    [fetchAndOpenArticle, fetchAndOpenPost],
  );

  // Handle bookmark clicks
  const handleBookmarkClick = useCallback(
    async (articleId: number) => {
      await fetchAndOpenArticle(articleId);
    },
    [fetchAndOpenArticle],
  );

  // Handle hashtag clicks from TrendingWidget
  const handleHashtagClick = useCallback((tag: string) => {
    // Use search functionality instead of URL params
    setSearchQuery(`#${tag}`);
  }, []);

  return (
    <div className="bg-background text-content min-h-screen transition-colors duration-300 mt-4">
      <TimelineProvider>
        <div className="w-full px-4 lg:px-6 xl:px-8">
          <div className="max-w-none">
            {/* Header Section with Search and Navigation */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div>
                  <p className="text-content/70">
                    Discover articles, join discussions, and stay connected with the community
                  </p>
                </div>
                {user && (
                  <div className="text-sm text-content/60">
                    Welcome back, <span className="font-medium text-primary">{user.name}</span>!
                  </div>
                )}
              </div>

              {/* Search and Filters Section - Compact Single Row */}
              <div className="bg-surface rounded-lg px-4 py-2.5 shadow mb-4">
                {/* Desktop: Single Row, Mobile: Stack */}
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Search Bar - Takes available space */}
                  <div className="flex-1 min-w-0">
                    <TimelineSearch onSearch={handleSearch} className="w-full" />
                  </div>

                  {/* Filters - Compact inline */}
                  <div className="flex-shrink-0">
                    <TimelineFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                      hasSearchQuery={!!searchQuery}
                    />
                  </div>
                </div>

                {/* Active Search Indicator - Only show if searching */}
                {searchQuery && (
                  <div className="text-xs text-content/60 text-center mt-2">
                    {filters.contentType.includes('post') &&
                    !filters.contentType.includes('all') ? (
                      <>
                        Searching posts by user: <span className="font-medium">@{searchQuery}</span>
                      </>
                    ) : (
                      <>
                        Searching for: <span className="font-medium">"{searchQuery}"</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Main Timeline Content - Takes up 3 columns on large screens */}
              <div className="lg:col-span-3 space-y-6">
                {/* Create Post Component - Only shown for authenticated users */}
                {user && <CreatePost onPostCreated={handlePostCreated} />}

                {/* Timeline Feed */}
                <div className=" shadow rounded-lg transition-colors duration-300">
                  <TimelineWithPosts
                    key={refreshKey}
                    initialTab="posts"
                    searchQuery={searchQuery}
                    filters={filters}
                  />
                </div>
              </div>

              {/* Right Sidebar - Takes up 2 columns on large screens */}
              <div className="lg:col-span-2">
                {/* Sticky sidebar container */}
                <div className="sticky top-4 space-y-4 self-start">
                  {/* Trending Content & Topics - Combined Widget */}
                  <div className="relative group">
                    <div
                      onClick={() => toggleWidget('trending')}
                      className="absolute left-0 top-0 right-16 h-10 cursor-pointer z-10 rounded-tl-lg hover:bg-muted/5 transition-colors"
                      title={expandedWidgets.trending ? 'Click to collapse' : 'Click to expand'}
                    />
                    <TrendingWidget
                      timeRange="day"
                      limit={expandedWidgets.trending ? 12 : 3}
                      onItemClick={handleTrendingItemClick}
                      onHashtagClick={handleHashtagClick}
                      isExpanded={expandedWidgets.trending}
                    />
                    <div className="absolute top-3 right-4 pointer-events-none">
                      {expandedWidgets.trending ? (
                        <ChevronUpIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Activity Summary - Replaces static stats */}
                  <div className="relative group">
                    <div
                      onClick={() => toggleWidget('activity')}
                      className="absolute inset-x-0 top-0 h-14 cursor-pointer z-10 rounded-t-lg hover:bg-muted/5 transition-colors"
                      title={expandedWidgets.activity ? 'Click to collapse' : 'Click to expand'}
                    />
                    <ActivitySummary
                      variant={expandedWidgets.activity ? 'full' : 'compact'}
                      isExpanded={expandedWidgets.activity}
                    />
                    <div className="absolute top-4 right-4 pointer-events-none">
                      {expandedWidgets.activity ? (
                        <ChevronUpIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Bookmarks Widget */}
                  <div className="relative group">
                    <div
                      onClick={() => toggleWidget('bookmarks')}
                      className="absolute inset-x-0 top-0 h-14 cursor-pointer z-10 rounded-t-lg hover:bg-muted/5 transition-colors"
                      title={expandedWidgets.bookmarks ? 'Click to collapse' : 'Click to expand'}
                    />
                    <BookmarkSystem
                      variant={expandedWidgets.bookmarks ? 'manager' : 'widget'}
                      onBookmarkClick={handleBookmarkClick}
                      isExpanded={expandedWidgets.bookmarks}
                    />
                    <div className="absolute top-[1.125rem] right-4 pointer-events-none">
                      {expandedWidgets.bookmarks ? (
                        <ChevronUpIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                      )}
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
