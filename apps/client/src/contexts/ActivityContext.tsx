// apps/client/src/contexts/ActivityContext.tsx
// Migrated to use EventBus system for centralized event handling
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useEventBusCore, useSocketEvent } from './EventBusCoreContext';
import { useVisibilityGuard } from '../lib/visibilityGuard';
import { SOCKET_EVENTS } from '@ems/types';
import type { UnifiedActivityEvent } from '@ems/types';

// Client-side activity with user object for backwards compatibility
export interface Activity extends Omit<UnifiedActivityEvent, 'userId' | 'userName' | 'userAvatar'> {
  user: {
    id?: number;
    name: string;
    avatar?: string;
  };
  payout?: number; // Additional client-side field
}

interface ActivityContextType {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  hasInitialized: boolean;
  refresh: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACTIVITIES: 'ems_activities',
  HAS_INITIALIZED: 'ems_activity_initialized',
  TIMESTAMP: 'ems_activity_timestamp',
} as const;

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Helper functions for browser storage
const getStoredActivities = (): Activity[] => {
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

const storeActivities = (activities: Activity[]) => {
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
let globalActivities: Activity[] = getStoredActivities();
let globalHasInitialized = getStoredHasInitialized();

// Hot reload detection - clear global state when module reloads in development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[ActivityContext] Hot reload detected, clearing global state');
    globalHasRequestedInitialData = false;
    globalActivities = [];
    globalHasInitialized = false;
    clearStoredActivities();
  });
}

