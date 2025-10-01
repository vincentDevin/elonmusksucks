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
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
// Prisma Transaction Type
// ============================================================================

export type DbPrismaTransaction = {
  $executeRaw: (...args: unknown[]) => Promise<number>;
  $queryRaw: (...args: unknown[]) => Promise<unknown>;
  [key: string]: unknown;
};
