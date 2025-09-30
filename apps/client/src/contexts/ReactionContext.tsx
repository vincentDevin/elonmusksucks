// ReactionContext.tsx - React 19 optimized reaction management
// Handles reactions for both posts and articles with centralized state
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useOptimistic,
  startTransition,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useEventBusCore } from './EventBusCoreContext';
import type { ReactionType } from '@ems/types';
import { togglePostReaction, getPostReactions } from '../api/posts';
import { timelineApi } from '../api/timeline';
import { REDIS_CHANNELS } from '../types/events';

// Unified reaction state for both posts and articles
interface ReactionState {
  reactionCounts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  isReacting: boolean;
}

// Reaction context type
interface ReactionContextType {
  // Get current reaction state for a content item
  getReactionState: (contentType: 'post' | 'article', contentId: number) => ReactionState;

  // Toggle reaction with optimistic updates
  toggleReaction: (
    contentType: 'post' | 'article',
    contentId: number,
    reactionType: ReactionType,
  ) => Promise<void>;

  // Initialize reactions for a content item
  initializeReactions: (
    contentType: 'post' | 'article',
    contentId: number,
    initialCounts?: Record<ReactionType, number>,
    initialUserReaction?: ReactionType,
  ) => void;
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined);

// Default reaction counts
const DEFAULT_COUNTS: Record<ReactionType, number> = {
  LIKE: 0,
  LOVE: 0,
  LAUGH: 0,
  WOW: 0,
  SAD: 0,
  ANGRY: 0,
};

