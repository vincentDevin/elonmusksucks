/**
 * Socket.IO Event Payloads
 *
 * Payload interfaces for all socket events
 */

// ============================================================================
// Stats Update Payloads
// ============================================================================

export interface StatsUpdatePayload {
  userId: number;
  stats?: {
    totalBets?: number;
    winRate?: number;
    totalWinnings?: number;
    currentStreak?: number;
  };
  changes?: {
    winRate?: number;
    profit?: number;
    rank?: number;
    streak?: number;
    totalBets?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
  }>;
  timestamp?: string;
}

export interface RankingChangePayload {
  userId: number;
  oldRank: number;
  newRank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
}

// ============================================================================
// Timeline Update Payloads
// ============================================================================

export interface TimelineUpdatePayload {
  articleId: string;
  action: 'added' | 'updated' | 'removed';
  data?: {
    title?: string;
    url?: string;
    publishedAt?: string;
    feedName?: string;
  };
}

// ============================================================================
// Achievement Payloads
// ============================================================================

export interface AchievementUnlockedPayload {
  userId: number;
  achievement: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  progress: {
    previous: number;
    current: number;
    target: number;
  };
  timestamp: string;
}

export interface PongAchievementContext {
  matchId: string;
  winnerId: number;
  loserId?: number;
  vsAI: boolean;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  wager: number;
  winnerScore: number;
  loserScore: number;
  duration: number;
  eloChange?: number;
  newElo?: number;
  streak?: number;
}

// ============================================================================
// Pong Socket Event Payloads
// ============================================================================

export interface ClientEvents {
  auth: { token: string };
  join_lobby: {};
  create_match: { wager: number; type: import('../../shared/enums').MatchType; aiDifficulty?: string };
  join_match: { matchId: string };
  player_input: import('../../database/pong').PlayerInput;
  player_ready: { ready: boolean };
  leave_match: {};
  spectate_match: { gameId: string };
}

export interface ServerEvents {
  auth_result: { success: boolean; player?: import('../../database/pong').Player; error?: string };
  lobby_state: { lobbies: import('../../database/pong').LobbyEntry[] };
  active_games: { games: import('../../database/pong').ActiveGameEntry[] };
  stats_update: { playersOnline: number; activeGames: number; availableMatches: number };
  match_joined: {
    gameId: string;
    playerSlot: 0 | 1;
    opponent?: import('../../database/pong').Player;
    wager: number;
    pot: number;
  };
  match_waiting: { gameId: string; message: string };
  opponent_joined: { opponent: import('../../database/pong').Player };
  ready_state_update: { readyStates: [boolean, boolean] };
  countdown: { seconds: number; message?: string };
  spectator_joined: { gameId: string; spectatorCount: number };
  game_state: {
    ball: import('../../database/pong').Ball;
    opponentPaddleY?: number;
    player1PaddleY?: number;
    player2PaddleY?: number;
    scores: [number, number];
    tick: number;
    timestamp: number;
    wager?: number;
    pot?: number;
  };
  score_update: { scores: [number, number]; scorer: 0 | 1 };
  match_end: {
    winner: 0 | 1 | null;
    scores: [number, number];
    reason: string;
    duration: number;
    payout?: number;
  };
  player_disconnected: { playerSlot: 0 | 1; reconnectTime: number };
  error: { code: string; message: string };
}
