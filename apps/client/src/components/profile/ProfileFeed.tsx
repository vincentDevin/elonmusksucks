import React, { useState, useCallback } from 'react';
import GenericFeed from '../GenericFeed';
import { PostCard } from '../posts/core/PostCard';
import { ContentModal } from '../timeline/core';
import { fetchUserPostsFeed, type UnifiedFeedItem } from '../../utils/feedAdapter';
import type { UserFeedPost } from '@ems/types';

interface ProfileFeedProps {
  userId: number;
  includeReplies?: boolean;
  className?: string;
}

/**
 * Profile-specific feed component using GenericFeed pattern
 * Shows only posts from the specified user
 */
export const ProfileFeed: React.FC<ProfileFeedProps> = ({
  userId,
  includeReplies = false,
  className = '',
}) => {
  const [selectedContent, setSelectedContent] = useState<UnifiedFeedItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Handle post interactions
  const handleViewDetails = (item: UnifiedFeedItem) => {
    setSelectedContent(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContent(null);
  };

  // Render function for post items
  const renderFeedItem = (item: UnifiedFeedItem) => {
    // Profile feed only shows posts, not articles
    const post = item.originalData as UserFeedPost;
    return (
      <PostCard
        post={post}
        showComments={true}
        onExpand={() => handleViewDetails(item)}
        onUpdate={(updatedPost) => {
          // Handle post updates (reactions, etc.)
          console.log('Post updated:', updatedPost);
        }}
        onDelete={(postId) => {
          // Handle post deletion
          console.log('Post deleted:', postId);
        }}
      />
    );
  };

  // Fetch function for GenericFeed
  const fetchItems = useCallback(
    async (params: any) => {
      return fetchUserPostsFeed({
        userId,
        cursor: params.cursor,
        limit: params.limit,
        includeReplies,
      });
    },
    [userId, includeReplies],
  );

  return (
    <div className={className}>
      {/* User Posts Feed using GenericFeed */}
      <GenericFeed<UnifiedFeedItem>
        fetchItems={fetchItems}
        renderItem={renderFeedItem}
        className="w-full"
        enableInfiniteScroll={true}
        enableSearch={false}
        itemsPerPage={20}
        variant="list"
        spacing="normal"
        loadingComponent={
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-tertiary">Loading posts...</span>
          </div>
        }
        errorComponent={(error) => (
          <div className="text-center">
            <div className="text-error mb-2">⚠️ Error loading posts</div>
            <p className="text-tertiary text-sm">{error}</p>
          </div>
        )}
        emptyComponent={
          <div className="text-center text-tertiary py-8">
            <div className="text-4xl mb-2">📝</div>
            <p>No posts yet.</p>
            <p className="text-sm mt-2">This user hasn't posted anything yet.</p>
          </div>
        }
      />

      {/* Post Detail Modal */}
      {showModal && selectedContent && (
        <ContentModal content={selectedContent} isOpen={showModal} onClose={handleCloseModal} />
      )}
    </div>
  );
};
