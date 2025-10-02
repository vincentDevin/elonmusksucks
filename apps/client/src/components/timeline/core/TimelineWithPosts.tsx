import React, { useState, useCallback } from 'react';
import GenericFeed from '../../GenericFeed';
import { PostCard } from '../../posts/core/PostCard';
import { ArticleCard } from '../articles/ArticleCard';
import { ContentModal } from './ContentModal';
import UseAsSourceModal from '../articles/UseAsSourceModal';
import {
  fetchUnifiedFeed,
  searchUnifiedFeed,
  type UnifiedFeedItem,
} from '../../../utils/feedAdapter';
import type { TimelineItem, UserFeedPost } from '@ems/types';

interface TimelineWithPostsProps {
  className?: string;
  initialTab?: 'articles' | 'posts';
  searchQuery?: string;
  filters?: any;
}

/**
 * Enhanced Timeline component using GenericFeed for unified articles and posts
 * Now displays a single chronological feed instead of separate tabs
 */
export const TimelineWithPosts: React.FC<TimelineWithPostsProps> = ({
  className = '',
  searchQuery = '',
  filters,
}) => {
  const [selectedContent, setSelectedContent] = useState<UnifiedFeedItem | null>(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showUseAsSourceModal, setShowUseAsSourceModal] = useState(false);
  const [sourceItem, setSourceItem] = useState<TimelineItem | null>(null);

  // Handle content interactions (both articles and posts)
  const handleViewDetails = (item: UnifiedFeedItem) => {
    setSelectedContent(item);
    setShowUnifiedModal(true);
  };

  const handleUseAsSource = (item: TimelineItem) => {
    setSourceItem(item);
    setShowUseAsSourceModal(true);
  };

  const handleCloseUnifiedModal = () => {
    setShowUnifiedModal(false);
    setSelectedContent(null);
  };

  const handleCloseSourceModal = () => {
    setShowUseAsSourceModal(false);
    setSourceItem(null);
  };

  // Render function for unified feed items using proper components
  const renderFeedItem = (item: UnifiedFeedItem) => {
    if (item.type === 'article') {
      const article = item.originalData as TimelineItem;
      // Use ArticleCard component to get proper emoji reactions
      return (
        <ArticleCard
          item={article}
          onUseAsSource={() => handleUseAsSource(article)}
          onViewDetails={() => handleViewDetails(item)}
        />
      );
    } else {
      // Community Post - Use proper PostCard component
      const post = item.originalData as UserFeedPost;
      return (
        <PostCard
          post={post}
          showComments={false}
          onExpand={() => handleViewDetails(item)}
          onUpdate={(updatedPost) => {
            // Handle post updates (likes, etc.)
            console.log('Post updated:', updatedPost);
          }}
          onDelete={(postId) => {
            // Handle post deletion
            console.log('Post deleted:', postId);
          }}
        />
      );
    }
  };

  // Fetch function for GenericFeed
  const fetchItems = useCallback(
    async (params: any) => {
      if (searchQuery) {
        return searchUnifiedFeed({
          query: searchQuery,
          cursor: params.cursor,
          limit: params.limit,
          filters: filters,
        });
      } else {
        return fetchUnifiedFeed({
          cursor: params.cursor,
          limit: params.limit,
          filters: filters,
        });
      }
    },
    [searchQuery, filters],
  );

  return (
    <div className={className}>
      {/* Unified Feed using GenericFeed - NO MORE TABS! */}
      <GenericFeed<UnifiedFeedItem>
        fetchItems={fetchItems}
        renderItem={renderFeedItem}
        className="w-full"
        enableInfiniteScroll={true}
        enableSearch={false} // Search handled by parent Timeline component
        itemsPerPage={20}
        variant="list"
        spacing="normal"
        loadingComponent={
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-tertiary">Loading unified feed...</span>
          </div>
        }
        errorComponent={(error) => (
          <div className="text-center">
            <div className="text-error mb-2">⚠️ Error loading content</div>
            <p className="text-tertiary text-sm">{error}</p>
          </div>
        )}
        emptyComponent={
          <div className="text-center text-tertiary">
            <div className="text-4xl mb-2">📭</div>
            <p>No content available at the moment.</p>
            <p className="text-sm mt-2">Try adjusting your search or filters.</p>
          </div>
        }
      />

      {/* Unified Content Modal */}
      {showUnifiedModal && selectedContent && (
        <ContentModal
          content={selectedContent}
          isOpen={showUnifiedModal}
          onClose={handleCloseUnifiedModal}
        />
      )}

      {/* Use as Source Modal */}
      {showUseAsSourceModal && sourceItem && (
        <UseAsSourceModal
          item={sourceItem}
          isOpen={showUseAsSourceModal}
          onClose={handleCloseSourceModal}
        />
      )}
    </div>
  );
};
