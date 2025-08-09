// apps/client/src/contexts/UnifiedActivityContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { getRecentActivities } from '../api/activity';
import type { ActivityEventType } from '@ems/types';

// Enhanced activity interface that combines all data sources
export interface UnifiedActivity {
  id: string;
  type:
    | ActivityEventType
    | 'live_bet'
    | 'live_parlay'
    | 'market_movement'
    | 'big_bet_alert'
    | 'achievement_unlocked'
    | 'user_followed';
  timestamp: string;
  priority: 'high' | 'medium' | 'low';

  // User info
  user: {
    id?: number;
    name: string;
    avatar?: string;
  };

  // Rich content
  title: string;
  description: string;
  icon: string;
  color: string;

  // Financial data
  amount?: number;
  odds?: number;
  payout?: number;

  // Prediction context
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  optionLabel?: string;

  // Meta flags
  isPersonal: boolean;
  isHighValue: boolean;
  isWin?: boolean;
  streak?: number;
}

interface UnifiedActivityContextType {
  activities: UnifiedActivity[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  hasInitialized: boolean;
  refresh: () => void;
}

const UnifiedActivityContext = createContext<UnifiedActivityContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACTIVITIES: 'ems_unified_activities',
  HAS_INITIALIZED: 'ems_activity_initialized',
  TIMESTAMP: 'ems_activity_timestamp',
} as const;

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Helper functions for browser storage
const getStoredActivities = (): UnifiedActivity[] => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    const timestamp = sessionStorage.getItem(STORAGE_KEYS.TIMESTAMP);

    if (!stored || !timestamp) return [];

    // Check if cache is expired
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_EXPIRY_MS) {
      clearStoredActivities();
      return [];
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load stored activities:', error);
    return [];
  }
};

const getStoredHasInitialized = (): boolean => {
  try {
    const timestamp = sessionStorage.getItem(STORAGE_KEYS.TIMESTAMP);
    if (!timestamp) return false;

    // Check if cache is expired
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_EXPIRY_MS) {
      clearStoredActivities();
      return false;
    }

    return sessionStorage.getItem(STORAGE_KEYS.HAS_INITIALIZED) === 'true';
  } catch (error) {
    return false;
  }
};

const storeActivities = (activities: UnifiedActivity[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    sessionStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
    sessionStorage.setItem(STORAGE_KEYS.TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.warn('Failed to store activities:', error);
  }
};

const clearStoredActivities = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    sessionStorage.removeItem(STORAGE_KEYS.HAS_INITIALIZED);
    sessionStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
  } catch (error) {
    console.warn('Failed to clear stored activities:', error);
  }
};

// Global state to persist across component unmounts/remounts
let globalHasRequestedInitialData = false;
let globalActivities: UnifiedActivity[] = getStoredActivities();
let globalHasInitialized = getStoredHasInitialized();

