// apps/client/src/hooks/useTimelineSocket.ts
// Rollback: Revert to string literals in socket handlers, remove typed imports
import { useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { TimelineSocketEvents, type TimelineUpdatePayload } from '@ems/types';

interface UseTimelineSocketProps {
  activeTab: 'articles' | 'tweets';
  onNewArticles?: (articles: TimelineUpdatePayload) => void;
  onNewTweets?: (tweets: TimelineUpdatePayload) => void;
  onArticleUpdate?: (article: TimelineUpdatePayload) => void;
  onModerationUpdate?: (data: TimelineUpdatePayload) => void;
}

/**
 * Custom hook for Timeline Socket.IO real-time updates
 * Handles:
 * - New approved articles
 * - New tweets
 * - Article updates
 * - Admin moderation events
 */
export const useTimelineSocket = ({
  activeTab,
  onNewArticles,
  onNewTweets,
  onArticleUpdate,
  onModerationUpdate,
}: UseTimelineSocketProps) => {
  const { socket, isConnected } = useSocket();

  // Handle new approved articles
  const handleNewArticles = useCallback(
    (data: TimelineUpdatePayload) => {
      if (activeTab === 'articles' && onNewArticles) {
        onNewArticles(data);
      }
    },
    [activeTab, onNewArticles],
  );

  // Handle new tweets
  const handleNewTweets = useCallback(
    (data: TimelineUpdatePayload) => {
      if (activeTab === 'tweets' && onNewTweets) {
        onNewTweets(data);
      }
    },
    [activeTab, onNewTweets],
  );

  // Handle article updates
  const handleArticleUpdate = useCallback(
    (data: TimelineUpdatePayload) => {
      if (onArticleUpdate) {
        onArticleUpdate(data);
      }
    },
    [onArticleUpdate],
  );

  // Handle admin moderation updates
  const handleModerationUpdate = useCallback(
    (data: TimelineUpdatePayload) => {
      if (onModerationUpdate) {
        onModerationUpdate(data);
      }
    },
    [onModerationUpdate],
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to timeline events
    socket.on(TimelineSocketEvents.ArticleAdded, handleNewArticles);
    socket.on('timeline:tweets:new', handleNewTweets);
    socket.on(TimelineSocketEvents.ArticleUpdated, handleArticleUpdate);
    socket.on(TimelineSocketEvents.ArticleRemoved, handleModerationUpdate);

    return () => {
      socket.off(TimelineSocketEvents.ArticleAdded, handleNewArticles);
      socket.off('timeline:tweets:new', handleNewTweets);
      socket.off(TimelineSocketEvents.ArticleUpdated, handleArticleUpdate);
      socket.off(TimelineSocketEvents.ArticleRemoved, handleModerationUpdate);
    };
  }, [
    socket,
    isConnected,
    handleNewArticles,
    handleNewTweets,
    handleArticleUpdate,
    handleModerationUpdate,
  ]);

  return {
    isConnected,
    socket,
  };
};

export default useTimelineSocket;
