import { useState, useCallback } from 'react';
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

  // Widget expansion states
  const [expandedWidgets, setExpandedWidgets] = useState({
    trending: false,
    activity: false,
    bookmarks: false,
  });

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

  // Toggle widget expansion
  const toggleWidget = useCallback((widget: keyof typeof expandedWidgets) => {
    setExpandedWidgets((prev) => ({
      ...prev,
      [widget]: !prev[widget],
    }));
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
                    <TrendingWidget timeRange="day" limit={expandedWidgets.trending ? 12 : 3} />
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
                    <ActivitySummary variant={expandedWidgets.activity ? 'full' : 'compact'} />
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
                    <BookmarkSystem variant={expandedWidgets.bookmarks ? 'manager' : 'widget'} />
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
