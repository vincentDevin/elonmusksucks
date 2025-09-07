// apps/client/src/hooks/useTimelineSocket.ts
// Rollback: Revert to string literals in socket handlers, remove typed imports
import { useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { type TimelineUpdatePayload } from '@ems/types';

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
  const socket = useSocket();
  const isConnected = socket?.connected || false;

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
    socket.on('timeline:article:added', handleNewArticles);
    socket.on('timeline:tweets:new', handleNewTweets);
    socket.on('timeline:article:updated', handleArticleUpdate);
    socket.on('timeline:article:removed', handleModerationUpdate);

    return () => {
      socket.off('timeline:article:added', handleNewArticles);
      socket.off('timeline:tweets:new', handleNewTweets);
      socket.off('timeline:article:updated', handleArticleUpdate);
      socket.off('timeline:article:removed', handleModerationUpdate);
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
