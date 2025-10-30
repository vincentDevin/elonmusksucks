/**
 * Pong Database Types
 *
 * Types for Pong game-related models
 */

// ============================================================================
// Pong Game State Types
// ============================================================================

export interface Player {
  id: number;
  name: string;
  paddleY: number;
  score: number;
  ping: number;
  lastInputTime: number;
  elo: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface WagerNegotiation {
  currentOffer: number;
  proposedBy: 0 | 1; // Which player made current offer
  acceptedBy: Array<0 | 1>; // Who has accepted current offer (array for JSON serialization)
  history: Array<{
    amount: number;
    proposedBy: 0 | 1;
    timestamp: number;
  }>;
  roundCount: number; // Max 5 rounds
  lockedIn: boolean;
}

export interface GameChatMessage {
  userId: number;
  username: string;
  message: string;
  timestamp: number;
  isSystem: boolean;
  userRole: 'player1' | 'player2' | 'spectator';
}

export interface GameState {
  id: string;
  players: [Player, Player | null]; // Always exactly 2 slots
  ball: Ball;
  status: import('../shared/enums').GameStatus;
  tick: number;
  wager: number;
  isAI: boolean;
  aiDifficulty?: import('../shared/enums').AIDifficulty;
  aiState?: {
    targetY: number;
    lastReactionTime: number;
    errorBias: number; // Random bias for imperfect play
  };
  readyStates?: [boolean, boolean]; // Ready status for each player [player0, player1]
  startTime: number;
  // New fields for lobby negotiation and chat
  wagerNegotiation: WagerNegotiation | null;
  chatMessages: GameChatMessage[];
  lobbyCreatedAt: number;
  negotiationStartedAt: number | null;
  wagerChargedAt: number | null; // Track when wager was deducted
}

// ============================================================================
// Pong Lobby Types
// ============================================================================

export interface LobbyEntry {
  id: string;
  creatorId: number;
  creatorName: string;
  wager: number;
  type: import('../shared/enums').MatchType;
  status: import('../shared/enums').LobbyStatus;
  createdAt: number;
}

export interface ActiveGameEntry {
  id: string;
  player1Name: string;
  player2Name: string | null; // null for AI
  type: import('../shared/enums').MatchType;
  wager: number;
  pot: number;
  scores: [number, number];
  status: import('../shared/enums').GameStatus;
  spectatorCount: number;
  startedAt: number;
  canSpectate: boolean;
}

// ============================================================================
// Pong Input Types
// ============================================================================

export interface PlayerInput {
  up: boolean;
  down: boolean;
  paddleY: number; // Client's authoritative paddle position
  seq: number; // Sequence number for input ordering
  timestamp: number;
}

// ============================================================================
// Pong Match Result Types
// ============================================================================

export interface MatchResult {
  matchId: string;
  winnerId: number | null;
  winnerName: string;
  winnerScore: number;
  loserId: number | null;
  loserName: string | null;
  loserScore: number;
  duration: number;
  wagerAmount: number;
  payoutAmount: number;
  isAI: boolean;
  reason: 'completed' | 'forfeit' | 'disconnect' | 'error';
}

export interface PongMatchResult {
  matchId: string;
  winnerId: number;
  loserId?: number;
  winnerScore: number;
  loserScore: number;
  wagerAmount: bigint;
  payoutAmount: bigint;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  gameDuration?: number;
  winnerPing?: number;
  loserPing?: number;
}

// ============================================================================
// Pong ELO & Stats Types
// ============================================================================

export interface DbPongEloHistoryEntry {
  matchId: string;
  oldElo: number;
  newElo: number;
  eloChange: number;
  opponentElo: number;
  result: 'win' | 'loss';
  timestamp: Date;
}

export interface DbPongPlayerStats {
  userId: number;
  currentElo: number;
  peakElo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  totalWagered: bigint;
  totalWinnings: bigint;
  eloHistory: DbPongEloHistoryEntry[];
}

// ============================================================================
// Repository Layer Types
// ============================================================================

import type { PongDifficulty, PongMatchStatus } from '../prisma';

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
  hardestAiBeaten?: PongDifficulty | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PongMatchData {
  id: string;
  playerOneId: number;
  playerTwoId?: number | null;
  winnerId?: number | null;
  wagerAmount: bigint;
  aiDifficulty?: PongDifficulty | null;
  playerOneScore: number;
  playerTwoScore: number;
  status: PongMatchStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  gameDuration?: number | null;
  playerOnePing: number;
  playerTwoPing: number;
  player1EloStart?: number | null;
  player2EloStart?: number | null;
  player1EloEnd?: number | null;
  player2EloEnd?: number | null;
  eloChange?: number | null;
  skillComponent?: number | null;
  economyComponent?: number | null;
  // Canonical fields
  mode?: string | null;
  rated?: boolean | null;
  hostUserId?: number | null;
  joinerUserId?: number | null;
  aiUserId?: number | null;
  hostDisplayName?: string | null;
  joinerDisplayName?: string | null;
  aiDisplayName?: string | null;
}

export interface PongMatchUpdateData {
  playerTwoId?: number;
  winnerId?: number;
  aiDifficulty?: PongDifficulty;
  playerOneScore?: number;
  playerTwoScore?: number;
  status?: PongMatchStatus;
  startedAt?: Date;
  completedAt?: Date;
  gameDuration?: number;
  playerOnePing?: number;
  playerTwoPing?: number;
  player1EloStart?: number;
  player2EloStart?: number;
  player1EloEnd?: number;
  player2EloEnd?: number;
  eloChange?: number;
  skillComponent?: number;
  economyComponent?: number;
  mode?: string;
  rated?: boolean;
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

// ============================================================================
// Prisma Transaction Type
// ============================================================================

export type DbPrismaTransaction = {
  $executeRaw: (...args: unknown[]) => Promise<number>;
  $queryRaw: (...args: unknown[]) => Promise<unknown>;
  [key: string]: unknown;
};