export function UnifiedActivityProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();
  const [activities, setActivities] = useState<UnifiedActivity[]>(globalActivities);
  const [loading, setLoading] = useState(!globalHasInitialized);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(globalHasInitialized);

  // Handle unified activity feed response
  const handleActivityFeedResponse = useCallback((data: any[]) => {
    setLoading(false);
    setError(null);

    const unifiedActivities: UnifiedActivity[] = data.map((activity) => ({
      id: activity.id,
      type: activity.type,
      timestamp: activity.timestamp,
      priority: activity.priority || 'medium',
      user: {
        id: activity.userId,
        name: activity.userName || 'Anonymous',
        avatar: activity.userAvatar,
      },
      title: activity.title || '',
      description: activity.description || '',
      icon: activity.icon || '•',
      color: activity.color || '',
      amount: activity.amount,
      odds: activity.odds,
      payout: activity.payout,
      predictionId: activity.predictionId,
      predictionTitle: activity.predictionTitle,
      category: activity.category,
      optionLabel: activity.optionLabel,
      isPersonal: activity.isPersonal || false,
      isHighValue: activity.amount && activity.amount >= 1000,
      isWin: activity.isWin,
      streak: activity.streak,
    }));

    // If we have cached data, merge with server data intelligently
    let finalActivities = unifiedActivities;
    if (globalActivities.length > 0) {
      // Merge server data with cached data, removing duplicates and keeping latest
      const existingIds = new Set(unifiedActivities.map((a) => a.id));
      const uniqueCachedActivities = globalActivities.filter((a) => !existingIds.has(a.id));

      // Combine and sort by timestamp (newest first), then limit to 100
      finalActivities = [...unifiedActivities, ...uniqueCachedActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
    }

    // Update both local and global state
    globalActivities = finalActivities;
    globalHasInitialized = true;

    // Store in sessionStorage for persistence across page refreshes
    storeActivities(finalActivities);

    setActivities(finalActivities);
    setHasInitialized(true);
  }, []);

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback((activity: any) => {
    console.log(
      '[UnifiedActivityContext] Received activity update:',
      activity.id,
      activity.type,
      activity.title,
    );
    const unifiedActivity: UnifiedActivity = {
      id: activity.id,
      type: activity.type,
      timestamp: activity.timestamp,
      priority: activity.priority || 'medium',
      user: {
        id: activity.userId,
        name: activity.userName || 'Anonymous',
        avatar: activity.userAvatar,
      },
      title: activity.title || '',
      description: activity.description || '',
      icon: activity.icon || '•',
      color: activity.color || '',
      amount: activity.amount,
      odds: activity.odds,
      payout: activity.payout,
      predictionId: activity.predictionId,
      predictionTitle: activity.predictionTitle,
      category: activity.category,
      optionLabel: activity.optionLabel,
      isPersonal: activity.isPersonal || false,
      isHighValue: activity.amount && activity.amount >= 1000,
      isWin: activity.isWin,
      streak: activity.streak,
    };

    setActivities((prev) => {
      // Add new activity and remove duplicates, keeping only latest 100
      const newActivities = [unifiedActivity, ...prev.filter((a) => a.id !== unifiedActivity.id)];
      const trimmedActivities = newActivities.slice(0, 100);

      // Update global cache and storage
      globalActivities = trimmedActivities;
      storeActivities(trimmedActivities);

      return trimmedActivities;
    });
  }, []);

  // Load initial data from Redis cache on connection
  const loadInitialData = useCallback(async () => {
    if (globalHasRequestedInitialData) return; // Prevent duplicate requests
    globalHasRequestedInitialData = true;

    setLoading(true);
    setError(null);

    try {
      console.log('[UnifiedActivityContext] Loading initial activities from Redis cache...');
      const response = await getRecentActivities(100);

      if (response.success && response.activities.length > 0) {
        console.log(
          `[UnifiedActivityContext] Loaded ${response.activities.length} activities from ${response.cached ? 'Redis cache' : 'database'}`,
        );

        // Transform to unified format - handle both Redis and database formats
        const transformedActivities = response.activities
          .filter((activity: any) => {
            // Filter out raw database entries that don't have proper formatting
            // Keep only activities that have either Redis format (userId/userName) or database format with proper details
            return (
              (activity.userId && activity.userName) ||
              (activity.user && (activity.title || activity.details?.icon))
            );
          })
          .map((activity: any) => {
            // Detect format and transform accordingly
            const isRedisFormat = activity.userId && activity.userName;

            if (isRedisFormat) {
              // Redis format - direct mapping
              return {
                id: activity.id,
                type: activity.type,
                timestamp: activity.timestamp,
                priority: activity.priority || 'medium',
                user: {
                  id: activity.userId,
                  name: activity.userName || 'Anonymous',
                  avatar: activity.userAvatar,
                },
                title: activity.title || '',
                description: activity.description || '',
                icon: activity.icon || '•',
                color: activity.color || '',
                amount: activity.amount,
                odds: activity.odds,
                payout: activity.payout,
                predictionId: activity.predictionId,
                predictionTitle: activity.predictionTitle,
                category: activity.category,
                optionLabel: activity.optionLabel,
                isPersonal: activity.isPersonal || false,
                isHighValue: activity.amount && activity.amount >= 1000,
                isWin: activity.isWin,
                streak: activity.streak,
              };
            } else {
              // Database format - extract from nested structure
              const details = activity.details || {};
              return {
                id: activity.id,
                type: activity.type.toLowerCase(),
                timestamp: activity.createdAt,
                priority: activity.priority || 'medium',
                user: {
                  id: activity.user?.id,
                  name: activity.user?.name || 'Anonymous',
                  avatar: activity.user?.avatarUrl,
                },
                title: activity.title || details.title || '',
                description: activity.description || details.description || '',
                icon: details.icon || '•',
                color: details.color || '',
                amount: details.amount,
                odds: details.odds,
                payout: details.payout,
                predictionId: activity.prediction?.id || details.predictionId,
                predictionTitle: activity.prediction?.title || details.predictionTitle,
                category: activity.prediction?.category || details.category,
                optionLabel: details.optionLabel,
                isPersonal: details.isPersonal || false,
                isHighValue: details.isHighValue || (details.amount && details.amount >= 1000),
                isWin: details.isWin,
                streak: details.streak,
              };
            }
          });

        // Update global state and storage
        globalActivities = transformedActivities;
        globalHasInitialized = true;
        storeActivities(transformedActivities);

        setActivities(transformedActivities);
        setHasInitialized(true);
      } else {
        console.log(
          '[UnifiedActivityContext] No initial activities found, waiting for real-time events',
        );
        globalHasInitialized = true;
        setHasInitialized(true);
      }
    } catch (error) {
      console.error('[UnifiedActivityContext] Error loading initial activities:', error);
      setError('Failed to load initial activities');

      // Fall back to cached data if available
      const cached = getStoredActivities();
      if (cached.length > 0) {
        console.log('[UnifiedActivityContext] Falling back to browser cache');
        setActivities(cached);
        globalActivities = cached;
        globalHasInitialized = true;
        setHasInitialized(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle connection events
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);

    // Load initial data from server if not already done
    if (!globalHasInitialized) {
      loadInitialData();
    } else {
      // Use existing global data
      setActivities(globalActivities);
      setHasInitialized(true);
      setLoading(false);
    }
  }, [loadInitialData]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setError('Connection lost');
  }, []);

  const handleError = useCallback((error: any) => {
    setLoading(false);
    setError(error?.message || 'Failed to load activities');
  }, []);

  // Unified Socket.IO activity feed - single data source
  useEffect(() => {
    if (!socket) return;

    setIsConnected(socket.connected);

    // Register Socket.IO listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('unified:activity:response', handleActivityFeedResponse);
    socket.on('unified:activity:update', handleActivityUpdate);

    // Just set connected state if already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('unified:activity:response', handleActivityFeedResponse);
      socket.off('unified:activity:update', handleActivityUpdate);
    };
  }, [
    socket,
    handleConnect,
    handleDisconnect,
    handleError,
    handleActivityFeedResponse,
    handleActivityUpdate,
  ]);

  const refresh = useCallback(() => {
    // In event-driven system, we don't request - we just clear and wait for new events
    setActivities([]);
    globalActivities = [];
    clearStoredActivities();
  }, []);

  // Clean up on component unmount but preserve storage for page refreshes
  useEffect(() => {
    return () => {
      // No unsubscription needed - activities are globally broadcast
      // Note: We intentionally don't clear storage here to preserve data across page refreshes
      // Storage will auto-expire after CACHE_EXPIRY_MS or be cleared on browser close
    };
  }, [socket]);

  return (
    <UnifiedActivityContext.Provider
      value={{ activities, loading, error, isConnected, hasInitialized, refresh }}
    >
      {children}
    </UnifiedActivityContext.Provider>
  );
}

export function useUnifiedActivity() {
  const context = useContext(UnifiedActivityContext);
  if (!context) {
    throw new Error('useUnifiedActivity must be used within UnifiedActivityProvider');
  }
  return context;
}