// Activity feed configuration - FILO queue with max 25 items
const MAX_ACTIVITIES = 25;

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, socket } = useEventBusCore();
  const { shouldRefresh, updateLastFetch } = useVisibilityGuard(5 * 60 * 1000); // 5 minutes

  // Show cached data immediately if available, only show loading if no cache
  const [activities, setActivities] = useState<Activity[]>(globalActivities);
  const [loading, setLoading] = useState(globalActivities.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(globalActivities.length > 0);

  // Handle real-time activity updates
  const handleActivityUpdate = useCallback((activity: any) => {
    console.log(
      '[ActivityContext] Received activity update:',
      activity.id,
      activity.type,
      activity.title,
    );
    const unifiedActivity: Activity = {
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
      // Add new activity and remove duplicates, keeping only latest MAX_ACTIVITIES (FILO queue)
      const newActivities = [unifiedActivity, ...prev.filter((a) => a.id !== unifiedActivity.id)];
      const trimmedActivities = newActivities.slice(0, MAX_ACTIVITIES);

      // Update global cache and storage
      globalActivities = trimmedActivities;
      storeActivities(trimmedActivities);

      return trimmedActivities;
    });
  }, []);

  // Load initial data via Socket.IO
  const loadInitialData = useCallback(() => {
    console.log('[ActivityContext] loadInitialData called', {
      hasRequested: globalHasRequestedInitialData,
      hasData: globalActivities.length > 0,
      socketExists: !!socket,
      socketConnected: socket?.connected,
    });

    // Only prevent duplicate requests if we already have data
    if (globalHasRequestedInitialData && globalActivities.length > 0) {
      console.log('[ActivityContext] Skipping - already have data');
      return;
    }

    // Skip refresh if tab was hidden and data isn't stale
    if (!shouldRefresh()) {
      console.log('[ActivityContext] Skipping - shouldRefresh returned false');
      setLoading(false);
      return;
    }

    // Ensure socket is connected
    if (!socket) {
      console.warn('[ActivityContext] ⚠️ Socket is null/undefined!');
      setError('Socket not available');
      setLoading(false);
      return;
    }

    // Check socket.connected directly (not the stale isConnected state)
    if (!socket.connected) {
      console.log('[ActivityContext] Socket not connected yet, deferring load');
      return;
    }

    globalHasRequestedInitialData = true;
    setLoading(true);
    setError(null);

    console.log('[ActivityContext] 🚀 Requesting initial activities via socket...');
    console.log('[ActivityContext] Socket ID:', socket.id);
    console.log('[ActivityContext] Socket connected:', socket.connected);
    console.log('[ActivityContext] Emitting event:', SOCKET_EVENTS.UNIFIED_ACTIVITY_REQUEST);

    // Request activities via socket (will receive response via UNIFIED_ACTIVITY_RESPONSE event)
    socket.emit(SOCKET_EVENTS.UNIFIED_ACTIVITY_REQUEST, {
      limit: MAX_ACTIVITIES,
      includePersonal: true,
      includeSocial: true,
      includePlatform: true,
      includeLive: true,
      timeframe: 'all',
    });

    console.log('[ActivityContext] ✅ Event emitted to server');
  }, [socket, shouldRefresh]);

  // Handle unified activity feed response from socket
  const handleActivityFeedResponse = useCallback(
    (data: any[]) => {
      console.log('[ActivityContext] Received socket response:', {
        count: data?.length,
        firstActivity: data?.[0],
      });

      setLoading(false);
      setError(null);

      if (data && data.length > 0) {
        const transformedActivities = data.map((activity: any) => ({
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

        console.log('[ActivityContext] Transformed activities:', transformedActivities.length);

        // Update global state and storage
        globalActivities = transformedActivities;
        globalHasInitialized = true;
        storeActivities(transformedActivities);

        setActivities(transformedActivities);
        setHasInitialized(true);
        updateLastFetch();
      } else {
        console.log(
          '[ActivityContext] No activities in socket response, waiting for real-time events',
        );
        globalHasInitialized = true;
        setHasInitialized(true);
        updateLastFetch();
      }
    },
    [updateLastFetch],
  );

  // Listen for socket connect event to load initial data (like ChatContext does)
  useEffect(() => {
    if (!socket) {
      console.warn('[ActivityContext] No socket available');
      return;
    }

    const onConnect = () => {
      console.log('[ActivityContext] ✅ Socket connected, requesting activities...');
      setError(null);

      // Load initial data from server if not already done OR if we have no data
      if (!globalHasInitialized || globalActivities.length === 0) {
        loadInitialData();
      } else {
        // Use existing global data
        console.log('[ActivityContext] Using cached data:', globalActivities.length, 'activities');
        setActivities(globalActivities);
        setHasInitialized(true);
        setLoading(false);
      }
    };

    const onDisconnect = () => {
      console.warn('[ActivityContext] ⚠️ Socket disconnected');
      // Only show error if we have no cached data to fall back to
      if (globalActivities.length === 0) {
        console.error('[ActivityContext] No cache available, showing error to user');
        setError('Connection lost');
        setLoading(false);
      } else {
        console.log('[ActivityContext] Offline but using cached data');
        setActivities(globalActivities);
        setHasInitialized(true);
        setLoading(false);
      }
    };

    // Register socket event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected, load immediately
    if (socket.connected) {
      console.log('[ActivityContext] Socket already connected on mount');
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, loadInitialData]);

  // Subscribe to activity events via EventBus (Socket.IO events, not Redis channels)
  useSocketEvent(SOCKET_EVENTS.UNIFIED_ACTIVITY_RESPONSE, handleActivityFeedResponse);
  useSocketEvent(SOCKET_EVENTS.UNIFIED_ACTIVITY_UPDATE, handleActivityUpdate);

  const refresh = useCallback(() => {
    // Clear state and request fresh data via socket
    globalActivities = [];
    globalHasInitialized = false;
    globalHasRequestedInitialData = false;
    clearStoredActivities();

    setActivities([]);
    setHasInitialized(false);
    setLoading(true);
    setError(null);

    // Request fresh data if socket is connected
    if (socket && isConnected) {
      loadInitialData();
    }
  }, [socket, isConnected, loadInitialData]);

  // Clean up on component unmount but preserve storage for page refreshes
  useEffect(() => {
    return () => {
      // No unsubscription needed - activities are globally broadcast
      // Note: We intentionally don't clear storage here to preserve data across page refreshes
      // Storage will auto-expire after CACHE_EXPIRY_MS or be cleared on browser close
    };
  }, []);

  return (
    <ActivityContext.Provider
      value={{ activities, loading, error, isConnected, hasInitialized, refresh }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
}
