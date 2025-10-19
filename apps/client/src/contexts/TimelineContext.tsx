// apps/client/src/contexts/TimelineContext.tsx
// Rollback: Remove AbortController integration and revert to original fetch calls
// Rollback: Remove sessionStorage caching and restore direct API fetching
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useMemo,
  startTransition,
} from 'react';
import type { TimelineItem, TimelineResponse } from '@ems/types';
import { useSocket } from './SocketContext';
import { useEventBusCore } from './EventBusCoreContext';
import { REDIS_CHANNELS } from '@ems/types';
// State interface
interface TimelineState {
  // Articles
  articles: TimelineItem[];
  articlesLoading: boolean;
  articlesError: string | null;
  articlesCursor?: string;
  articlesHasMore: boolean;

  // Tweets (loaded on-demand)
  tweets: TimelineItem[];
  tweetsLoading: boolean;
  tweetsError: string | null;
  tweetsCursor?: string;
  tweetsHasMore: boolean;

  // UI state
  activeTab: 'articles' | 'tweets';
  filters: {
    tags: string[];
    sort: 'newest' | 'oldest';
    search?: string;
  };

  // Modals
  selectedArticle?: TimelineItem;
  useAsSourceItem?: TimelineItem;
}

// Action types
type TimelineAction =
  | { type: 'SET_LOADING'; payload: { content: 'articles' | 'tweets'; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { content: 'articles' | 'tweets'; error: string | null } }
  | {
      type: 'LOAD_ARTICLES_SUCCESS';
      payload: { items: TimelineItem[]; cursor?: string; hasMore: boolean; reset?: boolean };
    }
  | {
      type: 'LOAD_TWEETS_SUCCESS';
      payload: { items: TimelineItem[]; cursor?: string; hasMore: boolean; reset?: boolean };
    }
  | { type: 'SET_ACTIVE_TAB'; payload: 'articles' | 'tweets' }
  | { type: 'UPDATE_FILTERS'; payload: Partial<TimelineState['filters']> }
  | { type: 'SET_SELECTED_ARTICLE'; payload: TimelineItem | undefined }
  | { type: 'SET_USE_AS_SOURCE_ITEM'; payload: TimelineItem | undefined }
  | { type: 'ADD_NEW_ITEM'; payload: { item: TimelineItem; type: 'articles' | 'tweets' } }
  | { type: 'RESET_TIMELINE' };

// Initial state
const initialState: TimelineState = {
  articles: [],
  articlesLoading: false,
  articlesError: null,
  articlesHasMore: true,

  tweets: [],
  tweetsLoading: false,
  tweetsError: null,
  tweetsHasMore: true,

  activeTab: 'articles',
  filters: {
    tags: [],
    sort: 'newest',
  },
};

// Reducer
function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        [`${action.payload.content}Loading`]: action.payload.loading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        [`${action.payload.content}Error`]: action.payload.error,
      };

    case 'LOAD_ARTICLES_SUCCESS':
      return {
        ...state,
        articles: action.payload.reset
          ? action.payload.items
          : [...state.articles, ...action.payload.items],
        articlesCursor: action.payload.cursor,
        articlesHasMore: action.payload.hasMore,
        articlesLoading: false,
        articlesError: null,
      };

    case 'LOAD_TWEETS_SUCCESS':
      return {
        ...state,
        tweets: action.payload.reset
          ? action.payload.items
          : [...state.tweets, ...action.payload.items],
        tweetsCursor: action.payload.cursor,
        tweetsHasMore: action.payload.hasMore,
        tweetsLoading: false,
        tweetsError: null,
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };

    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'SET_SELECTED_ARTICLE':
      return {
        ...state,
        selectedArticle: action.payload,
      };

    case 'SET_USE_AS_SOURCE_ITEM':
      return {
        ...state,
        useAsSourceItem: action.payload,
      };

    case 'ADD_NEW_ITEM':
      const itemsKey = action.payload.type;
      return {
        ...state,
        [itemsKey]: [action.payload.item, ...state[itemsKey]],
      };

    case 'RESET_TIMELINE':
      return {
        ...initialState,
        activeTab: state.activeTab,
        filters: state.filters,
      };

    default:
      return state;
  }
}

