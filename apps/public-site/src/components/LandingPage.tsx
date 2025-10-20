import React from 'react';
import type {
  PredictionView,
  LeaderboardEntryView,
  UnifiedActivityEvent,
  PublicArticle,
  PublicPostView,
  PongLeaderboardView,
} from '@ems/types';
import ThemeToggle from './ThemeToggle';

interface LandingPageProps {
  trendingData: PredictionView[] | null;
  predictionsData: PredictionView[] | null;
  leaderboardData: LeaderboardEntryView[] | null;
  fullLeaderboardData: LeaderboardEntryView[] | null;
  pongLeaderboardData: PongLeaderboardView[] | null;
  activityData: UnifiedActivityEvent[] | null;
  articlesData: PublicArticle[] | null;
  postsData: PublicPostView[] | null;
  clientAppUrl: string;
}

export default function LandingPage({
  trendingData,
  predictionsData,
  leaderboardData,
  fullLeaderboardData,
  pongLeaderboardData,
  activityData,
  articlesData,
  postsData,
  clientAppUrl,
}: LandingPageProps) {
  const [leaderboardTab, setLeaderboardTab] = React.useState<'market' | 'pong'>('market');

  // Content tab state
  const [contentTab, setContentTab] = React.useState<'predictions' | 'articles' | 'community'>(
    'predictions',
  );

  // "See more" state management
  const [showAllPredictions, setShowAllPredictions] = React.useState(false);
  const [showAllArticles, setShowAllArticles] = React.useState(false);
  const [showAllPosts, setShowAllPosts] = React.useState(false);

  const predictions = Array.isArray(predictionsData)
    ? predictionsData
    : Array.isArray(trendingData)
      ? trendingData
      : [];
  const leaders = Array.isArray(fullLeaderboardData)
    ? fullLeaderboardData
    : Array.isArray(leaderboardData)
      ? leaderboardData
      : [];
  const pongLeaders = Array.isArray(pongLeaderboardData) ? pongLeaderboardData : [];
  const articles = Array.isArray(articlesData) ? articlesData : [];
  const posts = Array.isArray(postsData) ? postsData : [];
  const activities = Array.isArray(activityData) ? activityData : [];

  const openPredictions = predictions.filter(
    (p) => p.status === 'APPROVED' && new Date(p.expiresAt) > new Date(),
  );

  // Helper functions
  const formatMuskBucks = (amount: string | number | bigint | undefined | null) => {
    if (amount == null || amount === undefined) return '0';
    let numAmount: number;
    if (typeof amount === 'string') numAmount = parseFloat(amount);
    else if (typeof amount === 'bigint') numAmount = Number(amount);
    else numAmount = amount;
    if (isNaN(numAmount)) return '0';
    if (numAmount >= 1000000) return `${(numAmount / 1000000).toFixed(1)}M`;
    if (numAmount >= 1000) return `${(numAmount / 1000).toFixed(1)}K`;
    return numAmount.toString();
  };

  const formatOdds = (odds: number) => `${odds.toFixed(1)}x`;

  const getTotalVolume = (prediction: PredictionView) => {
    return prediction.bets.reduce((sum: number, bet) => sum + parseInt(bet.amount.toString()), 0);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'Soon';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🏆';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRelativeTime = (timestamp: string | Date) => {
    const now = new Date();
    const time = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(time);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Tesla: 'bg-error/10 text-error border-error/30',
      Twitter: 'bg-info/10 text-info border-info/30',
      SpaceX: 'bg-secondary/10 text-secondary border-secondary/30',
      Stocks: 'bg-success/10 text-success border-success/30',
      Space: 'bg-info/10 text-info border-info/30',
      TEST: 'bg-muted/30 text-content border-border',
    };
    return colors[category] || 'bg-muted/30 text-content border-border';
  };

  // Calculate global stats
  const totalBets = predictions.reduce((sum, p) => sum + p.bets.length, 0);
  const totalVolume = leaders.reduce((sum, entry) => {
    const balance = typeof entry.balance === 'string' ? parseFloat(entry.balance) : entry.balance;
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  return (
    <div className="bg-background text-content min-h-screen">
      {/* Floating Theme Toggle */}
      <div className="fixed top-2 right-2 z-50">
        <ThemeToggle />
      </div>

      {/* Ultra Compact Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent">
        <div className="absolute inset-0 bg-background/95 dark:bg-background/90"></div>
        <div className="relative container mx-auto px-3 py-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-1 text-content">ElonMuskSucks.net</h1>
            <p className="text-sm md:text-base text-content mb-1 font-semibold">
              The World's Most Accurate Musk Weather Report
            </p>
            <p className="text-xs text-content/70 mb-4">Forecast: Erratic with a chance of chaos</p>

            {/* Inline Stats */}
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              <div className="bg-surface border border-border rounded px-3 py-1.5">
                <div className="text-lg font-bold text-primary">{openPredictions.length}</div>
                <div className="text-[9px] text-tertiary">Markets</div>
              </div>
              <div className="bg-surface border border-border rounded px-3 py-1.5">
                <div className="text-lg font-bold text-success">{leaders.length}</div>
                <div className="text-[9px] text-tertiary">Predictors</div>
              </div>
              <div className="bg-surface border border-border rounded px-3 py-1.5">
                <div className="text-lg font-bold text-warning">{totalBets}</div>
                <div className="text-[9px] text-tertiary">Bets</div>
              </div>
              <div className="bg-surface border border-border rounded px-3 py-1.5">
                <div className="text-lg font-bold text-secondary">
                  {formatMuskBucks(totalVolume)}
                </div>
                <div className="text-[9px] text-tertiary">MuskBucks</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex justify-center gap-2">
              <a
                href={`${clientAppUrl}/register`}
                className="px-4 py-1.5 bg-gradient-primary text-white rounded text-xs font-semibold hover-lift"
              >
                🚀 Start Predicting
              </a>
              <a
                href={`${clientAppUrl}/login`}
                className="px-4 py-1.5 bg-surface border border-content/20 text-content rounded text-xs font-semibold hover-lift"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Ticker - Full Width Edge-to-Edge */}
      <div className="border-y border-border bg-surface/80 backdrop-blur-sm overflow-hidden py-2">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center gap-1 text-xs font-bold whitespace-nowrap flex-shrink-0">
            <span>⚡</span>
            <span>Live</span>
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-hidden -mx-2">
            <div className="flex gap-4 ticker-scroll">
              {activities.slice(0, 30).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-1 text-[10px] whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm">{activity.icon}</span>
                  <span className="font-semibold text-primary">{activity.userName}</span>
                  <span className="text-tertiary">{activity.description}</span>
                  {activity.amount && (
                    <span className="text-success">({formatMuskBucks(activity.amount)}MB)</span>
                  )}
                  <span className="text-tertiary text-[8px]">
                    • {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {activities.slice(0, 30).map((activity) => (
                <div
                  key={`dup-${activity.id}`}
                  className="flex items-center gap-1 text-[10px] whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm">{activity.icon}</span>
                  <span className="font-semibold text-primary">{activity.userName}</span>
                  <span className="text-tertiary">{activity.description}</span>
                  {activity.amount && (
                    <span className="text-success">({formatMuskBucks(activity.amount)}MB)</span>
                  )}
                  <span className="text-tertiary text-[8px]">
                    • {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-2 py-3">
        <div className="max-w-[1800px] mx-auto space-y-3">
          {/* Tabbed Content Section */}
          <div className="section-card p-4">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setContentTab('predictions');
                    setShowAllPredictions(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 ${
                    contentTab === 'predictions'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-muted/20'
                  }`}
                >
                  <span className="text-base">🔥</span>
                  <span>Predictions</span>
                  <span className="text-xs opacity-75">({openPredictions.length})</span>
                </button>
                <button
                  onClick={() => {
                    setContentTab('articles');
                    setShowAllArticles(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 ${
                    contentTab === 'articles'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-muted/20'
                  }`}
                >
                  <span className="text-base">📰</span>
                  <span>Articles</span>
                  <span className="text-xs opacity-75">({articles.length})</span>
                </button>
                <button
                  onClick={() => {
                    setContentTab('community');
                    setShowAllPosts(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 ${
                    contentTab === 'community'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-muted/20'
                  }`}
                >
                  <span className="text-base">💬</span>
                  <span>Community</span>
                  <span className="text-xs opacity-75">({posts.length})</span>
                </button>
              </div>
            </div>

            {/* PREDICTIONS TAB */}
            {contentTab === 'predictions' && (
              <div>
                <div className="space-y-3">
                  {openPredictions
                    .slice(0, showAllPredictions ? openPredictions.length : 4)
                    .map((prediction) => {
                      const now = Date.now();
                      const expires = new Date(prediction.expiresAt).getTime();
                      const timeLeft = expires - now;
                      const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

                      // Determine status
                      const getStatus = () => {
                        if (prediction.resolvedAt)
                          return { type: 'resolved', icon: '✅', text: 'Resolved' };
                        if (now > expires) return { type: 'expired', icon: '⏰', text: 'Expired' };
                        if (hoursLeft <= 2)
                          return { type: 'ending-soon', icon: '🔥', text: 'Ending Soon' };
                        if (hoursLeft <= 24) return { type: 'info', icon: '⚡', text: 'Final Day' };
                        return { type: 'open', icon: '🟢', text: 'Open' };
                      };

                      const status = getStatus();

                      return (
                        <div key={prediction.id} className="preview-card p-4 relative group">
                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`status-badge ${status.type}`}>
                              <span>{status.icon}</span>
                              {status.text}
                            </span>
                          </div>

                          {/* Title */}
                          <div className="pr-20 mb-3">
                            <h3 className="font-semibold text-base leading-tight mb-2 text-content">
                              {prediction.title}
                            </h3>
                            <div className="flex gap-2 flex-wrap items-center">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(prediction.category?.name || '')}`}
                              >
                                {prediction.category?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-tertiary">{prediction.type}</span>
                            </div>
                          </div>

                          {/* Creator Info */}
                          {prediction.creator && (
                            <div className="flex items-center gap-2 mb-3 text-sm">
                              {prediction.creator.avatarUrl && (
                                <img
                                  src={prediction.creator.avatarUrl}
                                  alt={prediction.creator.name}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              )}
                              <span className="text-tertiary text-xs">
                                by{' '}
                                <span className="text-content font-medium">
                                  {prediction.creator.name}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-tertiary mb-3">
                            <span className="flex items-center gap-1">
                              <span>💰</span>
                              {formatMuskBucks(getTotalVolume(prediction))}
                            </span>
                            <span className="flex items-center gap-1">
                              <span>📊</span>
                              {prediction.bets.length} bets
                            </span>
                            {!prediction.resolvedAt && (
                              <span className="flex items-center gap-1 text-xs">
                                <span>⏰</span>
                                {getTimeRemaining(prediction.expiresAt)}
                              </span>
                            )}
                          </div>

                          {/* Options */}
                          <div className="flex gap-2 flex-wrap">
                            {prediction.options.map((option) => (
                              <div
                                key={option.id}
                                className="bg-muted/20 hover:bg-muted/30 rounded px-3 py-1.5 text-sm transition-colors"
                              >
                                <span className="font-medium text-content">{option.label}</span>
                                <span className="text-primary font-bold ml-2">
                                  {formatOdds(option.odds)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Recent Bets */}
                          {prediction.bets.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border text-xs text-tertiary">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Recent:</span>
                                {prediction.bets.slice(0, 2).map((bet) => (
                                  <span key={bet.id}>
                                    {bet.userName} ({bet.amount}MB)
                                  </span>
                                ))}
                                {prediction.bets.length > 2 && (
                                  <span className="text-primary">
                                    +{prediction.bets.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* See More Button */}
                {openPredictions.length > 4 && (
                  <button
                    onClick={() => setShowAllPredictions(!showAllPredictions)}
                    className="see-more-btn mt-3"
                  >
                    {showAllPredictions
                      ? '▲ Show Less'
                      : `▼ Show ${openPredictions.length - 4} More`}
                  </button>
                )}
              </div>
            )}

            {/* ARTICLES TAB */}
            {contentTab === 'articles' && (
              <div>
                <div className="space-y-3">
                  {articles.slice(0, showAllArticles ? articles.length : 4).map((article: any) => (
                    <div key={article.id} className="preview-card p-4 flex gap-4">
                      {/* Image Preview - Left Side */}
                      {article.content.imageUrl && (
                        <div className="w-48 h-32 overflow-hidden rounded-lg flex-shrink-0">
                          <img
                            src={article.content.imageUrl}
                            alt={article.content.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Content - Right Side */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        {/* Metadata */}
                        <div className="flex gap-2 mb-2 text-xs items-center flex-wrap">
                          <span className="text-info bg-info/10 border border-info/20 px-2 py-0.5 rounded font-medium">
                            Article
                          </span>
                          <span className="text-tertiary">
                            {article.content.author || article.content.source}
                          </span>
                          <span className="text-tertiary">•</span>
                          <span className="text-tertiary">
                            {getRelativeTime(article.timestamp || article.createdAt)}
                          </span>
                          {article.content.source && article.content.author && (
                            <>
                              <span className="text-tertiary">•</span>
                              <span className="text-tertiary">{article.content.source}</span>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold mb-2 line-clamp-2 leading-tight text-content hover:text-primary transition-colors">
                          {article.content.title}
                        </h3>

                        {/* Excerpt */}
                        {article.content.excerpt && (
                          <p className="text-sm text-content/80 mb-3 line-clamp-2 leading-relaxed">
                            {article.content.excerpt}
                          </p>
                        )}

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {article.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-muted/20 text-content/70 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {article.tags.length > 3 && (
                              <span className="px-2 py-0.5 bg-muted/20 text-content/70 text-xs rounded-full">
                                +{article.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Engagement & Action */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                          <div className="flex items-center gap-4 text-sm text-tertiary">
                            <span className="flex items-center gap-1">
                              <span>👍</span>
                              {article.engagement.reactions}
                            </span>
                            <span className="flex items-center gap-1">
                              <span>💬</span>
                              {article.engagement.comments}
                            </span>
                          </div>
                          <a
                            href={article.content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
                          >
                            Read Article →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* See More Button */}
                {articles.length > 4 && (
                  <button
                    onClick={() => setShowAllArticles(!showAllArticles)}
                    className="see-more-btn mt-3"
                  >
                    {showAllArticles ? '▲ Show Less' : `▼ Show ${articles.length - 4} More`}
                  </button>
                )}
              </div>
            )}

            {/* COMMUNITY TAB */}
            {contentTab === 'community' && (
              <div>
                <div className="space-y-3">
                  {posts.slice(0, showAllPosts ? posts.length : 4).map((post) => {
                    const avatarUrl = post.author?.avatarUrl || undefined;
                    const authorName = post.author?.name || 'Unknown';
                    const commentsCount = post.commentsCount || post.repliesCount || 0;
                    const reactionsCount = post.reactionsCount || 0;

                    return (
                      <div key={post.id} className="preview-card p-4">
                        {/* Author Header */}
                        <div className="flex items-start gap-3 mb-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={authorName}
                              className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold flex-shrink-0 hover:ring-2 hover:ring-primary/30 transition-all">
                              {authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-content hover:text-primary transition-colors">
                                {authorName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-tertiary">
                              <span className="text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded text-xs font-medium">
                                Post
                              </span>
                              <span className="text-xs">{getRelativeTime(post.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-3">
                          <p className="text-content leading-relaxed line-clamp-3 text-sm">
                            {post.body}
                          </p>
                        </div>

                        {/* Media Grid */}
                        {post.mediaUrls && post.mediaUrls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {post.mediaUrls.slice(0, 2).map((url, index) => (
                              <div key={index} className="overflow-hidden rounded-lg">
                                <img
                                  src={url}
                                  alt=""
                                  className="object-cover w-full h-32 hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Engagement & Action */}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-4 text-sm text-tertiary">
                            <span className="flex items-center gap-1.5">
                              <span className="text-base">❤️</span>
                              <span className="font-medium">{reactionsCount}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-base">💬</span>
                              <span className="font-medium">{commentsCount}</span>
                            </span>
                          </div>
                          <a
                            href={`${clientAppUrl}/login`}
                            className="px-3 py-1.5 border border-border hover:border-primary rounded-lg text-content font-medium text-xs transition-colors"
                          >
                            Join Discussion
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* See More Button */}
                {posts.length > 4 && (
                  <button
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="see-more-btn mt-3"
                  >
                    {showAllPosts ? '▲ Show Less' : `▼ Show ${posts.length - 4} More`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* LEADERBOARD - Enhanced Full Width */}
          <div className="section-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">{leaderboardTab === 'market' ? '🏆' : '🏓'}</span>
                <span>{leaderboardTab === 'market' ? 'Market Leaderboard' : 'Pong Champions'}</span>
              </h2>
              <div className="flex gap-2 bg-background border border-border rounded-lg p-1">
                <button
                  onClick={() => setLeaderboardTab('market')}
                  className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                    leaderboardTab === 'market'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-muted/20'
                  }`}
                >
                  🏆 Market
                </button>
                <button
                  onClick={() => setLeaderboardTab('pong')}
                  className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                    leaderboardTab === 'pong'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-muted/20'
                  }`}
                >
                  🏓 Pong
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {leaderboardTab === 'market' ? (
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 sticky top-0">
                    <tr className="text-xs text-tertiary">
                      <th className="px-3 py-3 text-left w-16">Rank</th>
                      <th className="px-3 py-3 text-left">Player</th>
                      <th className="px-3 py-3 text-right">Profit</th>
                      <th className="px-3 py-3 text-right hidden sm:table-cell">Win Rate</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Total Bets</th>
                      <th className="px-3 py-3 text-right hidden lg:table-cell">Balance</th>
                      <th className="px-3 py-3 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.slice(0, 25).map((entry, index) => {
                      const rank = index + 1;
                      const getRankClass = () => {
                        if (rank === 1) return 'rank-1';
                        if (rank === 2) return 'rank-2';
                        if (rank === 3) return 'rank-3';
                        return '';
                      };

                      return (
                        <tr
                          key={entry.userId}
                          className={`border-b border-border/50 hover:bg-muted/10 transition-colors ${getRankClass()}`}
                        >
                          <td className="px-3 py-3 font-bold text-base">
                            <span className="flex items-center gap-1">{getRankIcon(rank)}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold text-content">{entry.userName}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold text-primary">
                              +{formatMuskBucks(entry.profitAll)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right hidden sm:table-cell">
                            <span className="font-medium">{Math.round(entry.winRate * 100)}%</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden md:table-cell">
                            <span className="text-tertiary">{entry.totalBets}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden lg:table-cell">
                            <span className="text-tertiary">{formatMuskBucks(entry.balance)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold text-success">
                              {Math.round((entry.roi || 0) * 100)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : pongLeaders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏓</div>
                  <h3 className="text-xl font-bold text-content mb-2">No Pong Champions Yet!</h3>
                  <p className="text-sm text-tertiary">
                    Be the first to dominate the Pong leaderboard.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 sticky top-0">
                    <tr className="text-xs text-tertiary">
                      <th className="px-3 py-3 text-left w-16">Rank</th>
                      <th className="px-3 py-3 text-left">Player</th>
                      <th className="px-3 py-3 text-right">ELO Rating</th>
                      <th className="px-3 py-3 text-right hidden sm:table-cell">Wins</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Win Streak</th>
                      <th className="px-3 py-3 text-right hidden lg:table-cell">Total Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pongLeaders.slice(0, 20).map((entry) => {
                      const rank = entry.rank || 0;
                      const getRankClass = () => {
                        if (rank === 1) return 'rank-1';
                        if (rank === 2) return 'rank-2';
                        if (rank === 3) return 'rank-3';
                        return '';
                      };

                      return (
                        <tr
                          key={entry.userId}
                          className={`border-b border-border/50 hover:bg-muted/10 transition-colors ${getRankClass()}`}
                        >
                          <td className="px-3 py-3 font-bold text-base">
                            <span className="flex items-center gap-1">{getRankIcon(rank)}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold text-content">{entry.userName}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="font-bold text-primary">{entry.eloRating}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden sm:table-cell">
                            <span className="font-medium">{entry.wins || 0}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden md:table-cell">
                            <span className="text-tertiary">{entry.winStreak || 0}</span>
                          </td>
                          <td className="px-3 py-3 text-right hidden lg:table-cell">
                            <span className="font-medium text-success">
                              {formatMuskBucks(entry.totalWon || 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer CTA */}
        <div className="bg-surface border border-border rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Predict the Chaos?</h2>
          <p className="text-sm text-tertiary mb-4">Join thousands tracking Elon's moves</p>
          <a
            href={`${clientAppUrl}/register`}
            className="inline-block px-8 py-3 bg-gradient-primary text-white rounded-lg font-semibold text-sm hover-lift shadow-sm"
          >
            🚀 Get Started Free
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 mt-4">
        <div className="container mx-auto px-3 py-2 text-center">
          <p className="text-[9px] text-tertiary">© 2025 ElonMuskSucks.net</p>
        </div>
      </footer>
    </div>
  );
}
