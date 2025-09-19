// apps/client/src/components/ActivityFeed.tsx
import { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useActivity, type Activity } from '../contexts/ActivityContext';
import type { ActivityEventType } from '@ems/types';

// CSS for hiding scrollbar across all browsers
const scrollbarHiddenStyle = `
  .scrollbar-hidden {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* Internet Explorer 10+ */
  }
  .scrollbar-hidden::-webkit-scrollbar { 
    display: none; /* WebKit */
  }
`;

// Inject the styles
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = scrollbarHiddenStyle;
  if (!document.head.querySelector('style[data-scrollbar-hidden]')) {
    styleTag.setAttribute('data-scrollbar-hidden', 'true');
    document.head.appendChild(styleTag);
  }
}

interface Props {
  maxItems?: number;
  className?: string;
}

// Rich formatting with complete context
function formatRichActivity(activity: Activity): {
  text: string;
  shortText: string;
  className: string;
  icon: string;
} {
  const {
    user,
    title,
    description,
    amount,
    odds,
    predictionTitle,
    optionLabel,
    type,
    priority,
    isHighValue,
    isWin,
    streak,
  } = activity;
  const userName = user.name;

  // Base classes
  let className = 'inline-flex items-center space-x-1 ';
  let icon = activity.icon;

  // Priority-based styling
  switch (priority) {
    case 'high':
      className += 'text-yellow-600 dark:text-yellow-400 font-semibold ';
      break;
    case 'medium':
      className += 'text-blue-600 dark:text-blue-400 ';
      break;
    case 'low':
      className += 'text-tertiary ';
      break;
  }

  // High-value styling
  if (isHighValue) {
    className += 'animate-pulse ';
  }

  // Win/loss styling
  if (isWin === true) {
    className += 'text-green-600 dark:text-green-400 ';
  } else if (isWin === false) {
    className += 'text-red-600 dark:text-red-400 ';
  }

  let text = '';
  let shortText = '';

  switch (type) {
    case 'bet_placed':
    case 'live_bet':
      const amountStr = amount ? `${amount}🪙` : '';
      const oddsStr = odds ? ` @${odds}x` : '';
      const optionStr = optionLabel ? ` on "${optionLabel}"` : '';
      const predictionStr = predictionTitle ? ` for "${predictionTitle}"` : '';

      text = `${userName} bet ${amountStr}${optionStr}${oddsStr}${predictionStr}`;
      shortText = `${userName} bet ${amountStr}${optionStr}`;
      break;

    case 'parlay_started':
    case 'live_parlay':
      const parlayAmountStr = amount ? `${amount}🪙` : '';
      const parlayOddsStr = odds ? ` @${odds.toFixed(1)}x` : '';
      const parlayTitle = title || 'multi-leg parlay';

      text = `${userName} started ${parlayTitle} for ${parlayAmountStr}${parlayOddsStr}`;
      shortText = `${userName} started parlay ${parlayAmountStr}`;
      break;

    case 'prediction_created':
      const categoryStr = activity.category ? ` [${activity.category}]` : '';
      text = `${userName} created: "${title}"${categoryStr}`;
      shortText = `${userName} created: "${title}"`;
      break;

    case 'prediction_resolved':
      const winnerStr = optionLabel ? ` → ${optionLabel}` : '';
      text = `"${title}" resolved${winnerStr}`;
      shortText = `"${title}" resolved`;
      break;

    case 'big_win':
    case 'big_bet_alert':
      const winAmountStr = amount ? `${amount}🪙` : '';
      const streakStr = streak && streak > 1 ? ` (${streak} streak!)` : '';
      const contextStr = predictionTitle ? ` on "${predictionTitle}"` : '';

      text = `${userName} won ${winAmountStr}${streakStr}${contextStr}`;
      shortText = `${userName} won ${winAmountStr}`;
      break;

    case 'market_movement':
      text = `Market update: ${title}`;
      shortText = `Market: ${title}`;
      break;

    case 'achievement_unlocked':
      text = `${userName} unlocked "${title}"`;
      shortText = `${userName} unlocked achievement`;
      break;

    case 'user_followed':
      text = `${userName} followed ${description}`;
      shortText = `${userName} followed user`;
      break;

    case 'post_created':
      text = `${userName}: "${title}"`;
      shortText = `${userName} posted`;
      break;

    case 'comment_created':
      text = `${userName} commented: "${description}"`;
      shortText = `${userName} commented`;
      break;

    case 'leaderboard_update':
      text = 'Leaderboard updated with latest rankings';
      shortText = 'Leaderboard updated';
      break;

    default:
      text = description || `${userName} - ${type}`;
      shortText = `${userName} - ${type}`;
  }

  return { text, shortText, className, icon };
}

