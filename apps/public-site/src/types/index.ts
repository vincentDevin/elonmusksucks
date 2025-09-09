// API Response Types
export interface MarketOverview {
  totalVolume: number;
  activeMarkets: number;
  totalUsers: number;
  volumeChange: number;
  trending: Array<{
    category: string;
    icon: string;
    growth: number;
  }>;
  cached?: boolean;
}

export interface TrendingPrediction {
  id: number;
  title: string;
  category: string;
  volume: number;
  betCount: number;
  expiresAt: string;
}

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  avatarUrl: string;
  balance: string;
  totalBets: number;
  winRate: number;
  profitAll: string;
  profitPeriod: string;
  roi: number;
  longestStreak: number;
  rank: number;
}

export interface RecentActivity {
  id: string;
  type: string; // 'post_created', 'comment_created', 'achievement_unlocked', 'parlay_started', etc.
  userId: number;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  icon: string;
  timestamp: string;
  amount?: number;
  odds?: number;
  isPersonal: boolean;
  isHighValue: boolean;
  priority: string;
}

export interface TimelineArticle {
  id: string;
  type: string;
  timestamp: string;
  content: {
    title: string;
    excerpt: string;
    url: string;
    imageUrl: string;
    author: string;
    source: string;
  };
  engagement: {
    reactions: number;
    comments: number;
  };
  tags: string[];
  sourceLinks: any[];
}

export interface TimelinePost {
  id: number;
  authorId: number;
  content: string;
  contentType: string;
  visibility: string;
  parentId: number | null;
  threadDepth: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: string;
  isDeleted: boolean;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatar: string;
  reactionCounts: {
    LIKE: number;
    LOVE: number;
    LAUGH: number;
    WOW: number;
    SAD: number;
    ANGRY: number;
  };
  canEdit: boolean;
  canDelete: boolean;
}

export interface PredictionOption {
  id: number;
  label: string;
  odds: number;
  predictionId: number;
  createdAt: string;
}

export interface PredictionBet {
  id: number;
  userId: number;
  userName: string;
  amount: string;
  potentialPayout: string;
  payout: string | null;
  status: string;
  createdAt: string;
}

export interface Prediction {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  type: string;
  threshold: number | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  creatorUserId: number;
  winningOptionId: number | null;
  options: PredictionOption[];
  bets: PredictionBet[];
  sourceLinks: any[];
}

// Server Data Interface
export interface ServerData {
  marketData: MarketOverview | null;
  trendingData: Prediction[] | null; // Changed to use Prediction[] since we get full prediction data
  leaderboardData: LeaderboardEntry[] | null;
  activityData: RecentActivity[] | null;
  articlesData: TimelineArticle[] | null;
  postsData: TimelinePost[] | null;
  predictionsData: Prediction[] | null;
  fullLeaderboardData: LeaderboardEntry[] | null;
  clientAppUrl: string;
  currentPath: string;
}

// Component Props
export interface LandingPageProps extends ServerData {}

export interface StatsDisplayProps {
  totalPredictions: number;
  activeUsers: number;
  muskBucksInCirculation: string;
  loading?: boolean;
  className?: string;
}

export interface TrendingPreviewProps {
  data: Prediction[] | null; // Changed to use Prediction[] since we pass full prediction data
  className?: string;
  clientAppUrl: string;
}

export interface LeaderboardPreviewProps {
  data: LeaderboardEntry[] | null;
  className?: string;
  clientAppUrl: string;
}

export interface ActivityPreviewProps {
  data: RecentActivity[] | null;
  className?: string;
  clientAppUrl: string;
}

export interface TimelinePreviewProps {
  articlesData: TimelineArticle[] | null;
  postsData: TimelinePost[] | null;
  className?: string;
  clientAppUrl: string;
}

// Window interface for client-side hydration
declare global {
  interface Window {
    __SERVER_DATA__: ServerData;
  }
}
