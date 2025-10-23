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
  const [showAllMarketLeaders, setShowAllMarketLeaders] = React.useState(false);
  const [showAllPongLeaders, setShowAllPongLeaders] = React.useState(false);

  // Modal state management
  const [showPrivacyModal, setShowPrivacyModal] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);

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
      TEST: 'bg-surface/80 text-content border-border',
    };
    return colors[category] || 'bg-surface/80 text-content border-border';
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

      {/* Hero Section */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 md:mb-4 text-content">
              ElonMuskSucks.net
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-content mb-2 md:mb-3 font-semibold">
              The World's Most Accurate Musk Weather Report
            </p>
            <p className="text-sm sm:text-base md:text-lg text-content/80 mb-6 md:mb-8">
              Forecast: Erratic with a chance of chaos
            </p>

            {/* Inline Stats */}
            <div className="flex justify-center gap-3 md:gap-4 mb-6 md:mb-8 flex-wrap">
              <div className="bg-surface border-2 border-border rounded-lg px-4 py-2.5 md:px-5 md:py-3 shadow-md">
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {openPredictions.length}
                </div>
                <div className="text-xs md:text-sm text-content/80 font-medium">Markets</div>
              </div>
              <div className="bg-surface border-2 border-border rounded-lg px-4 py-2.5 md:px-5 md:py-3 shadow-md">
                <div className="text-xl md:text-2xl font-bold text-success">{leaders.length}</div>
                <div className="text-xs md:text-sm text-content/80 font-medium">Predictors</div>
              </div>
              <div className="bg-surface border-2 border-border rounded-lg px-4 py-2.5 md:px-5 md:py-3 shadow-md">
                <div className="text-xl md:text-2xl font-bold text-warning">{totalBets}</div>
                <div className="text-xs md:text-sm text-content/80 font-medium">Bets</div>
              </div>
              <div className="bg-surface border-2 border-border rounded-lg px-4 py-2.5 md:px-5 md:py-3 shadow-md">
                <div className="text-xl md:text-2xl font-bold text-secondary">
                  {formatMuskBucks(totalVolume)}
                </div>
                <div className="text-xs md:text-sm text-content/80 font-medium">MuskBucks</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex justify-center gap-3 md:gap-4 flex-wrap">
              <a
                href={`${clientAppUrl}/register`}
                className="px-6 py-3 md:px-8 md:py-4 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-xl text-base md:text-lg font-bold hover-lift shadow-lg transition-all"
              >
                🚀 Start Predicting
              </a>
              <a
                href={`${clientAppUrl}/login`}
                className="px-6 py-3 md:px-8 md:py-4 bg-surface border-2 border-border hover:border-primary text-content rounded-xl text-base md:text-lg font-bold hover-lift shadow-lg transition-all"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Ticker - Full Width Edge-to-Edge */}
      <div className="border-y border-border bg-surface/80 backdrop-blur-sm overflow-hidden py-2 md:py-3">
        <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3">
          <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm font-bold whitespace-nowrap flex-shrink-0">
            <span className="text-sm md:text-base">⚡</span>
            <span>Live</span>
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-success rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-hidden -mx-2">
            <div className="flex gap-3 md:gap-4 lg:gap-5 ticker-scroll">
              {activities.slice(0, 30).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs lg:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm md:text-base lg:text-lg">{activity.icon}</span>
                  <span className="font-semibold text-primary">{activity.userName}</span>
                  <span className="text-content/90">{activity.description}</span>
                  {activity.amount && (
                    <span className="text-success">({formatMuskBucks(activity.amount)}MB)</span>
                  )}
                  <span className="text-content/80 text-[8px] md:text-[10px] lg:text-xs">
                    • {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {activities.slice(0, 30).map((activity) => (
                <div
                  key={`dup-${activity.id}`}
                  className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs lg:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <span className="text-sm md:text-base lg:text-lg">{activity.icon}</span>
                  <span className="font-semibold text-primary">{activity.userName}</span>
                  <span className="text-content/90">{activity.description}</span>
                  {activity.amount && (
                    <span className="text-success">({formatMuskBucks(activity.amount)}MB)</span>
                  )}
                  <span className="text-content/80 text-[8px] md:text-[10px] lg:text-xs">
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
          {/* Tab Navigation - Outside content section, centered */}
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="inline-flex flex-wrap justify-center gap-2 md:gap-3 bg-surface border border-border rounded-xl p-1.5 md:p-2 shadow-md max-w-full">
              <button
                onClick={() => {
                  setContentTab('predictions');
                  setShowAllPredictions(false);
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 whitespace-nowrap ${
                  contentTab === 'predictions'
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'text-content hover:text-primary hover:bg-surface/80'
                }`}
              >
                <span className="text-base sm:text-lg md:text-xl">🔥</span>
                <span>Predictions</span>
                <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                  ({openPredictions.length})
                </span>
              </button>
              <button
                onClick={() => {
                  setContentTab('articles');
                  setShowAllArticles(false);
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 whitespace-nowrap ${
                  contentTab === 'articles'
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'text-content hover:text-primary hover:bg-surface/80'
                }`}
              >
                <span className="text-base sm:text-lg md:text-xl">📰</span>
                <span>Articles</span>
                <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                  ({articles.length})
                </span>
              </button>
              <button
                onClick={() => {
                  setContentTab('community');
                  setShowAllPosts(false);
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 whitespace-nowrap ${
                  contentTab === 'community'
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'text-content hover:text-primary hover:bg-surface/80'
                }`}
              >
                <span className="text-base sm:text-lg md:text-xl">💬</span>
                <span>Community</span>
                <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                  ({posts.length})
                </span>
              </button>
            </div>
          </div>

          {/* Tabbed Content Section */}
          <div className="p-2 md:p-6">
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
                        <div
                          key={prediction.id}
                          className="relative bg-surface border border-muted rounded-2xl p-5 shadow hover:shadow-md hover:border-muted/60 transition-all duration-200"
                        >
                          {/* Status Badge */}
                          <div className="absolute top-4 right-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium text-surface flex items-center gap-1 ${status.type === 'resolved' ? 'bg-accent' : status.type === 'expired' ? 'bg-error' : status.type === 'ending-soon' ? 'bg-warning' : status.type === 'info' ? 'bg-info' : 'bg-success'}`}
                            >
                              <span>{status.icon}</span>
                              <span>{status.text}</span>
                            </span>
                          </div>

                          {/* Title */}
                          <div className="pr-12 sm:pr-20 mb-3 sm:mb-4">
                            <h3 className="font-semibold text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight text-content">
                              {prediction.title}
                            </h3>
                          </div>

                          {/* Metadata Row: Category/Creator | Stats */}
                          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-4 pb-4 border-b border-border">
                            {/* Left: Category & Creator */}
                            <div className="flex gap-3 md:gap-4 items-center flex-wrap">
                              {prediction.category && (
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                                  {prediction.category.icon && (
                                    <span className="text-base">{prediction.category.icon}</span>
                                  )}
                                  <span>{prediction.category.name}</span>
                                </span>
                              )}

                              {/* Creator Info */}
                              {prediction.creator && (
                                <div className="flex items-center gap-2">
                                  {prediction.creator.avatarUrl && (
                                    <img
                                      src={prediction.creator.avatarUrl}
                                      alt={prediction.creator.name}
                                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                                    />
                                  )}
                                  <span className="text-content/70 text-sm">
                                    by{' '}
                                    <span className="text-content font-medium">
                                      {prediction.creator.name}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right: Stats */}
                            <div className="flex items-center gap-4 md:gap-5 text-content/70">
                              <span className="flex items-center gap-1.5">
                                <span className="text-lg">💰</span>
                                <span className="text-sm font-medium">
                                  {formatMuskBucks(getTotalVolume(prediction))}
                                </span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-lg">📊</span>
                                <span className="text-sm font-medium">
                                  {prediction.bets.length}
                                </span>
                              </span>
                              {!prediction.resolvedAt && (
                                <span className="flex items-center gap-1.5">
                                  <span className="text-lg">⏰</span>
                                  <span className="text-sm font-medium">
                                    {getTimeRemaining(prediction.expiresAt)}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time remaining */}
                          {!prediction.resolvedAt && (
                            <div
                              className={`text-sm font-medium flex items-center gap-2 mb-4 ${
                                now > expires
                                  ? 'text-error'
                                  : hoursLeft <= 2
                                    ? 'text-warning'
                                    : hoursLeft <= 24
                                      ? 'text-info'
                                      : 'text-success'
                              }`}
                            >
                              <span>{status.icon}</span>
                              {now > expires
                                ? `Expired ${new Date(prediction.expiresAt).toLocaleString()}`
                                : hoursLeft <= 24
                                  ? `${hoursLeft}h remaining`
                                  : `Expires ${new Date(prediction.expiresAt).toLocaleString()}`}
                            </div>
                          )}

                          {/* Description */}
                          {prediction.description && (
                            <div className="mb-5">
                              <h4 className="text-content font-semibold text-sm sm:text-base mb-3 uppercase tracking-wide">
                                Terms of Prediction
                              </h4>
                              <p className="text-content/90 text-base sm:text-lg leading-relaxed">
                                {prediction.description}
                              </p>
                            </div>
                          )}

                          {/* Source Links */}
                          {prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
                            <div className="mb-5 pb-5 border-b border-border">
                              <h4 className="text-content font-semibold text-sm sm:text-base mb-3 uppercase tracking-wide flex items-center gap-2">
                                <span className="text-lg sm:text-xl">📰</span>
                                <span>Sources</span>
                              </h4>
                              <div className="space-y-2">
                                {prediction.sourceLinks.map((link) => (
                                  <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-surface/50 hover:bg-surface border border-border hover:border-primary/50 transition-all group"
                                  >
                                    <span className="text-xl flex-shrink-0 mt-0.5">📄</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-content font-medium text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2">
                                        {link.title || 'Source Article'}
                                      </div>
                                      {link.description && (
                                        <div className="text-content/70 text-xs sm:text-sm mt-1">
                                          {link.description}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-primary text-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      →
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Betting Options */}
                          <div className="mb-4">
                            <h4 className="text-content font-semibold text-sm sm:text-base mb-3 uppercase tracking-wide">
                              Prediction Options
                            </h4>
                            <div className="space-y-2">
                              {prediction.options.map((option) => (
                                <div
                                  key={option.id}
                                  className="bg-surface border border-border hover:border-primary rounded-lg p-3 sm:p-4 text-left transition-all hover:scale-[1.02] hover:shadow-md flex items-center justify-between group cursor-pointer"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium text-content group-hover:text-primary transition-colors text-base sm:text-lg">
                                      {option.label}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-primary font-bold text-lg sm:text-xl">
                                      {formatOdds(option.odds)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Recent Bets */}
                          {prediction.bets.length > 0 && (
                            <div className="mt-2 flex items-center justify-between text-xs text-tertiary">
                              <span>
                                Latest:{' '}
                                {prediction.bets[prediction.bets.length - 1]?.userName ||
                                  'Anonymous'}
                              </span>
                              <span className="flex items-center gap-1">
                                {prediction.bets.length} total bets
                              </span>
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
                    <div
                      key={article.id}
                      className="bg-surface border border-muted rounded-2xl p-5 shadow hover:shadow-md hover:border-muted/60 transition-all duration-200"
                    >
                      {/* Lead Image */}
                      {article.content.imageUrl && (
                        <div className="aspect-video w-full overflow-hidden rounded-lg mb-4">
                          <img
                            src={article.content.imageUrl}
                            alt={article.content.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-sm sm:text-base text-tertiary mb-3">
                        {article.content.author || article.content.source} •{' '}
                        {getRelativeTime(article.timestamp || article.createdAt)}
                        {article.content.source &&
                          article.content.author &&
                          ` • ${article.content.source}`}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-content hover:text-primary transition-colors mb-3 leading-tight">
                        {article.content.title}
                      </h3>

                      {/* Excerpt */}
                      {article.content.excerpt && (
                        <p className="text-content/80 text-sm sm:text-base md:text-lg line-clamp-2 leading-relaxed mb-3">
                          {article.content.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {article.tags.slice(0, 4).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-surface/70 border border-border text-content/70 text-xs sm:text-sm rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 4 && (
                            <span className="px-2 py-1 bg-surface/70 border border-border text-content/70 text-xs sm:text-sm rounded-full">
                              +{article.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Engagement & Action */}
                      <div className="flex items-center justify-between text-sm sm:text-base">
                        <div className="flex items-center space-x-4">
                          {/* Reactions */}
                          <button className="flex items-center space-x-1.5 text-tertiary hover:text-primary transition-colors hover:bg-surface/50 px-2 py-1 rounded-lg cursor-pointer">
                            <span className="text-lg sm:text-xl">👍</span>
                            <span className="font-medium">{article.engagement.reactions}</span>
                          </button>

                          {/* Comments */}
                          <button className="flex items-center space-x-1.5 text-tertiary hover:text-primary transition-colors hover:bg-surface/50 px-2 py-1 rounded-lg cursor-pointer">
                            <span className="text-lg sm:text-xl">💬</span>
                            <span className="font-medium">{article.engagement.comments}</span>
                          </button>
                        </div>

                        <a
                          href={article.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 sm:px-4 sm:py-2.5 bg-primary hover:bg-primary-hover text-surface text-sm sm:text-base font-medium rounded-lg transition-all duration-200 hover:scale-105 whitespace-nowrap"
                        >
                          Read Article →
                        </a>
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
                      <div
                        key={post.id}
                        className="bg-surface border border-muted rounded-2xl p-5 shadow hover:shadow-md hover:border-muted/60 transition-all duration-200"
                      >
                        {/* Author Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-3">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={authorName}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/30 transition-all flex-shrink-0">
                                {authorName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold text-base sm:text-lg text-content hover:text-primary transition-colors">
                                  {authorName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm sm:text-base text-tertiary">
                                <span>{getRelativeTime(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-4">
                          <p className="text-content leading-relaxed line-clamp-3 text-sm sm:text-base md:text-lg">
                            {post.body}
                          </p>
                        </div>

                        {/* Media Grid */}
                        {post.mediaUrls && post.mediaUrls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {post.mediaUrls.slice(0, 2).map((url, index) => (
                              <div key={index} className="overflow-hidden rounded-lg">
                                <img
                                  src={url}
                                  alt=""
                                  className="object-cover w-full h-32 sm:h-40 hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Engagement & Action */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-5 text-sm sm:text-base">
                            {/* Reactions */}
                            <button className="flex items-center space-x-1.5 hover:text-primary transition-colors text-tertiary hover:bg-surface/50 px-2 py-1 rounded-lg">
                              <span className="text-lg sm:text-xl">❤️</span>
                              <span className="font-medium">{reactionsCount}</span>
                            </button>

                            {/* Comments */}
                            <button className="flex items-center space-x-1.5 hover:text-primary transition-colors text-tertiary hover:bg-surface/50 px-2 py-1 rounded-lg">
                              <span className="text-lg sm:text-xl">💬</span>
                              <span className="font-medium">{commentsCount}</span>
                            </button>
                          </div>

                          <a
                            href={`${clientAppUrl}/login`}
                            className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-all duration-200 bg-secondary hover:bg-secondary/90 text-content hover:scale-105"
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

          {/* LEADERBOARD SECTION */}
          {/* Leaderboard Header */}
          <div className="text-center mt-32 md:mt-40 lg:mt-48 mb-6 md:mb-8 pt-12 md:pt-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-content">
              🏆 Leaderboards
            </h2>
          </div>

          {/* Leaderboard Tab Navigation */}
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="inline-flex gap-2 md:gap-3 bg-surface border border-border rounded-xl p-1.5 md:p-2 shadow-md">
              <button
                onClick={() => {
                  setLeaderboardTab('market');
                  setShowAllMarketLeaders(false);
                }}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 whitespace-nowrap ${
                  leaderboardTab === 'market'
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'text-content hover:text-primary hover:bg-surface/80'
                }`}
              >
                <span className="text-base sm:text-lg md:text-xl">🏆</span>
                <span>Market</span>
              </button>
              <button
                onClick={() => {
                  setLeaderboardTab('pong');
                  setShowAllPongLeaders(false);
                }}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base md:text-lg rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 whitespace-nowrap ${
                  leaderboardTab === 'pong'
                    ? 'bg-primary text-surface shadow-lg scale-105'
                    : 'text-content hover:text-primary hover:bg-surface/80'
                }`}
              >
                <span className="text-base sm:text-lg md:text-xl">🏓</span>
                <span>Pong</span>
              </button>
            </div>
          </div>

          {/* Leaderboard Content */}
          <div className="p-2 md:p-6">
            {leaderboardTab === 'market' ? (
              <div>
                <ul className="space-y-2 md:space-y-3">
                  {leaders
                    .slice(0, showAllMarketLeaders ? leaders.length : 10)
                    .map((entry, index) => {
                      const rank = index + 1;
                      const getRankBg = () => {
                        if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
                        if (rank === 2) return 'bg-gray-400/10 border-gray-400/30';
                        if (rank === 3) return 'bg-amber-600/10 border-amber-600/30';
                        return 'bg-background border-border';
                      };
                      const getRankTextColor = () => {
                        if (rank === 1) return 'text-yellow-400';
                        if (rank === 2) return 'text-gray-300';
                        if (rank === 3) return 'text-amber-600';
                        return 'text-primary';
                      };

                      return (
                        <li
                          key={entry.userId}
                          className={`rounded-lg md:rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary hover:scale-[1.02] hover:z-10 border-2 ${getRankBg()} p-3 md:p-6 cursor-pointer`}
                        >
                          <div className="flex items-center gap-2 md:gap-6">
                            {/* Rank & Avatar */}
                            <div className="flex items-center gap-2 md:gap-3">
                              {/* Rank */}
                              <div className="w-8 h-8 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                                <span
                                  className={`text-lg md:text-3xl font-bold ${getRankTextColor()}`}
                                >
                                  {getRankIcon(rank)}
                                </span>
                              </div>

                              {/* Avatar */}
                              {entry.avatarUrl ? (
                                <img
                                  src={entry.avatarUrl}
                                  alt={entry.userName}
                                  className={`w-8 h-8 md:w-14 md:h-14 rounded-full object-cover border-2 flex-shrink-0 ${rank <= 3 ? 'border-current' : 'border-border'}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-xs md:text-lg border-2 flex-shrink-0 ${rank <= 3 ? 'border-current bg-surface' : 'bg-surface/70 border-border'} ${getRankTextColor()}`}
                                >
                                  {entry.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Name & Stats */}
                            <div className="flex-1 min-w-0">
                              {/* Name */}
                              <div className="font-bold text-fluid-base md:text-fluid-xl text-content mb-2 md:mb-3 truncate">
                                {entry.userName}
                              </div>

                              {/* Stats Grid */}
                              <div className="grid grid-cols-4 gap-1.5 md:gap-4">
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Profit
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-primary truncate">
                                    +{formatMuskBucks(entry.profitAll)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Win Rate
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-content">
                                    {Math.round(entry.winRate * 100)}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Bets
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-base text-content">
                                    {entry.totalBets}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    ROI
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-success">
                                    {Math.round((entry.roi || 0) * 100)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>

                {/* Show More Button */}
                {leaders.length > 10 && (
                  <button
                    onClick={() => setShowAllMarketLeaders(!showAllMarketLeaders)}
                    className="see-more-btn mt-3"
                  >
                    {showAllMarketLeaders ? '▲ Show Less' : `▼ Show ${leaders.length - 10} More`}
                  </button>
                )}
              </div>
            ) : pongLeaders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🏓</div>
                <h3 className="text-fluid-xl font-bold text-content mb-2">
                  No Pong Champions Yet!
                </h3>
                <p className="text-fluid-sm text-content/80">
                  Be the first to dominate the Pong leaderboard.
                </p>
              </div>
            ) : (
              <div>
                <ul className="space-y-2 md:space-y-3">
                  {pongLeaders
                    .slice(0, showAllPongLeaders ? pongLeaders.length : 10)
                    .map((entry) => {
                      const rank = entry.rank || 0;
                      const getRankBg = () => {
                        if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
                        if (rank === 2) return 'bg-gray-400/10 border-gray-400/30';
                        if (rank === 3) return 'bg-amber-600/10 border-amber-600/30';
                        return 'bg-background border-border';
                      };
                      const getRankTextColor = () => {
                        if (rank === 1) return 'text-yellow-400';
                        if (rank === 2) return 'text-gray-300';
                        if (rank === 3) return 'text-amber-600';
                        return 'text-primary';
                      };

                      return (
                        <li
                          key={entry.userId}
                          className={`rounded-lg md:rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary hover:scale-[1.02] hover:z-10 border-2 ${getRankBg()} p-3 md:p-6 cursor-pointer`}
                        >
                          <div className="flex items-center gap-2 md:gap-6">
                            {/* Rank & Avatar */}
                            <div className="flex items-center gap-2 md:gap-3">
                              {/* Rank */}
                              <div className="w-8 h-8 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                                <span
                                  className={`text-lg md:text-3xl font-bold ${getRankTextColor()}`}
                                >
                                  {getRankIcon(rank)}
                                </span>
                              </div>

                              {/* Avatar */}
                              {entry.avatarUrl ? (
                                <img
                                  src={entry.avatarUrl}
                                  alt={entry.userName}
                                  className={`w-8 h-8 md:w-14 md:h-14 rounded-full object-cover border-2 flex-shrink-0 ${rank <= 3 ? 'border-current' : 'border-border'}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-xs md:text-lg border-2 flex-shrink-0 ${rank <= 3 ? 'border-current bg-surface' : 'bg-surface/70 border-border'} ${getRankTextColor()}`}
                                >
                                  {entry.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Name & Stats */}
                            <div className="flex-1 min-w-0">
                              {/* Name */}
                              <div className="font-bold text-fluid-base md:text-fluid-xl text-content mb-2 md:mb-3 truncate">
                                {entry.userName}
                              </div>

                              {/* Stats Grid */}
                              <div className="grid grid-cols-4 gap-1.5 md:gap-4">
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    ELO
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-primary">
                                    {entry.eloRating}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Wins
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-content">
                                    {entry.wins || 0}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Streak
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-base text-content">
                                    {entry.winStreak || 0}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluid-2xs text-content/80 uppercase font-medium mb-0.5 md:mb-1 truncate">
                                    Total Won
                                  </div>
                                  <div className="font-bold text-fluid-xs md:text-fluid-lg text-success truncate">
                                    {formatMuskBucks(entry.totalWon || 0)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>

                {/* Show More Button */}
                {pongLeaders.length > 10 && (
                  <button
                    onClick={() => setShowAllPongLeaders(!showAllPongLeaders)}
                    className="see-more-btn mt-3"
                  >
                    {showAllPongLeaders ? '▲ Show Less' : `▼ Show ${pongLeaders.length - 10} More`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* About This Site Section */}
        <div className="p-6 md:p-8 lg:p-10 mt-16 md:mt-20 lg:mt-24">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6 md:mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 text-content">
                What Is This Madness?
              </h2>
              <p className="text-fluid-base md:text-fluid-lg text-content/80 max-w-3xl mx-auto leading-relaxed">
                A satirical prediction market where you can bet completely worthless{' '}
                <span className="font-bold text-primary">MuskBucks</span> on the daily chaos of
                billionaire antics. Because tracking Elon's moves is cheaper than therapy.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Prediction Markets */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">🎯</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  Prediction Markets
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  Bet on whether Tesla stock will moon or crash, if SpaceX will blow something up,
                  or what unhinged thing happens next. We use real events but fake money—the best
                  combination.
                </p>
              </div>

              {/* MuskBucks */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">💰</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  MuskBucks Currency
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  Our proprietary virtual currency with{' '}
                  <span className="font-bold">absolutely zero real-world value</span>. Perfect for
                  gambling without the guilt! Start with 10,000 and watch your fortune rise or fall
                  based on your terrible decisions.
                </p>
              </div>

              {/* Pong */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">🏓</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  Real-time Pong
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  Why have a prediction market without retro gaming? Challenge other users to
                  multiplayer Pong with actual stakes (that are still completely fake). Climb the
                  ELO leaderboard and become a Pong legend.
                </p>
              </div>

              {/* Leaderboards */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">🏆</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  Competitive Leaderboards
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  Track the top predictors and Pong champions. Flex your imaginary wealth, show off
                  your win rate, and prove you're better at predicting chaos than everyone else.
                  Fame without fortune!
                </p>
              </div>

              {/* Timeline */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">📰</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  Live News Timeline
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  RSS feeds aggregating the latest Tesla crashes (literal and stock-wise), SpaceX
                  explosions, and whatever fresh hell is brewing. Stay informed about the chaos
                  you're betting on.
                </p>
              </div>

              {/* Achievements */}
              <div className="preview-card p-5 md:p-6 hover-lift">
                <div className="text-4xl md:text-5xl mb-3">🎖️</div>
                <h3 className="text-fluid-lg md:text-fluid-xl font-bold mb-2 text-content">
                  100+ Achievements
                </h3>
                <p className="text-fluid-sm text-content/80 leading-relaxed">
                  Unlock badges for making predictions, winning bets, going broke, dominating Pong,
                  and more. Because we have too much time on our hands and so do you. Gotta catch
                  'em all!
                </p>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-8 md:mt-12">
              <p className="text-fluid-base text-content/70 mb-4">
                Ready to waste time productively?
              </p>
              <a
                href={`${clientAppUrl}/register`}
                className="inline-block px-6 py-3 md:px-8 md:py-4 bg-gradient-primary text-white dark:text-background rounded-xl text-base md:text-lg font-bold hover-lift shadow-lg transition-all"
              >
                🚀 Join the Chaos
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 mt-4">
        <div className="container mx-auto px-3 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2">
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-fluid-xs md:text-fluid-sm text-content/80 hover:text-primary transition-colors underline"
            >
              Privacy Policy
            </button>
            <span className="hidden md:inline text-content/70">•</span>
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-fluid-xs md:text-fluid-sm text-content/80 hover:text-primary transition-colors underline"
            >
              Terms of Service
            </button>
          </div>
          <p className="text-fluid-2xs md:text-fluid-xs text-content/70 text-center">
            © 2025 ElonMuskSucks.net
          </p>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto text-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <section>
                <h3 className="text-lg font-semibold mb-2">About This Site</h3>
                <p className="text-content/85">
                  ElonMuskSucks.net is a satirical prediction market platform making fun of Elon
                  Musk and other billionaires. We take your privacy seriously despite our
                  tongue-in-cheek approach to everything else.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">1. What We Collect</h3>
                <p className="text-content/85 mb-2">
                  We collect only what's necessary to run the site:
                </p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>Account information (name, email address, password)</li>
                  <li>Profile data (bio, location, avatar - all optional)</li>
                  <li>Platform activity (predictions, bets, game scores, chat messages)</li>
                  <li>Technical data (IP address, device info for security purposes)</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. How We Use Your Data</h3>
                <p className="text-content/85 mb-2">
                  Your information is used exclusively for site functionality:
                </p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>Providing core features (authentication, leaderboards, predictions)</li>
                  <li>Maintaining game integrity and preventing abuse</li>
                  <li>Technical support and bug fixes</li>
                  <li>Detecting and preventing illegal activity</li>
                </ul>
                <p className="text-content/85 mt-2 font-semibold">
                  We do NOT use your data for advertising, marketing, or any other commercial
                  purposes.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. We Never Share Your Data</h3>
                <p className="text-content/85 mb-2">
                  <strong>Period.</strong> We do not sell, trade, rent, or share your personal
                  information with third parties. Ever.
                </p>
                <p className="text-content/85 mb-2">The only exceptions are:</p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>When required by law (court orders, legal investigations)</li>
                  <li>To report illegal activity to authorities</li>
                  <li>To ban users engaged in illegal behavior</li>
                </ul>
                <p className="text-content/85 mt-2">
                  That's it. No data brokers, no advertisers, no shady third parties.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Cookies</h3>
                <p className="text-content/85">
                  We use exactly two types of cookies, both essential for site functionality:
                </p>
                <ul className="list-disc list-inside text-content/85 ml-4 mt-2 space-y-1">
                  <li>
                    <strong>Session Token:</strong> HTTP-only cookie for authentication (can't be
                    accessed by JavaScript)
                  </li>
                  <li>
                    <strong>Refresh Token:</strong> Standard cookie to keep you logged in
                  </li>
                </ul>
                <p className="text-content/85 mt-2">
                  No tracking cookies. No analytics cookies. No advertising cookies. Just the bare
                  minimum to keep you authenticated.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Data Security</h3>
                <p className="text-content/85">
                  We implement industry-standard security measures including password hashing,
                  encrypted connections, and secure database storage. While no system is 100%
                  secure, we do everything reasonable to protect your data.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Your Rights</h3>
                <p className="text-content/85 mb-2">You have the right to:</p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>Access your personal information</li>
                  <li>Update or correct your data</li>
                  <li>Request account deletion</li>
                  <li>Export your data</li>
                </ul>
                <p className="text-content/85 mt-2">
                  Contact us through the platform to exercise these rights.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">7. Age Restriction</h3>
                <p className="text-content/85">
                  <strong>You must be 18 years or older to use this site.</strong> We do not
                  knowingly collect information from anyone under 18. If you're a parent and
                  discover your child has created an account, contact us immediately and we'll
                  delete it.
                </p>
                <p className="text-content/85 mt-2">
                  Age verification is the responsibility of users and parents. We are not liable for
                  minors who misrepresent their age.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">8. Data Retention</h3>
                <p className="text-content/85">
                  We keep your data for as long as your account is active. If you delete your
                  account, we'll remove your personal information (though we may retain anonymized
                  data for platform statistics).
                </p>
                <p className="text-content/85 mt-2">
                  Exception: If you've been banned for illegal activity, we'll retain your IP
                  address, device information, and relevant logs indefinitely for security purposes.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">9. Changes to This Policy</h3>
                <p className="text-content/85">
                  We may update this Privacy Policy. Changes will be posted on this page with an
                  updated date. Continued use of the site after changes constitutes acceptance.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">10. Questions?</h3>
                <p className="text-content/85">
                  Contact us through the platform if you have questions about this Privacy Policy.
                </p>
              </section>

              <p className="text-content/70 text-xs mt-6 pt-4 border-t border-border">
                Last updated: October 2024
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto text-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Terms of Service</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <section>
                <h3 className="text-lg font-semibold mb-2">About This Site</h3>
                <p className="text-content/85">
                  ElonMuskSucks.net is a <strong>satirical</strong> prediction market platform
                  poking fun at Elon Musk and other billionaires. This is entertainment, not
                  financial advice. By using this site, you acknowledge you understand this is all
                  in good fun (mostly).
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
                <p className="text-content/85">
                  By accessing elonmusksucks.net, you agree to these terms. If you don't agree,
                  please close this tab and go touch some grass.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Age Requirement</h3>
                <p className="text-content/85">
                  <strong>You must be 18 years or older to use this site.</strong> Period. No
                  exceptions. Age verification is your responsibility (and your parents' if you're a
                  rebellious minor). We are not liable if you lie about your age.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. Virtual Currency (MuskBucks)</h3>
                <p className="text-content/85">
                  MuskBucks have <strong>ZERO</strong> real-world monetary value. You cannot
                  exchange them for actual money. They're imaginary internet points for
                  entertainment purposes only. Don't quit your day job.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Account Responsibility</h3>
                <p className="text-content/85">
                  You're responsible for your account security. Don't share your password. Don't use
                  "password123." Use a password manager like a responsible adult. Any activity under
                  your account is your responsibility.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Market Manipulation & Gaming</h3>
                <p className="text-content/85 mb-2">
                  Here's the deal: You <em>can</em> try to manipulate prediction markets or game the
                  system. Go ahead, be creative. <strong>However</strong>, if you get caught:
                </p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>First offense: Temporary ban (duration at our discretion)</li>
                  <li>Repeat offense: Permanent ban</li>
                  <li>Your username gets immortalized on the Wall of Shame for everyone to mock</li>
                  <li>All your MuskBucks go poof (because they were never real anyway)</li>
                </ul>
                <p className="text-content/85 mt-2">
                  Play stupid games, win stupid prizes. We're watching. 👀
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Prohibited Activities</h3>
                <p className="text-content/85 mb-2">You agree NOT to:</p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>Do anything illegal (this should be obvious, but here we are)</li>
                  <li>Harass, threaten, or abuse other users</li>
                  <li>Post content that violates laws or others' rights</li>
                  <li>Create multiple accounts to circumvent bans or limitations</li>
                  <li>Use bots or automated tools without permission</li>
                  <li>Attempt to hack, DDoS, or otherwise attack our infrastructure</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">7. Infrastructure Attacks</h3>
                <p className="text-content/85 mb-2">
                  If you attempt malicious attacks on our servers, databases, or infrastructure:
                </p>
                <ul className="list-disc list-inside text-content/85 ml-4 space-y-1">
                  <li>We will permanently ban you</li>
                  <li>We will save your IP address, device fingerprint, and location data</li>
                  <li>We will report you to relevant authorities if warranted</li>
                  <li>We may show up at your house (just kidding... or are we? 🏠)</li>
                </ul>
                <p className="text-content/85 mt-2">
                  Don't be that person. We have logs. Lots of logs.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">8. Content Guidelines</h3>
                <p className="text-content/85">
                  Keep it civil. Satire and mockery of billionaires is encouraged, but harassment of
                  other users is not. We reserve the right to remove content and ban users who
                  violate community standards. Use your brain.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">9. Disclaimer</h3>
                <p className="text-content/85">
                  This site is provided "as is" with no warranties. We make no guarantees about
                  uptime, accuracy, or anything else. Use at your own risk. We're not responsible
                  for your poor betting decisions.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">10. Liability Limitation</h3>
                <p className="text-content/85">
                  We are not liable for any damages arising from your use of this site. This
                  includes but is not limited to: hurt feelings from losing fake internet money,
                  FOMO from missing out on predictions, or rage-quitting after losing at Pong.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">11. Changes to Terms</h3>
                <p className="text-content/85">
                  We can update these terms whenever we want. Continued use of the site means you
                  accept the new terms. Check back occasionally if you care about this stuff.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">12. Questions?</h3>
                <p className="text-content/85">
                  Contact us through the platform if you have questions about these Terms of
                  Service.
                </p>
              </section>

              <p className="text-content/70 text-xs mt-6 pt-4 border-t border-border">
                Last updated: October 2024
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