export default function ActivityFeed({ maxItems = 50, className = '' }: Props) {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  // Use global unified activity context
  const { activities: allActivities, loading, error, isConnected, refresh } = useActivity();

  // UI state for dashboard layout
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ActivityEventType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '6h' | '24h' | '7d'>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'personal' | 'social' | 'platform'>('all');

  // UI state for ticker layout
  const [isPaused, setIsPaused] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // No need for socket management here - it's all handled in the context

  // Handle horizontal scrolling with mouse wheel for ticker mode
  useEffect(() => {
    if (isDashboard || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scrollAmount = e.deltaY || e.deltaX;
      container.scrollLeft += scrollAmount;

      setIsUserScrolling(true);
      setIsPaused(true);

      // Clear existing timeout
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Resume auto-scroll after 3 seconds of no user interaction
      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
        setIsPaused(false);
      }, 3000);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [isDashboard]);

  // Handle touch scrolling for mobile ticker
  useEffect(() => {
    if (isDashboard || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let startX = 0;
    let startY = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);

        // If horizontal movement is greater than vertical, handle as horizontal scroll
        if (deltaX > deltaY && deltaX > 10) {
          isScrolling = true;
          setIsUserScrolling(true);
          setIsPaused(true);
        }
      }

      if (isScrolling) {
        e.preventDefault();
        const deltaX = startX - e.touches[0].clientX;
        container.scrollLeft += deltaX;
        startX = e.touches[0].clientX;
      }
    };

    const handleTouchEnd = () => {
      isScrolling = false;

      // Resume auto-scroll after 3 seconds
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      userScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
        setIsPaused(false);
      }, 3000);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [isDashboard]);

  // Limit activities to maxItems
  const activities = useMemo(() => {
    // Check for duplicates
    const ids = allActivities.map((a) => a.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn('[UnifiedActivityFeed] DUPLICATE ACTIVITIES DETECTED!');
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      console.warn('[UnifiedActivityFeed] Duplicate IDs:', duplicates);
      console.warn(
        '[UnifiedActivityFeed] Total activities:',
        ids.length,
        'Unique:',
        uniqueIds.size,
      );
    }
    return allActivities.slice(0, maxItems);
  }, [allActivities, maxItems]);

  // Filter activities for display
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((activity) => activity.type === typeFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((activity) => activity.priority === priorityFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const timeThresholds = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      const threshold = timeThresholds[timeFilter];
      if (threshold) {
        filtered = filtered.filter(
          (activity) => now.getTime() - new Date(activity.timestamp).getTime() <= threshold,
        );
      }
    }

    // User filter
    if (userFilter !== 'all') {
      switch (userFilter) {
        case 'personal':
          filtered = filtered.filter((activity) => activity.isPersonal);
          break;
        case 'social':
          filtered = filtered.filter(
            (activity) =>
              !activity.isPersonal && activity.user.id && activity.user.name !== 'Market',
          );
          break;
        case 'platform':
          filtered = filtered.filter(
            (activity) =>
              !activity.isPersonal && (!activity.user.id || activity.user.name === 'Market'),
          );
          break;
      }
    }

    return filtered.map((activity) => ({
      ...activity,
      formatted: formatRichActivity(activity),
    }));
  }, [activities, typeFilter, priorityFilter, timeFilter, userFilter]);

  // Dashboard layout (modular grid panel)
  if (isDashboard) {
    if (error) {
      return (
        <div className={`bg-surface border border-muted rounded-2xl p-6 shadow-lg ${className}`}>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Calculate dynamic height based on content and state
    const getComponentHeight = () => {
      if (isExpanded) {
        // When expanded, calculate based on filter state and content
        if (showFilters) {
          // With filters: more space needed
          const estimatedHeight = Math.min(600, 200 + filteredActivities.length * 80);
          return `${estimatedHeight}px`;
        } else {
          // Without filters: medium space
          const estimatedHeight = Math.min(500, 150 + filteredActivities.length * 80);
          return `${estimatedHeight}px`;
        }
      } else {
        // Collapsed: fixed compact height
        return '200px';
      }
    };

    return (
      <div
        className={`bg-surface border border-muted rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${className}`}
        style={{ height: getComponentHeight() }}
      >
        {/* Header */}
        <div className="p-4 border-b border-muted flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">📡</span>
              <div>
                <h3 className="font-semibold text-content">Live Activity Feed</h3>
                <p className="text-sm text-tertiary">
                  {filteredActivities.length} recent activities
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Connection Status Indicator */}
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span>{isConnected ? 'Live' : 'Offline'}</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-primary text-white' : 'hover:bg-background'
                }`}
                title="Filters"
              >
                🔍
              </button>
              <button
                onClick={refresh}
                className={`p-2 rounded-lg transition-colors hover:bg-background ${
                  loading ? 'animate-spin' : ''
                }`}
                title="Refresh"
              >
                🔄
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <span
                  className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  ▼
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Comprehensive Filters */}
        {showFilters && (
          <div className="p-4 border-b border-muted bg-background/50 flex-shrink-0">
            <div className="grid grid-cols-2 gap-4">
              {/* Activity Type Filter */}
              <div>
                <label className="block text-xs font-medium text-tertiary mb-2">
                  Activity Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
                  className="w-full bg-background border border-muted text-content rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="bet_placed">💰 Bets Placed</option>
                  <option value="parlay_started">🎯 Parlays Started</option>
                  <option value="prediction_created">🔮 Predictions Created</option>
                  <option value="prediction_resolved">✅ Predictions Resolved</option>
                  <option value="big_win">🏆 Big Wins</option>
                  <option value="achievement_unlocked">🏅 Achievements</option>
                  <option value="user_followed">👥 Social Activity</option>
                  <option value="live_bet">💸 Live Bets</option>
                  <option value="live_parlay">🎰 Live Parlays</option>
                  <option value="market_movement">📈 Market Updates</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium text-tertiary mb-2">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                  className="w-full bg-background border border-muted text-content rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>

              {/* Time Filter */}
              <div>
                <label className="block text-xs font-medium text-tertiary mb-2">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
                  className="w-full bg-background border border-muted text-content rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-xs font-medium text-tertiary mb-2">Source</label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value as typeof userFilter)}
                  className="w-full bg-background border border-muted text-content rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="personal">👤 Personal Activity</option>
                  <option value="social">👥 Social Activity</option>
                  <option value="platform">🏢 Platform Events</option>
                </select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-tertiary">
                Showing {filteredActivities.length} of {activities.length} activities
              </div>
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setPriorityFilter('all');
                  setTimeFilter('all');
                  setUserFilter('all');
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Activity Content - Dynamic Height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Activity List */}
          {isExpanded && (
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
              {loading && filteredActivities.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-tertiary">Loading activities...</span>
                </div>
              )}

              {filteredActivities.length === 0 && !loading && (
                <div className="text-center py-8 text-tertiary">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No activities found</p>
                  <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
              )}

              {filteredActivities.length > 0 && (
                <div className="p-4 space-y-3">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 p-3 bg-background/30 rounded-lg hover:bg-background/50 transition-colors"
                    >
                      <span className="text-lg flex-shrink-0">{activity.formatted.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-content">
                          {activity.formatted.text}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-tertiary">
                            {new Date(activity.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              activity.priority === 'high'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : activity.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}
                          >
                            {activity.priority}
                          </span>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-content">{activity.amount}🪙</div>
                          {activity.odds && (
                            <div className="text-xs text-tertiary">@{activity.odds}x</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapsed Preview */}
          {!isExpanded && filteredActivities.length > 0 && (
            <div className="p-4">
              <div className="space-y-2">
                {filteredActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                    onClick={() => setIsExpanded(true)}
                  >
                    <span className="text-lg">{activity.formatted.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content truncate">
                        {activity.formatted.shortText}
                      </p>
                    </div>
                    <div className="text-xs text-tertiary">
                      {new Date(activity.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}

                {filteredActivities.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors py-2"
                  >
                    View {filteredActivities.length - 3} more activities
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ticker layout (horizontal scrolling under navbar)
  const tickerText = useMemo(() => {
    return filteredActivities.map((activity) => activity.formatted.text).join('   •   ');
  }, [filteredActivities]);

  // Auto-scroll logic (same as EnhancedActivityTicker)
  useEffect(() => {
    if (isPaused || isUserScrolling || !contentRef.current || !scrollContainerRef.current) return;

    const content = contentRef.current;
    const container = scrollContainerRef.current;
    const scrollWidth = content.scrollWidth;
    const containerWidth = container.offsetWidth;

    if (scrollWidth <= containerWidth) return;

    const animationDuration = Math.max(30, tickerText.length / 3) * 1000;
    const scrollDistance = scrollWidth + containerWidth;

    let startTime: number;
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % animationDuration) / animationDuration;

      container.scrollLeft = progress * scrollDistance - containerWidth;

      if (!isPaused && !isUserScrolling) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPaused, isUserScrolling, tickerText, filteredActivities]);

  if (loading && !filteredActivities.length) {
    return (
      <div className={`bg-primary text-surface text-sm py-1 ${className}`}>
        <div className="px-4 animate-pulse">Loading activity feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-600 dark:bg-red-700 text-white text-sm py-1 ${className}`}>
        <div className="px-4 flex items-center justify-between">
          <span>Failed to load activity feed</span>
          <button onClick={refresh} className="text-xs underline hover:no-underline text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!filteredActivities.length) {
    return (
      <div className={`bg-muted dark:bg-muted text-content text-sm py-2 ${className}`}>
        <div className="px-4">No recent activity...</div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border-y border-muted text-content text-sm ${className}`}>
      <div
        ref={scrollContainerRef}
        className="scrollbar-hidden overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 bg-primary/5"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div ref={contentRef} className="inline-flex items-center px-4 min-w-full">
          {/* Primary activity content */}
          {filteredActivities.map((activity, index) => (
            <span
              key={`primary-${activity.id}`}
              className={`${activity.formatted.className} flex-shrink-0`}
            >
              <span className="mr-2">{activity.formatted.icon}</span>
              {activity.formatted.text}
              {index < filteredActivities.length - 1 && (
                <span className="mx-4 text-tertiary">•</span>
              )}
            </span>
          ))}

          {/* Seamless loop content - only shows during scrolling animation */}
          {filteredActivities.length > 3 && (
            <>
              <span className="mx-4 text-tertiary">•</span>
              {filteredActivities
                .slice(0, Math.min(5, filteredActivities.length))
                .map((activity, index) => (
                  <span
                    key={`loop-${activity.id}`}
                    className={`${activity.formatted.className} flex-shrink-0`}
                  >
                    <span className="mr-2">{activity.formatted.icon}</span>
                    {activity.formatted.text}
                    {index < Math.min(4, filteredActivities.length - 1) && (
                      <span className="mx-4 text-tertiary">•</span>
                    )}
                  </span>
                ))}
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-1 bg-secondary/10 text-xs text-center text-tertiary flex items-center justify-center gap-2">
        <span>{filteredActivities.length} live activities • Updated real-time</span>
        {isUserScrolling && <span className="text-primary">🖱️ Scroll to browse</span>}
      </div>
    </div>
  );
}
