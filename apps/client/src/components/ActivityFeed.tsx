// apps/client/src/components/ActivityFeed.tsx
import { useMemo, useState, useRef, useEffect } from 'react';
import { useActivity, type Activity } from '../contexts/ActivityContext';
import { ActivityEventType } from '@ems/types';

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

// Simplified activity formatter for ticker display
function formatTickerActivity(activity: Activity): {
  text: string;
  className: string;
  icon: string;
} {
  const { user, title, description, amount, odds, predictionTitle, optionLabel, type, priority } =
    activity;
  const userName = user.name;

  // Base classes
  let className = 'inline-flex items-center space-x-1 ';

  // Priority-based styling
  switch (priority) {
    case 'high':
      className += 'text-yellow-400 font-semibold ';
      break;
    case 'medium':
      className += 'text-blue-400 ';
      break;
    case 'low':
      className += 'text-tertiary ';
      break;
  }

  let text = '';
  let icon = activity.icon || '📡';

  // Map to backend ActivityEventType
  switch (type) {
    case ActivityEventType.BET_PLACED:
    case 'live_bet':
      icon = '💰';
      const amountStr = amount ? `${amount}🪙` : '';
      const oddsStr = odds ? ` @${odds}x` : '';
      const optionStr = optionLabel ? ` on "${optionLabel}"` : '';
      text = `${userName} bet ${amountStr}${optionStr}${oddsStr}`;
      break;

    case ActivityEventType.PARLAY_STARTED:
    case 'live_parlay':
      icon = '🎯';
      const parlayAmount = amount ? `${amount}🪙` : '';
      const parlayOdds = odds ? ` @${odds.toFixed(1)}x` : '';
      text = `${userName} started parlay ${parlayAmount}${parlayOdds}`;
      break;

    case ActivityEventType.PREDICTION_CREATED:
      icon = '🔮';
      text = `${userName} created: "${title}"`;
      break;

    case ActivityEventType.PREDICTION_RESOLVED:
      icon = '✅';
      const winner = optionLabel ? ` → ${optionLabel}` : '';
      text = `"${title}" resolved${winner}`;
      break;

    case ActivityEventType.BIG_WIN:
    case 'big_bet_alert':
      icon = '🏆';
      const winAmount = amount ? `${amount}🪙` : '';
      const context = predictionTitle ? ` on "${predictionTitle}"` : '';
      text = `${userName} won ${winAmount}${context}`;
      className += 'animate-pulse ';
      break;

    case ActivityEventType.ACHIEVEMENT_UNLOCKED:
      icon = '🏅';
      text = `${userName} unlocked "${title}"`;
      break;

    case ActivityEventType.USER_FOLLOWED:
      icon = '👥';
      text = `${userName} followed ${description}`;
      break;

    case ActivityEventType.POST_CREATED:
      icon = '💬';
      text = `${userName}: "${title}"`;
      break;

    case ActivityEventType.COMMENT_CREATED:
      icon = '💭';
      text = `${userName} commented: "${description}"`;
      break;

    case ActivityEventType.LEADERBOARD_UPDATE:
      icon = '📊';
      text = 'Leaderboard updated';
      break;

    case 'market_movement':
      icon = '📈';
      text = `Market update: ${title}`;
      break;

    default:
      text = description || `${userName} - ${type}`;
  }

  return { text, className, icon };
}

/**
 * Global activity ticker - displays real-time platform events
 * Simplified to ticker-only mode as other layouts have been deprecated
 */
export default function ActivityFeed({ maxItems = 50, className = '' }: Props) {
  // Use global unified activity context
  const { activities: allActivities, loading, error, refresh } = useActivity();

  // Ticker UI state
  const [isPaused, setIsPaused] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limit activities to maxItems
  const activities = useMemo(() => {
    return allActivities.slice(0, maxItems);
  }, [allActivities, maxItems]);

  // Format activities for ticker display
  const formattedActivities = useMemo(() => {
    return activities.map((activity) => ({
      ...activity,
      formatted: formatTickerActivity(activity),
    }));
  }, [activities]);

  // Handle horizontal scrolling with mouse wheel
  useEffect(() => {
    if (!scrollContainerRef.current) return;

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
  }, []);

  // Handle touch scrolling for mobile
  useEffect(() => {
    if (!scrollContainerRef.current) return;

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
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    if (isPaused || isUserScrolling || !contentRef.current || !scrollContainerRef.current) return;

    const content = contentRef.current;
    const container = scrollContainerRef.current;
    const scrollWidth = content.scrollWidth;
    const containerWidth = container.offsetWidth;

    if (scrollWidth <= containerWidth) return;

    // Calculate animation duration based on content length (slower scroll)
    const animationDuration = Math.max(40, formattedActivities.length * 5) * 1000;
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
  }, [isPaused, isUserScrolling, formattedActivities]);

  // Loading state
  if (loading && !formattedActivities.length) {
    return (
      <div className={`bg-primary text-surface text-sm py-1 ${className}`}>
        <div className="px-4 animate-pulse">Loading activity feed...</div>
      </div>
    );
  }

  // Error state
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

  // Empty state
  if (!formattedActivities.length) {
    return (
      <div className={`bg-muted dark:bg-muted text-content text-sm py-2 ${className}`}>
        <div className="px-4">No recent activity...</div>
      </div>
    );
  }

  // Ticker display
  return (
    <div className={`bg-surface border-y border-muted text-content text-sm ${className}`}>
      <div
        ref={scrollContainerRef}
        className="scrollbar-hidden overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 bg-primary/5"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div ref={contentRef} className="inline-flex items-center px-4 min-w-full">
          {/* Primary activity content */}
          {formattedActivities.map((activity, index) => (
            <span
              key={`primary-${activity.id}`}
              className={`${activity.formatted.className} flex-shrink-0`}
            >
              <span className="mr-2">{activity.formatted.icon}</span>
              {activity.formatted.text}
              {index < formattedActivities.length - 1 && (
                <span className="mx-4 text-tertiary">•</span>
              )}
            </span>
          ))}

          {/* Seamless loop content - only shows during scrolling animation */}
          {formattedActivities.length > 3 && (
            <>
              <span className="mx-4 text-tertiary">•</span>
              {formattedActivities
                .slice(0, Math.min(5, formattedActivities.length))
                .map((activity, index) => (
                  <span
                    key={`loop-${activity.id}`}
                    className={`${activity.formatted.className} flex-shrink-0`}
                  >
                    <span className="mr-2">{activity.formatted.icon}</span>
                    {activity.formatted.text}
                    {index < Math.min(4, formattedActivities.length - 1) && (
                      <span className="mx-4 text-tertiary">•</span>
                    )}
                  </span>
                ))}
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-1 bg-secondary/10 text-xs text-center text-tertiary flex items-center justify-center gap-2">
        <span>{formattedActivities.length} live activities • Updated real-time</span>
        {isUserScrolling && <span className="text-primary">🖱️ Scroll to browse</span>}
      </div>
    </div>
  );
}
