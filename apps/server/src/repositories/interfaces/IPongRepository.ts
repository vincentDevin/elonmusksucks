// apps/server/src/repositories/IPongRepository.ts

import type {
  PrismaPongDifficulty,
  PrismaPongMatchStatus,
  DbPongEloHistoryEntry,
  DbPrismaTransaction,
} from '@ems/types';

export interface PongStatsData {
  id?: number;
  userId: number;
  eloRating: number;
  peakElo: number;
  eloHistory?: DbPongEloHistoryEntry[];
  tier: string;
  lastEloChange: number;
  totalEloGained: number;
  totalEloLost: number;
  highestWagerWin: bigint;
  riskTaker: boolean;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  totalWagered: bigint;
  totalWon: bigint;
  totalLost: bigint;
  biggestWin: bigint;
  biggestLoss: bigint;
  avgPing: number;
  avgGameDuration: number;
  perfectGames: number;
  comebacks: number;
  aiWins: number;
  aiLosses: number;
  hardestAiBeaten?: PrismaPongDifficulty;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PongMatchData {
  id: string;
  playerOneId: number;
  playerTwoId?: number;
  winnerId?: number;
  wagerAmount: bigint;
  aiDifficulty?: PrismaPongDifficulty;
  playerOneScore: number;
  playerTwoScore: number;
  status: PrismaPongMatchStatus;
  startedAt?: Date;
  completedAt?: Date;
  gameDuration?: number;
  playerOnePing: number;
  playerTwoPing: number;
  player1EloStart?: number;
  player2EloStart?: number;
  player1EloEnd?: number;
  player2EloEnd?: number;
  eloChange?: number;
  skillComponent?: number;
  economyComponent?: number;
  // Canonical fields
  mode?: string;
  rated?: boolean;
  hostUserId?: number;
  joinerUserId?: number;
  aiUserId?: number;
  hostDisplayName?: string;
  joinerDisplayName?: string;
  aiDisplayName?: string;
}

export interface PongStatsWithUser extends PongStatsData {
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
}

export interface PongMatchWithPlayers extends PongMatchData {
  playerOne: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  playerTwo?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  winner?: {
    id: number;
    name: string;
  };
}

export interface IPongRepository {
  // PongStats operations
  findStatsByUserId(userId: number): Promise<PongStatsData | null>;
  createStats(data: Partial<PongStatsData>): Promise<PongStatsData>;
  updateStats(userId: number, data: Partial<PongStatsData>): Promise<void>;
  upsertStats(userId: number, data: Partial<PongStatsData>): Promise<PongStatsData>;

  // PongMatch operations
  findMatchById(matchId: string): Promise<PongMatchData | null>;
  createMatch(data: PongMatchData): Promise<PongMatchData>;
  updateMatch(matchId: string, data: Partial<PongMatchData>): Promise<void>;
  setMatchActive(
    matchId: string,
    hostUserId: number,
    joinerUserId?: number,
    aiUserId?: number,
  ): Promise<void>;

  // Leaderboard operations
  getEloLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;
  getWinsLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;
  getWagerLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;
  getWinStreakLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;
  getTotalWonLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;
  getPerfectGamesLeaderboard(limit: number, offset: number): Promise<PongStatsWithUser[]>;

  // Statistics operations
  getTierDistribution(): Promise<{ [tier: string]: number }>;
  getPlayerMatchHistory(userId: number, limit: number): Promise<PongMatchWithPlayers[]>;
  getRecentMatches(userId: number, limit: number): Promise<PongMatchData[]>;

  // User operations
  findUserBalance(userId: number): Promise<{ muskBucks: bigint } | null>;
  updateUserBalance(userId: number, amount: bigint): Promise<{ muskBucks: bigint }>;
  createTransaction(
    userId: number,
    type: 'CREDIT' | 'DEBIT',
    amount: bigint,
    balanceAfter: bigint,
  ): Promise<void>;

  // Complex match operations
  recordCompleteMatch(
    matchData: PongMatchData,
    winnerStatsData?: Partial<PongStatsData>,
    loserStatsData?: Partial<PongStatsData>,
  ): Promise<{ isLossOnly: boolean; winnerId?: number; loserId?: number }>;

  // Utility operations
  executeInTransaction<T>(callback: (tx: DbPrismaTransaction) => Promise<T>): Promise<T>;
}
