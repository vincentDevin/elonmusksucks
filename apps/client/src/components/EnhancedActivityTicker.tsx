import { useMemo, useState, useRef, useEffect } from 'react';
import { useNormalizedActivityTicker } from '../hooks/useNormalizedActivityTicker';
import type { NormalizedActivityEvent, ActivityEventType } from '@ems/types';

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

// Enhanced formatting with rich context and styling
function formatNormalizedActivity(event: NormalizedActivityEvent): {
  text: string;
  className: string;
  icon: string;
} {
  const { user, meta, type, priority } = event;
  const userName = user.name;
  
  // Base classes
  let className = 'inline-flex items-center space-x-1 ';
  let icon = '•';
  
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
  if (meta.isHighValue) {
    className += 'animate-pulse ';
  }
  
  // Win/loss styling
  if (meta.isWin === true) {
    className += 'text-green-600 dark:text-green-400 ';
  } else if (meta.isWin === false) {
    className += 'text-red-600 dark:text-red-400 ';
  }

  let text = '';
  
  switch (type) {
    case 'bet_placed':
      icon = '💰';
      const amount = meta.amount ? `$${meta.amount}` : '';
      const option = meta.option ? ` on "${meta.option}"` : '';
      const odds = meta.odds ? ` @${meta.odds}x` : '';
      text = `${userName} bet ${amount}${option}${odds}`;
      if (meta.title) text += ` on ${meta.title}`;
      break;
      
    case 'parlay_started':
      icon = '🎯';
      const parlayAmount = meta.amount ? `$${meta.amount}` : '';
      const parlayOdds = meta.odds ? ` @${meta.odds.toFixed(1)}x` : '';
      text = `${userName} started ${meta.title || 'a parlay'} for ${parlayAmount}${parlayOdds}`;
      break;
      
    case 'prediction_created':
      icon = '🔮';
      text = `${userName} created: "${meta.title}"`;
      if (meta.category) text += ` [${meta.category}]`;
      break;
      
    case 'prediction_resolved':
      icon = '✅';
      text = `"${meta.title}" resolved`;
      if (meta.option) text += ` → ${meta.option}`;
      break;
      
    case 'big_win':
      icon = '🏆';
      const winAmount = meta.amount ? `$${meta.amount}` : '';
      text = `${userName} won ${winAmount}`;
      if (meta.streak && meta.streak > 1) text += ` (${meta.streak} streak!)`;
      if (meta.title) text += ` on "${meta.title}"`;
      break;
      
    case 'post_created':
      icon = '📝';
      text = `${userName}: "${meta.title}"`;
      break;
      
    case 'comment_created':
      icon = '💬';
      text = `${userName} commented: "${meta.title}"`;
      break;
      
    case 'badge_earned':
      icon = '🏅';
      text = `${userName} earned "${meta.title}"`;
      break;
      
    case 'leaderboard_update':
      icon = '📊';
      text = `Leaderboard updated`;
      break;
      
    default:
      text = `${userName} - ${type}`;
  }

  return { text, className, icon };
}

interface Props {
  maxItems?: number;
  showControls?: boolean;
  priorityFilter?: 'all' | 'high' | 'medium' | 'low';
  className?: string;
}