export const ReactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();

  // Centralized reaction state: Map<"post:123" | "article:456", ReactionState>
  const [reactions, setReactions] = useState<Map<string, ReactionState>>(new Map());

  // Optimistic updates using React 19 useOptimistic
  const [optimisticReactions, setOptimisticReactions] = useOptimistic(
    reactions,
    (current, action: { key: string; update: Partial<ReactionState> }) => {
      const newMap = new Map(current);
      const existing = newMap.get(action.key) || {
        reactionCounts: { ...DEFAULT_COUNTS },
        isReacting: false,
      };
      newMap.set(action.key, { ...existing, ...action.update });
      return newMap;
    },
  );

  // Generate unique key for content
  const getContentKey = useCallback(
    (contentType: 'post' | 'article', contentId: number): string => {
      return `${contentType}:${contentId}`;
    },
    [],
  );

  // Get reaction state for content
  const getReactionState = useCallback(
    (contentType: 'post' | 'article', contentId: number): ReactionState => {
      const key = getContentKey(contentType, contentId);
      return (
        optimisticReactions.get(key) || {
          reactionCounts: { ...DEFAULT_COUNTS },
          isReacting: false,
        }
      );
    },
    [optimisticReactions, getContentKey],
  );

  // Initialize reactions for content item
  const initializeReactions = useCallback(
    (
      contentType: 'post' | 'article',
      contentId: number,
      initialCounts?: Record<ReactionType, number>,
      initialUserReaction?: ReactionType,
    ) => {
      const key = getContentKey(contentType, contentId);

      // Check current state without using closure
      setReactions((prev) => {
        const existingState = prev.get(key);

        // If we already have real data (not just defaults), don't re-initialize
        if (
          existingState &&
          (existingState.userReaction !== undefined ||
            Object.values(existingState.reactionCounts).some((count) => count > 0))
        ) {
          return prev; // No change
        }

        // Set initial state
        const newMap = new Map(prev);
        newMap.set(key, {
          reactionCounts: initialCounts || { ...DEFAULT_COUNTS },
          userReaction: initialUserReaction,
          isReacting: false,
        });
        return newMap;
      });

      // Fetch fresh reaction data if no initial data provided (articles) OR if explicitly requested
      if (!initialCounts) {
        startTransition(async () => {
          try {
            let reactionData;
            if (contentType === 'post') {
              reactionData = await getPostReactions(contentId);
            } else {
              reactionData = await timelineApi.getReactions(contentId);
            }

            const detailedCounts = {
              LIKE: reactionData.reactions?.['LIKE']?.length || 0,
              LOVE: reactionData.reactions?.['LOVE']?.length || 0,
              LAUGH: reactionData.reactions?.['LAUGH']?.length || 0,
              WOW: reactionData.reactions?.['WOW']?.length || 0,
              SAD: reactionData.reactions?.['SAD']?.length || 0,
              ANGRY: reactionData.reactions?.['ANGRY']?.length || 0,
            };

            // Detect user's current reaction
            let currentUserReaction: ReactionType | undefined;
            if (user?.id) {
              for (const [reactionType, reactionUsers] of Object.entries(
                reactionData.reactions || {},
              )) {
                if (
                  Array.isArray(reactionUsers) &&
                  reactionUsers.some((reaction: any) => reaction.user?.id === user.id)
                ) {
                  currentUserReaction = reactionType as ReactionType;
                  break;
                }
              }
            }

            // Update with fetched data
            setReactions((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, {
                reactionCounts: detailedCounts,
                userReaction: currentUserReaction,
                isReacting: false,
              });
              return newMap;
            });
          } catch (error) {
            console.error(`Failed to fetch ${contentType} reactions:`, error);
            // On error, ensure we have at least default state
            setReactions((prev) => {
              const newMap = new Map(prev);
              if (!newMap.has(key)) {
                newMap.set(key, {
                  reactionCounts: { ...DEFAULT_COUNTS },
                  userReaction: undefined,
                  isReacting: false,
                });
              }
              return newMap;
            });
          }
        });
      }
    },
    [getContentKey, user?.id],
  );

  // Toggle reaction with optimistic updates
  const toggleReaction = useCallback(
    async (contentType: 'post' | 'article', contentId: number, reactionType: ReactionType) => {
      const key = getContentKey(contentType, contentId);
      const currentState = reactions.get(key);

      if (currentState?.isReacting) return;

      // Optimistic update - predict the result
      const isCurrentlySelected = currentState?.userReaction === reactionType;
      const optimisticUpdate = {
        isReacting: true,
        reactionCounts: {
          ...(currentState?.reactionCounts || DEFAULT_COUNTS),
          [reactionType]: isCurrentlySelected
            ? Math.max(0, (currentState?.reactionCounts[reactionType] || 0) - 1)
            : (currentState?.reactionCounts[reactionType] || 0) + 1,
        },
        userReaction: isCurrentlySelected ? undefined : reactionType,
      };

      // Apply optimistic update immediately in transition
      startTransition(() => {
        setOptimisticReactions({ key, update: optimisticUpdate });
      });

      try {
        // Make API call
        let result;
        if (contentType === 'post') {
          console.log(
            `[ReactionContext] Toggling post reaction: ${reactionType} on post ${contentId}`,
          );
          result = await togglePostReaction(contentId, reactionType);
          console.log(`[ReactionContext] Post reaction result:`, result);
        } else {
          console.log(
            `[ReactionContext] Toggling article reaction: ${reactionType} on article ${contentId}`,
          );
          result = await timelineApi.toggleReaction(contentId, reactionType);
          console.log(`[ReactionContext] Article reaction result:`, result);
        }

        // Apply real result in transition
        startTransition(() => {
          setReactions((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(key) || {
              reactionCounts: { ...DEFAULT_COUNTS },
              isReacting: false,
            };

            // Handle reaction count updates properly
            let newCounts = { ...existing.reactionCounts };

            if (result.action === 'added') {
              // Adding a new reaction
              newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
            } else if (result.action === 'removed') {
              // Removing existing reaction
              newCounts[reactionType] = Math.max(0, (newCounts[reactionType] || 0) - 1);
            } else if (result.action === 'changed') {
              // User switched from one reaction to another
              // Remove the old reaction if user had one
              if (existing.userReaction && existing.userReaction !== reactionType) {
                newCounts[existing.userReaction] = Math.max(
                  0,
                  (newCounts[existing.userReaction] || 0) - 1,
                );
              }
              // Add the new reaction
              newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
            }

            // Determine user reaction from API response
            let newUserReaction: ReactionType | undefined;
            if (result.reaction?.type) {
              newUserReaction = result.reaction.type as ReactionType;
            } else if (result.action === 'added' || result.action === 'changed') {
              newUserReaction = reactionType;
            } else {
              newUserReaction = undefined;
            }

            const updatedState = {
              ...existing,
              reactionCounts: newCounts,
              userReaction: newUserReaction,
              isReacting: false,
            };

            console.log(
              `[ReactionContext] Updating ${contentType} ${contentId} state:`,
              updatedState,
            );
            newMap.set(key, updatedState);
            return newMap;
          });
        });
      } catch (error) {
        console.error(`Failed to toggle ${contentType} reaction:`, error);

        // Revert optimistic update on error
        startTransition(() => {
          setReactions((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(key);
            if (existing) {
              newMap.set(key, { ...existing, isReacting: false });
            }
            return newMap;
          });
        });
      }
    },
    [getContentKey, reactions, setOptimisticReactions],
  );

  // Real-time reaction updates via EventBus
  // TODO: Add POST_REACTION_UPDATE and ARTICLE_REACTION_UPDATE to REDIS_CHANNELS in packages/types
  useEffect(() => {
    if (!user?.id) return;

    // Real-time updates commented out until backend channels are implemented
    // const unsubscribePostReactions = subscribe(
    //   REDIS_CHANNELS.POST_REACTION_UPDATE,
    //   (payload: any) => { ... }
    // );

    // For now, we rely on optimistic updates only
    // Real-time sync will be added when the Redis channels are implemented

    return () => {
      // cleanup when implemented
    };
  }, [user?.id, subscribe, getContentKey]);

  const contextValue = useMemo(
    () => ({
      getReactionState,
      toggleReaction,
      initializeReactions,
    }),
    [getReactionState, toggleReaction, initializeReactions],
  );

  return <ReactionContext.Provider value={contextValue}>{children}</ReactionContext.Provider>;
};

export const useReactions = () => {
  const context = useContext(ReactionContext);
  if (!context) {
    throw new Error('useReactions must be used within a ReactionProvider');
  }
  return context;
};

export default ReactionContext;