// Context
const TimelineContext = createContext<
  | {
      state: TimelineState;
      dispatch: React.Dispatch<TimelineAction>;
      // Actions
      loadArticles: (reset?: boolean) => Promise<void>;
      loadTweets: (reset?: boolean) => Promise<void>;
      setActiveTab: (tab: 'articles' | 'tweets') => void;
      updateFilters: (filters: Partial<TimelineState['filters']>) => void;
      openArticle: (article: TimelineItem) => void;
      closeArticle: () => void;
      openUseAsSource: (item: TimelineItem) => void;
      closeUseAsSource: () => void;
    }
  | undefined
>(undefined);

// Provider component
export const TimelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(timelineReducer, initialState);
  const socket = useSocket();
  const { subscribe } = useEventBusCore();

  // AbortController refs for cancelling requests
  const articlesAbortController = useRef<AbortController | null>(null);
  const tweetsAbortController = useRef<AbortController | null>(null);

  // Actions
  const loadArticles = async (reset = false) => {
    if (state.articlesLoading) return;

    // Abort any pending articles request
    if (articlesAbortController.current) {
      articlesAbortController.current.abort();
    }

    dispatch({ type: 'SET_LOADING', payload: { content: 'articles', loading: true } });

    // Create new abort controller
    const controller = new AbortController();
    articlesAbortController.current = controller;

    try {
      const params = new URLSearchParams({
        status: 'APPROVED',
        limit: '30',
        sort: state.filters.sort,
        ...(state.filters.tags.length > 0 ? { tag: state.filters.tags.join(',') } : {}),
        ...(state.filters.search ? { search: state.filters.search } : {}),
        ...(state.articlesCursor && !reset ? { cursor: state.articlesCursor } : {}),
      });

      const response = await fetch(`/api/timeline/articles?${params}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load articles: ${response.status}`);
      }

      const data: TimelineResponse = await response.json();

      // Use startTransition for non-urgent list updates (React 19 optimization)
      startTransition(() => {
        dispatch({
          type: 'LOAD_ARTICLES_SUCCESS',
          payload: {
            items: data.items,
            cursor: data.pagination.cursor,
            hasMore: data.pagination.hasMore,
            reset,
          },
        });
      });
    } catch (error) {
      // Don't set error state if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dispatch({
        type: 'SET_ERROR',
        payload: {
          content: 'articles',
          error: error instanceof Error ? error.message : 'Failed to load articles',
        },
      });
    } finally {
      articlesAbortController.current = null;
    }
  };

  const loadTweets = async (reset = false) => {
    if (state.tweetsLoading) return;

    // Abort any pending tweets request
    if (tweetsAbortController.current) {
      tweetsAbortController.current.abort();
    }

    dispatch({ type: 'SET_LOADING', payload: { content: 'tweets', loading: true } });

    // Create new abort controller
    const controller = new AbortController();
    tweetsAbortController.current = controller;

    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(state.tweetsCursor && !reset ? { cursor: state.tweetsCursor } : {}),
      });

      const response = await fetch(`/api/timeline/tweets?${params}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load tweets: ${response.status}`);
      }

      const data: TimelineResponse = await response.json();

      // Use startTransition for non-urgent list updates (React 19 optimization)
      startTransition(() => {
        dispatch({
          type: 'LOAD_TWEETS_SUCCESS',
          payload: {
            items: data.items,
            cursor: data.pagination.cursor,
            hasMore: data.pagination.hasMore,
            reset,
          },
        });
      });
    } catch (error) {
      // Don't set error state if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dispatch({
        type: 'SET_ERROR',
        payload: {
          content: 'tweets',
          error: error instanceof Error ? error.message : 'Failed to load tweets',
        },
      });
    } finally {
      tweetsAbortController.current = null;
    }
  };

  const setActiveTab = (tab: 'articles' | 'tweets') => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });

    // Load tweets on first access
    if (tab === 'tweets' && state.tweets.length === 0 && !state.tweetsLoading) {
      loadTweets(true);
    }
  };

  const updateFilters = (filters: Partial<TimelineState['filters']>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });

    // Reload current tab with new filters
    if (state.activeTab === 'articles') {
      loadArticles(true);
    }
  };

  const openArticle = (article: TimelineItem) => {
    dispatch({ type: 'SET_SELECTED_ARTICLE', payload: article });
  };

  const closeArticle = () => {
    dispatch({ type: 'SET_SELECTED_ARTICLE', payload: undefined });
  };

  const openUseAsSource = (item: TimelineItem) => {
    dispatch({ type: 'SET_USE_AS_SOURCE_ITEM', payload: item });
  };

  const closeUseAsSource = () => {
    dispatch({ type: 'SET_USE_AS_SOURCE_ITEM', payload: undefined });
  };

  // Initial load removed - using unified timeline via TimelineWithPosts instead
  // useEffect(() => {
  //   loadArticles(true);
  // }, []);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for newly approved articles
    const handleNewArticle = (data: any) => {
      console.log('[Timeline] New approved article:', data);

      // Convert the approved article to TimelineItem format
      const timelineItem: TimelineItem = {
        id: `article-${data.id}`,
        type: 'article',
        timestamp: data.publishedAt,
        content: {
          title: data.title,
          excerpt: data.excerpt,
          url: data.url,
          imageUrl: data.leadImageUrl,
          author: data.feed?.name || 'Unknown',
          source: data.feed?.siteUrl,
        },
        engagement: {
          reactions: 0,
          comments: 0,
        },
        tags: data.tags || [],
      };

      // Add to timeline if user is viewing articles (use startTransition for non-blocking update)
      if (state.activeTab === 'articles') {
        startTransition(() => {
          dispatch({ type: 'ADD_NEW_ITEM', payload: { item: timelineItem, type: 'articles' } });
        });
      }
    };

    // Listen for new tweets (if implemented)
    const handleNewTweet = (data: any) => {
      console.log('[Timeline] New tweet:', data);

      const timelineItem: TimelineItem = {
        id: `tweet-${data.id}`,
        type: 'tweet',
        timestamp: data.postedAt,
        content: {
          title: data.text,
          url: data.permalink,
          author: data.authorHandle,
          source: 'Twitter',
        },
        engagement: {
          reactions: data.counts?.likes || 0,
          comments: data.counts?.replies || 0,
        },
        tags: [],
      };

      // Add to timeline if user is viewing tweets (use startTransition for non-blocking update)
      if (state.activeTab === 'tweets') {
        startTransition(() => {
          dispatch({ type: 'ADD_NEW_ITEM', payload: { item: timelineItem, type: 'tweets' } });
        });
      }
    };

    // Migrated to EventBusCore: Timeline events
    const unsubscribers = [
      subscribe(REDIS_CHANNELS.TIMELINE_ARTICLES_APPROVED, handleNewArticle),
      subscribe(REDIS_CHANNELS.FEED_TWEET_NEW, handleNewTweet),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, state.activeTab]);

  // Cleanup: abort any pending requests on unmount
  useEffect(() => {
    return () => {
      if (articlesAbortController.current) {
        articlesAbortController.current.abort();
      }
      if (tweetsAbortController.current) {
        tweetsAbortController.current.abort();
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  // Note: Functions are recreated when state changes, which is intentional
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      loadArticles,
      loadTweets,
      setActiveTab,
      updateFilters,
      openArticle,
      closeArticle,
      openUseAsSource,
      closeUseAsSource,
    }),
    [
      state,
      loadArticles,
      loadTweets,
      setActiveTab,
      updateFilters,
      openArticle,
      closeArticle,
      openUseAsSource,
      closeUseAsSource,
    ],
  );

  return <TimelineContext.Provider value={contextValue}>{children}</TimelineContext.Provider>;
};

// Hook
export const useTimeline = () => {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
};

export default TimelineContext;
