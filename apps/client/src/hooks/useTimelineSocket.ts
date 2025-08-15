// apps/client/src/hooks/useTimelineSocket.ts
import { useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { TimelineItem } from '@ems/types';

interface UseTimelineSocketProps {
  activeTab: 'articles' | 'tweets';
  onNewArticles?: (articles: TimelineItem[]) => void;
  onNewTweets?: (tweets: TimelineItem[]) => void;
  onArticleUpdate?: (article: TimelineItem) => void;
  onModerationUpdate?: (data: any) => void;
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
    (data: any) => {
      if (activeTab === 'articles' && onNewArticles && data.articles) {
        onNewArticles(data.articles);
      }
    },
    [activeTab, onNewArticles],
  );

  // Handle new tweets
  const handleNewTweets = useCallback(
    (data: any) => {
      if (activeTab === 'tweets' && onNewTweets && data.tweets) {
        onNewTweets(data.tweets);
      }
    },
    [activeTab, onNewTweets],
  );

  // Handle article updates
  const handleArticleUpdate = useCallback(
    (data: any) => {
      if (onArticleUpdate && data.article) {
        onArticleUpdate(data.article);
      }
    },
    [onArticleUpdate],
  );

  // Handle admin moderation updates
  const handleModerationUpdate = useCallback(
    (data: any) => {
      if (onModerationUpdate) {
        onModerationUpdate(data);
      }
    },
    [onModerationUpdate],
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to timeline events
    socket.on('timeline:articles:approved', handleNewArticles);
    socket.on('timeline:tweets:new', handleNewTweets);
    socket.on('timeline:article:update', handleArticleUpdate);
    socket.on('timeline:moderation:bulk', handleModerationUpdate);

    return () => {
      socket.off('timeline:articles:approved', handleNewArticles);
      socket.off('timeline:tweets:new', handleNewTweets);
      socket.off('timeline:article:update', handleArticleUpdate);
      socket.off('timeline:moderation:bulk', handleModerationUpdate);
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
