import React, { useState, useCallback } from 'react';
import GenericFeed from '../../GenericFeed';
import { PostCard } from '../core/PostCard';
import { ContentModal } from '../../timeline/core';
import { fetchUnifiedFeed, type UnifiedFeedItem } from '../../../utils/feedAdapter';
import { CreatePostForm } from '../../profile/CreatePostForm';
import { createPost } from '../../../api/posts';
import { useAuth } from '../../../contexts/AuthContext';
import type { UserFeedPost } from '@ems/types';

interface CommunityPostsProps {
  className?: string;
  showCreateForm?: boolean;
}

export const CommunityPosts: React.FC<CommunityPostsProps> = ({
  className = '',
  showCreateForm = true,
}) => {
  const { user } = useAuth();
  const [selectedContent, setSelectedContent] = useState<UnifiedFeedItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle post interactions
  const handleViewDetails = (item: UnifiedFeedItem) => {
    setSelectedContent(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContent(null);
  };

  // Handle creating new posts
  const handleCreatePost = async (content: string, parentId?: number | null, options?: any) => {
    if (!user) return;

    try {
      await createPost({
        content,
        contentType: options?.contentType || 'TEXT',
        visibility: options?.visibility || 'PUBLIC',
        mediaUrls: options?.mediaUrls || [],
        linkPreview: options?.linkPreview,
        parentId,
      });

      // Refresh the feed by incrementing the key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  };

  // Render function for feed items (only posts, not articles)
  const renderFeedItem = (item: UnifiedFeedItem) => {
    // Filter to only show posts, not articles
    if (item.type !== 'post') return null;

    const post = item.originalData as UserFeedPost;
    return (
      <PostCard
        post={post}
        showComments={false}
        onExpand={() => handleViewDetails(item)}
        onUpdate={(updatedPost) => {
          console.log('Post updated:', updatedPost);
        }}
        onDelete={(postId) => {
          console.log('Post deleted:', postId);
          // Refresh feed after deletion
          setRefreshKey((prev) => prev + 1);
        }}
      />
    );
  };

  // Fetch function that filters to only posts
  const fetchItems = useCallback(
    async (params: any) => {
      const response = await fetchUnifiedFeed({
        cursor: params.cursor,
        limit: params.limit,
        filters: {
          ...params.filters,
          contentType: ['post'], // Only fetch posts, not articles
        },
      });

      // Filter out any articles that might have slipped through
      const postItems = response.items.filter((item) => item.type === 'post');

      return {
        ...response,
        items: postItems,
      };
    },
    [refreshKey],
  ); // Include refreshKey to trigger refetch

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-content">Community Posts</h2>
      </div>

      {/* Create post form for authenticated users */}
      {showCreateForm && user && (
        <div className="mb-6">
          <CreatePostForm
            onSubmit={handleCreatePost}
            showVisibilityOptions={true}
            placeholder="Share your thoughts with the community..."
          />
        </div>
      )}

      {/* Posts feed using GenericFeed */}
      <GenericFeed<UnifiedFeedItem>
        key={refreshKey} // Force refresh when key changes
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
            <span className="text-tertiary">Loading community posts...</span>
          </div>
        }
        errorComponent={(error) => (
          <div className="text-center">
            <div className="text-error mb-2">⚠️ Error loading posts</div>
            <p className="text-tertiary text-sm">{error}</p>
          </div>
        )}
        emptyComponent={
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-tertiary mb-4">No community posts yet.</p>
            {user && showCreateForm && (
              <p className="text-sm text-tertiary/80">Be the first to share something!</p>
            )}
            {!user && (
              <p className="text-sm text-tertiary/80">
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>{' '}
                to join the conversation
              </p>
            )}
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
