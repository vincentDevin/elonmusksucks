import type {
  UserPongStatsView,
  PongMatchHistoryView,
  PongLeaderboardView,
  PongTierDistributionView,
} from '@ems/types';

/**
 * Maps pong stats data to standardized UserPongStatsView DTO
 * Handles BigInt → string conversion for amounts and Date → ISO string
 */
export const toUserPongStatsView = (stats: {
  userId: number;
  user?: { name: string };
  eloRating: number;
  tier: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  bestStreak: number;
  perfectGames: number;
  comebacks: number;
  totalWagered: bigint;
  totalWon: bigint;
  profit: bigint;
  biggestWin: bigint;
  averagePing: number;
  createdAt: Date;
  updatedAt: Date;
}): UserPongStatsView => ({
  userId: stats.userId,
  userName: stats.user?.name || 'Unknown Player',
  eloRating: stats.eloRating,
  tier: stats.tier,
  gamesPlayed: stats.gamesPlayed,
  wins: stats.wins,
  losses: stats.losses,
  winRate: stats.winRate,
  winStreak: stats.winStreak,
  bestStreak: stats.bestStreak,
  perfectGames: stats.perfectGames,
  comebacks: stats.comebacks,
  totalWagered: stats.totalWagered.toString(),
  totalWon: stats.totalWon.toString(),
  profit: stats.profit.toString(),
  biggestWin: stats.biggestWin.toString(),
  averagePing: stats.averagePing,
  createdAt: stats.createdAt.toISOString(),
  updatedAt: stats.updatedAt.toISOString(),
});

/**
 * Maps pong match history data to standardized PongMatchHistoryView DTO
 * Handles BigInt → string conversion for amounts and Date → ISO string
 */
export const toPongMatchHistoryView = (match: any): PongMatchHistoryView => {
  // Build opponent object based on available data
  let opponent = null;

  if (match.opponent) {
    opponent = {
      id: match.opponent.id,
      name: match.opponent.name,
      avatarUrl: match.opponent.avatarUrl || null,
    };
  } else if (match.isAiMatch) {
    // For AI matches, create a synthetic opponent object
    opponent = {
      id: match.playerTwoId || -1, // Use the AI ID
      name: match.aiDifficulty ? `AI (${match.aiDifficulty})` : 'Elon AI',
      avatarUrl: null,
    };
  }

  return {
    id: match.id,
    playerOneId: match.playerOneId,
    playerTwoId: match.playerTwoId,
    playerOneScore: match.playerOneScore,
    playerTwoScore: match.playerTwoScore,
    currentUserScore: match.currentUserScore || match.playerOneScore,
    opponentScore: match.opponentScore || match.playerTwoScore,
    currentUserName: match.currentUserName || 'Unknown Player',
    opponentName: match.opponentName || opponent?.name || 'Unknown Player',
    playerWon: match.playerWon,
    wagerAmount: (match.wagerAmount ?? 0n).toString(),
    payoutAmount: (match.payoutAmount ?? 0n).toString(),
    eloChange: match.eloChange || 0,
    duration: match.duration || 0,
    aiDifficulty: match.aiDifficulty || undefined,
    opponent,
    isAiMatch: match.isAiMatch || false,
    completedAt: (match.completedAt || match.createdAt || new Date()).toISOString(),
    skillComponent: match.skillComponent,
    economyComponent: match.economyComponent,
  };
};

/**
 * Maps pong leaderboard data to standardized PongLeaderboardView DTO
 * Handles BigInt → string conversion for amounts
 */
export const toPongLeaderboardView = (
  entry: {
    userId: number;
    user?: { name: string };
    eloRating: number;
    tier: string;
    gamesPlayed?: number;
    wins?: number;
    winRate: number;
    totalWon?: bigint;
    rank?: number;
  },
  rank: number,
): PongLeaderboardView => ({
  userId: entry.userId,
  userName: entry.user?.name || 'Unknown Player',
  eloRating: entry.eloRating,
  tier: entry.tier,
  gamesPlayed: entry.gamesPlayed || 0,
  wins: entry.wins || 0,
  winRate: entry.winRate,
  totalWon: entry.totalWon ? entry.totalWon.toString() : '0',
  rank: rank,
});

/**
 * Maps tier distribution data to standardized PongTierDistributionView DTO
 * Calculates total players from tier counts
 */
export const toPongTierDistributionView = (
  tiers: Record<string, number>,
): PongTierDistributionView => {
  const totalPlayers = Object.values(tiers).reduce((sum, count) => sum + count, 0);
  return {
    tiers,
    totalPlayers,
  };
};
