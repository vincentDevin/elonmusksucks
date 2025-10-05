// apps/server/src/repositories/IPongRepository.ts

import type {
  DbPrismaTransaction,
  PongStatsData,
  PongMatchData,
  PongMatchUpdateData,
  PongStatsWithUser,
  PongMatchWithPlayers,
} from '@ems/types';

export interface IPongRepository {
  // PongStats operations
  findStatsByUserId(userId: number): Promise<PongStatsData | null>;
  createStats(data: Partial<PongStatsData>): Promise<PongStatsData>;
  updateStats(userId: number, data: Partial<PongStatsData>): Promise<void>;
  upsertStats(userId: number, data: Partial<PongStatsData>): Promise<PongStatsData>;

  // PongMatch operations
  findMatchById(matchId: string): Promise<PongMatchData | null>;
  createMatch(data: PongMatchData): Promise<PongMatchData>;
  updateMatch(matchId: string, data: PongMatchUpdateData): Promise<void>;
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

  // Payout operations
  processPVPPayout(
    matchId: string,
    winnerId: number,
    loserId: number | null,
    payoutAmount: bigint,
    houseRake: bigint,
    idempotencyKey: string,
  ): Promise<{
    matchId: string;
    winnerId: number;
    payout: string;
    houseRake: string;
    netPayout: string;
    loserLoss?: string;
    vsAI: boolean;
    timestamp: Date;
  }>;

  processPVEPayout(
    matchId: string,
    winnerId: number,
    payoutAmount: bigint,
    houseRake: bigint,
    idempotencyKey: string,
  ): Promise<{
    matchId: string;
    winnerId: number;
    payout: string;
    houseRake: string;
    netPayout: string;
    vsAI: boolean;
    timestamp: Date;
  }>;

  findExistingPayout(
    matchId: string,
    idempotencyKey: string,
  ): Promise<{
    matchId: string;
    winnerId: number;
    payout: string;
    houseRake: string;
    netPayout: string;
    vsAI: boolean;
    timestamp: Date;
  } | null>;

  // Utility operations
  executeInTransaction<T>(callback: (tx: DbPrismaTransaction) => Promise<T>): Promise<T>;

  // AI player operations
  getAIPlayerById(
    userId: number,
  ): Promise<{ id: number; name: string; avatarUrl: string | null } | null>;
}
