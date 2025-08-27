import type { UserPongStatsView, PongMatchHistoryView, PongLeaderboardView } from '@ems/types';

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
export const toPongMatchHistoryView = (match: {
  id: number;
  playerOneId: number;
  playerTwoId: number | null;
  playerOneScore: number;
  playerTwoScore: number;
  playerWon: boolean;
  wagerAmount: bigint;
  payoutAmount: bigint;
  eloChange: number;
  duration: number;
  aiDifficulty?: string;
  opponentName: string | null;
  opponentElo: number | null;
  playedAt: Date;
}): PongMatchHistoryView => ({
  id: match.id,
  playerOneId: match.playerOneId,
  playerTwoId: match.playerTwoId,
  playerOneScore: match.playerOneScore,
  playerTwoScore: match.playerTwoScore,
  playerWon: match.playerWon,
  wagerAmount: match.wagerAmount.toString(),
  payoutAmount: match.payoutAmount.toString(),
  eloChange: match.eloChange,
  duration: match.duration,
  aiDifficulty: match.aiDifficulty,
  opponentName: match.opponentName,
  opponentElo: match.opponentElo,
  playedAt: match.playedAt.toISOString(),
});

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
