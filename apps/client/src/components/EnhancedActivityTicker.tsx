import React, { useMemo, useState } from 'react';
import { useNormalizedActivityTicker } from '../hooks/useNormalizedActivityTicker';
import type { NormalizedActivityEvent, ActivityEventType } from '@ems/types';

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
      className += 'text-yellow-300 font-semibold ';
      break;
    case 'medium':
      className += 'text-blue-300 ';
      break;
    case 'low':
      className += 'text-gray-300 ';
      break;
  }
  
  // High-value styling
  if (meta.isHighValue) {
    className += 'animate-pulse ';
  }
  
  // Win/loss styling
  if (meta.isWin === true) {
    className += 'text-green-400 ';
  } else if (meta.isWin === false) {
    className += 'text-red-400 ';
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

  if (loading && !items.length) {
    return (
      <div className={`bg-blue-600 text-white text-sm py-1 ${className}`}>
        <div className="px-4 animate-pulse">Loading activity feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-600 text-white text-sm py-1 ${className}`}>
        <div className="px-4 flex items-center justify-between">
          <span>Failed to load activity feed</span>
          <button 
            onClick={refresh}
            className="text-xs underline hover:no-underline"
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
      <div className={`bg-gray-600 text-white text-sm ${className}`}>
        {showControls && (
          <div className="px-4 py-1 bg-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="hover:text-blue-300"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
                className="bg-gray-700 text-white rounded px-2 py-1"
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
              className="hover:text-blue-300"
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
    <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm ${className}`}>
      {showControls && (
        <div className="px-4 py-1 bg-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="hover:text-blue-300"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ActivityEventType | 'all')}
              className="bg-gray-700 text-white rounded px-2 py-1"
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
            className="hover:text-blue-300"
          >
            🔄 Refresh
          </button>
        </div>
      )}
      
      <div className="overflow-hidden whitespace-nowrap py-2">
        <div 
          className={`animate-marquee px-4 ${isPaused ? 'pause-animation' : ''}`}
          style={{
            animationDuration: `${Math.max(30, tickerText.length / 3)}s`
          }}
        >
          {processedItems.map((item, index) => (
            <span key={item.id} className={item.formatted.className}>
              <span className="mr-2">{item.formatted.icon}</span>
              {item.formatted.text}
              {index < processedItems.length - 1 && (
                <span className="mx-4 text-gray-400">•</span>
              )}
            </span>
          ))}
        </div>
      </div>
      
      {processedItems.length > 0 && (
        <div className="px-4 py-1 bg-black bg-opacity-20 text-xs text-center">
          {processedItems.length} recent activities • Updated live
        </div>
      )}
    </div>
  );
}