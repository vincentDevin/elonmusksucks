/**
 * Pong Response DTOs
 *
 * Response types for pong endpoints
 */

// ============================================================================
// Pong Stats View
// ============================================================================

export interface UserPongStatsView {
  userId: number;
  userName: string;
  eloRating: number;
  peakElo: number;
  tier: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  bestWinStreak: number;
  perfectGames: number;
  comebacks: number;
  totalWagered: string; // BigInt → string
  totalWon: string; // BigInt → string
  totalLost: string; // BigInt → string
  profit: string; // BigInt → string
  biggestWin: string; // BigInt → string
  biggestLoss: string; // BigInt → string
  avgPing: number;
  avgGameDuration: number; // Average game duration in seconds
  roi: number; // Return on investment percentage
  aiWins: number;
  aiLosses: number;
  hardestAiBeaten?: string;
  riskTaker: boolean;
  createdAt: string; // Date → ISO
  updatedAt: string; // Date → ISO
}

// ============================================================================
// Pong Match History View
// ============================================================================

export interface PongMatchHistoryView {
  id: string;
  playerOneId: number;
  playerTwoId: number | null;
  playerOneScore: number;
  playerTwoScore: number;
  currentUserScore: number; // Current user's score in context
  opponentScore: number; // Opponent's score in context
  currentUserName: string; // Current user's name
  opponentName: string; // Opponent's name
  playerWon: boolean;
  wagerAmount: string; // BigInt → string
  payoutAmount: string; // BigInt → string
  eloChange: number;
  duration: number;
  aiDifficulty?: string;
  opponent?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  } | null;
  isAiMatch: boolean;
  completedAt: string;
  skillComponent?: number;
  economyComponent?: number;
}

// ============================================================================
// Pong Leaderboard View
// ============================================================================

export interface PongLeaderboardView {
  userId: number;
  userName: string;
  avatarUrl?: string;
  eloRating: number;
  tier: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  winStreak?: number;
  bestStreak?: number;
  perfectGames?: number;
  comebacks?: number;
  totalWagered?: string; // BigInt → string
  totalWon: string; // BigInt → string
  profit?: string; // BigInt → string
  biggestWin?: string; // BigInt → string
  rank: number;
  riskTaker?: boolean; // Custom flag for high rollers
}

// ============================================================================
// Pong Tier Distribution View
// ============================================================================

export interface PongTierDistributionView {
  tiers: Record<string, number>;
  totalPlayers: number;
}
