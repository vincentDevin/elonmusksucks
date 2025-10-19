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

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-warning/10 border-l-2 border-warning';
      case 2:
        return 'bg-muted/10 border-l-2 border-muted';
      case 3:
        return 'bg-warning/5 border-l-2 border-warning/50';
      default:
        return '';
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

      {/* Ultra Dense Main Grid */}
      <div className="container mx-auto px-2 py-3">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {/* PREDICTIONS - 2 cols */}
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
              <div className="bg-surface border border-border rounded-lg p-3 h-full">
                <h2 className="text-sm font-bold mb-3 flex items-center">
                  <span className="mr-1.5 text-lg">🔥</span>Open Predictions
                </h2>
                <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
                  {openPredictions.slice(0, 8).map((prediction) => (
                    <div
                      key={prediction.id}
                      className="bg-background border border-border rounded p-3 text-[13px]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                          <div className="font-semibold leading-tight mb-1 line-clamp-1">
                            {prediction.title}
                          </div>
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryColor(prediction.category?.name || '')}`}
                            >
                              {prediction.category?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-tertiary">{prediction.type}</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-tertiary whitespace-nowrap ml-2">
                          <div className="mb-0.5">⏰ {getTimeRemaining(prediction.expiresAt)}</div>
                          <div className="mb-0.5">
                            💰 {formatMuskBucks(getTotalVolume(prediction))}
                          </div>
                          <div>👥 {prediction.bets.length}</div>
                        </div>
                      </div>
                      {/* Inline Options */}
                      <div className="flex gap-1.5 flex-wrap">
                        {prediction.options.map((option) => (
                          <div
                            key={option.id}
                            className="bg-muted/20 rounded px-2.5 py-1 text-[11px]"
                          >
                            <span className="font-medium">{option.label}</span>
                            <span className="text-primary font-bold ml-1.5">
                              {formatOdds(option.odds)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Recent bets inline */}
                      {prediction.bets.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border text-[10px] text-tertiary">
                          {prediction.bets.slice(0, 2).map((bet) => (
                            <span key={bet.id} className="mr-3">
                              {bet.userName} {bet.amount}MB
                            </span>
                          ))}
                          {prediction.bets.length > 2 && <span>+{prediction.bets.length - 2}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ARTICLES - 2 cols */}
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
              <div className="bg-surface border border-border rounded-lg p-3 h-full">
                <h2 className="text-sm font-bold mb-3 flex items-center">
                  <span className="mr-1.5 text-lg">📰</span>Articles
                </h2>
                <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
                  {articles.slice(0, 10).map((article: any) => (
                    <div
                      key={article.id}
                      className="bg-background border border-border rounded p-3 flex gap-3"
                    >
                      {article.content.imageUrl && (
                        <img
                          src={article.content.imageUrl}
                          alt=""
                          className="w-20 h-20 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1.5 mb-1 text-[10px]">
                          <span className="text-info bg-info/10 border border-info/20 px-2 py-0.5 rounded">
                            Article
                          </span>
                          <span className="text-tertiary truncate">{article.content.source}</span>
                        </div>
                        <h3 className="text-[13px] font-bold mb-1 line-clamp-2 leading-tight">
                          {article.content.title}
                        </h3>
                        <p className="text-[11px] text-tertiary mb-2 line-clamp-1">
                          {article.content.excerpt}
                        </p>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3 text-[10px] text-tertiary">
                            <span>👍 {article.engagement.reactions}</span>
                            <span>💬 {article.engagement.comments}</span>
                            <span>{getRelativeTime(article.timestamp || article.createdAt)}</span>
                          </div>
                          <a
                            href={article.content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-[10px] bg-primary text-white rounded font-medium"
                          >
                            Read
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COMMUNITY POSTS - 2 cols */}
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
              <div className="bg-surface border border-border rounded-lg p-3 h-full">
                <h2 className="text-sm font-bold mb-3 flex items-center">
                  <span className="mr-1.5 text-lg">💬</span>Community
                </h2>
                <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
                  {posts.slice(0, 10).map((post) => {
                    const avatarUrl = post.author?.avatarUrl || undefined;
                    const authorName = post.author?.name || 'Unknown';
                    const commentsCount = post.commentsCount || post.repliesCount || 0;
                    const reactionsCount = post.reactionsCount || 0;

                    return (
                      <div
                        key={post.id}
                        className="bg-background border border-border rounded p-3 flex gap-3"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={authorName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 text-sm">
                            {authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-1.5 mb-1 text-[10px] items-center">
                            <span className="text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                              Post
                            </span>
                            <span className="font-medium text-content truncate">{authorName}</span>
                            <span className="text-tertiary">{getRelativeTime(post.createdAt)}</span>
                          </div>
                          <p className="text-[12px] mb-2 line-clamp-3 leading-tight">{post.body}</p>
                          {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {post.mediaUrls.slice(0, 2).map((url, index) => (
                                <img
                                  key={index}
                                  src={url}
                                  alt=""
                                  className="rounded object-cover w-full h-24"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[10px] text-tertiary">
                            <div className="flex gap-3">
                              <span>❤️ {reactionsCount}</span>
                              <span>💬 {commentsCount}</span>
                            </div>
                            <a
                              href={`${clientAppUrl}/login`}
                              className="px-3 py-1 border border-border rounded text-content font-medium"
                            >
                              Join
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LEADERBOARD - 2 cols (Combined Market & Pong) */}
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
              <div className="bg-surface border border-border rounded-lg p-3 h-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold flex items-center">
                    <span className="mr-1.5 text-lg">
                      {leaderboardTab === 'market' ? '🏆' : '🏓'}
                    </span>
                    Leaderboard
                  </h2>
                  <div className="flex gap-1 bg-background border border-border rounded p-0.5">
                    <button
                      onClick={() => setLeaderboardTab('market')}
                      className={`px-3 py-1 text-[11px] rounded font-medium transition-colors ${
                        leaderboardTab === 'market'
                          ? 'bg-primary text-white'
                          : 'text-tertiary hover:text-content'
                      }`}
                    >
                      Market
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('pong')}
                      className={`px-3 py-1 text-[11px] rounded font-medium transition-colors ${
                        leaderboardTab === 'pong'
                          ? 'bg-primary text-white'
                          : 'text-tertiary hover:text-content'
                      }`}
                    >
                      Pong
                    </button>
                  </div>
                </div>

                <div className="max-h-[800px] overflow-y-auto custom-scrollbar">
                  {leaderboardTab === 'market' ? (
                    <table className="w-full text-[13px]">
                      <thead className="bg-muted/20 sticky top-0">
                        <tr className="text-[11px]">
                          <th className="px-2 py-2 text-left w-10">#</th>
                          <th className="px-2 py-2 text-left">Player</th>
                          <th className="px-2 py-2 text-right">Profit</th>
                          <th className="px-2 py-2 text-right hidden sm:table-cell">Win%</th>
                          <th className="px-2 py-2 text-right hidden md:table-cell">Bets</th>
                          <th className="px-2 py-2 text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaders.slice(0, 25).map((entry, index) => {
                          const rank = index + 1;
                          return (
                            <tr
                              key={entry.userId}
                              className={`border-b border-border/50 hover:bg-muted/10 ${getRankStyle(rank)}`}
                            >
                              <td className="px-2 py-2 font-bold text-[14px]">
                                {getRankIcon(rank)}
                              </td>
                              <td className="px-2 py-2 font-medium truncate max-w-[120px]">
                                {entry.userName}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-primary">
                                +{formatMuskBucks(entry.profitAll)}
                              </td>
                              <td className="px-2 py-2 text-right hidden sm:table-cell">
                                {Math.round(entry.winRate * 100)}%
                              </td>
                              <td className="px-2 py-2 text-right hidden md:table-cell">
                                {entry.totalBets}
                              </td>
                              <td className="px-2 py-2 text-right text-success">
                                {Math.round((entry.roi || 0) * 100)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : pongLeaders.length === 0 ? (
                    <div className="text-center py-8 text-[12px] text-tertiary">No rankings</div>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead className="bg-muted/20 sticky top-0">
                        <tr className="text-[11px]">
                          <th className="px-2 py-2 text-left w-10">#</th>
                          <th className="px-2 py-2 text-left">Player</th>
                          <th className="px-2 py-2 text-right">ELO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pongLeaders.slice(0, 20).map((entry) => {
                          const rank = entry.rank || 0;
                          return (
                            <tr
                              key={entry.userId}
                              className={`border-b border-border/50 hover:bg-muted/10 ${getRankStyle(rank)}`}
                            >
                              <td className="px-2 py-2 font-bold text-[14px]">
                                {getRankIcon(rank)}
                              </td>
                              <td className="px-2 py-2 font-medium truncate max-w-[120px]">
                                {entry.userName}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-primary">
                                {entry.eloRating}
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
          </div>

          {/* Compact Footer CTA */}
          <div className="mt-3 bg-surface border border-border rounded-lg p-4 text-center">
            <h2 className="text-base font-bold mb-1">Ready to Predict the Chaos?</h2>
            <p className="text-[10px] text-tertiary mb-2">Join thousands tracking Elon's moves</p>
            <a
              href={`${clientAppUrl}/register`}
              className="inline-block px-6 py-2 bg-gradient-primary text-white rounded font-semibold text-xs hover-lift"
            >
              🚀 Get Started Free
            </a>
          </div>
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