export default function EnhancedActivityTicker({ 
  maxItems = 20, 
  showControls = false,
  priorityFilter = 'all',
  className = ''
}: Props) {
  const { items, loading, error, refresh } = useNormalizedActivityTicker(maxItems);
  const [isPaused, setIsPaused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ActivityEventType | 'all'>('all');
  // const [scrollPosition, setScrollPosition] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter and format items
  const processedItems = useMemo(() => {
    let filtered = items;
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }
    
    // Format for display
    return filtered.map(item => ({
      ...item,
      formatted: formatNormalizedActivity(item)
    }));
  }, [items, priorityFilter, typeFilter]);

  const tickerText = useMemo(() => {
    return processedItems
      .map(item => item.formatted.text)
      .join('   •   ');
  }, [processedItems]);

  // Handle horizontal scrolling with mouse wheel
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

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
    const container = scrollContainerRef.current;
    if (!container) return;

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

  // Auto-scroll animation when not paused by user
  useEffect(() => {
    if (isPaused || isUserScrolling || !contentRef.current || !scrollContainerRef.current) return;

    const content = contentRef.current;
    const container = scrollContainerRef.current;
    const scrollWidth = content.scrollWidth;
    const containerWidth = container.offsetWidth;

    if (scrollWidth <= containerWidth) return;

    const animationDuration = Math.max(30, tickerText.length / 3) * 1000; // Convert to ms
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
  }, [isPaused, isUserScrolling, tickerText, processedItems]);

  if (loading && !items.length) {
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
          <button 
            onClick={refresh}
            className="text-xs underline hover:no-underline text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!processedItems.length) {
    const message = typeFilter === 'all' && priorityFilter === 'all' 
      ? 'No recent activity...' 
      : `No ${typeFilter === 'all' ? '' : typeFilter.replace('_', ' ')} activity found...`;
    
    return (
      <div className={`bg-muted dark:bg-muted text-content text-sm ${className}`}>
        {showControls && (
          <div className="px-4 py-1 bg-surface border-b border-muted flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="hover:text-primary text-content"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
                className="bg-background border border-muted text-content rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="bet_placed">💰 Bets</option>
                <option value="parlay_started">🎯 Parlays</option>
                <option value="prediction_created">🔮 Predictions</option>
                <option value="prediction_resolved">✅ Resolved</option>
                <option value="big_win">🏆 Big Wins</option>
                <option value="post_created">📝 Posts</option>
                <option value="comment_created">💬 Comments</option>
                <option value="badge_earned">🏅 Badges</option>
              </select>
            </div>
            <button
              onClick={refresh}
              className="hover:text-primary text-content"
            >
              🔄 Refresh
            </button>
          </div>
        )}
        <div className="px-4 py-2">{message}</div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border-y border-muted text-content text-sm ${className}`}>
      {showControls && (
        <div className="px-4 py-1 bg-secondary/20 border-b border-muted flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="hover:text-primary text-content"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
              className="bg-background border border-muted text-content rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="bet_placed">💰 Bets</option>
              <option value="parlay_started">🎯 Parlays</option>
              <option value="prediction_created">🔮 Predictions</option>
              <option value="prediction_resolved">✅ Resolved</option>
              <option value="big_win">🏆 Big Wins</option>
              <option value="post_created">📝 Posts</option>
              <option value="comment_created">💬 Comments</option>
              <option value="badge_earned">🏅 Badges</option>
            </select>
          </div>
          <button
            onClick={refresh}
            className="hover:text-primary text-content"
          >
            🔄 Refresh
          </button>
        </div>
      )}
      
      <div 
        ref={scrollContainerRef}
        className="scrollbar-hidden overflow-x-auto overflow-y-hidden whitespace-nowrap py-2 bg-primary/5"
        style={{ 
          scrollBehavior: 'smooth'
        }}
      >
        <div 
          ref={contentRef}
          className="inline-flex items-center px-4 min-w-full"
        >
          {processedItems.map((item, index) => (
            <span key={item.id} className={`${item.formatted.className} flex-shrink-0`}>
              <span className="mr-2">{item.formatted.icon}</span>
              {item.formatted.text}
              {index < processedItems.length - 1 && (
                <span className="mx-4 text-tertiary">•</span>
              )}
            </span>
          ))}
          {/* Add duplicate content for seamless scrolling */}
          {processedItems.length > 0 && processedItems.map((item, index) => (
            <span key={`dup-${item.id}`} className={`${item.formatted.className} flex-shrink-0`}>
              <span className="mx-4 text-tertiary">•</span>
              <span className="mr-2">{item.formatted.icon}</span>
              {item.formatted.text}
              {index < processedItems.length - 1 && (
                <span className="mx-4 text-tertiary">•</span>
              )}
            </span>
          ))}
        </div>
      </div>
      
      {processedItems.length > 0 && (
        <div className="px-4 py-1 bg-secondary/10 text-xs text-center text-tertiary flex items-center justify-center gap-2">
          <span>{processedItems.length} recent activities • Updated live</span>
          {isUserScrolling && (
            <span className="text-primary">
              🖱️ Scroll to browse • Auto-resume in 3s
            </span>
          )}
        </div>
      )}
    </div>
  );
}