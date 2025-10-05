import axios, { AxiosError } from 'axios';
import { MatchResult } from '@ems/types';

// ============================================================================
// API Request/Response Types
// ============================================================================

interface AuthResponse {
  id: number;
  name: string;
  muskBucks: number;
}

interface ValidateWagerRequest {
  userId: number;
  amount: number;
}

interface ValidateWagerResponse {
  valid: boolean;
}

interface ProcessWagerRequest {
  playerOneId: number;
  playerTwoId: number | null;
  wagerAmount: number;
  isAI: boolean;
}

interface ProcessWagerResponse {
  success: boolean;
  transactionId: string;
}

interface RecordMatchRequest {
  matchId: string;
  winnerId: number | null;
  winnerName: string;
  winnerScore: number;
  loserId: number | null;
  loserName: string | null;
  loserScore: number;
  wagerAmount: number;
  payoutAmount: number;
  duration: number;
  isAI: boolean;
}

// ============================================================================
// Pong API Client
// ============================================================================

export class PongApiClient {
  private baseUrl: string;
  private gameServerSecret: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api/pong';
    this.gameServerSecret = process.env.GAME_SERVER_SECRET || 'pong-internal-secret-2024';
  }

  private async request<TResponse, TRequest = unknown>(
    endpoint: string,
    method: string = 'GET',
    data?: TRequest,
  ): Promise<TResponse> {
    try {
      const response = await axios<TResponse>({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'x-game-server-secret': this.gameServerSecret,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        `API request failed: ${endpoint}`,
        axiosError.response?.data || axiosError.message,
      );
      throw error;
    }
  }

  async authenticateUser(token: string): Promise<AuthResponse | null> {
    try {
      console.log(`🔐 Authenticating user via API: ${this.baseUrl}/auth`);
      console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);

      const response = await axios<AuthResponse>({
        method: 'POST',
        url: `${this.baseUrl}/auth`,
        headers: {
          'Content-Type': 'application/json',
          'x-game-server-secret': this.gameServerSecret,
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });

      console.log(`✅ API auth successful:`, response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`❌ API auth failed:`, axiosError.response?.data || axiosError.message);
      return null;
    }
  }

  async validateWager(playerId: number, amount: number): Promise<boolean> {
    try {
      const result = await this.request<ValidateWagerResponse, ValidateWagerRequest>(
        '/validate-wager',
        'POST',
        {
          userId: playerId,
          amount,
        },
      );
      return result.valid;
    } catch (error) {
      return false;
    }
  }

  async getUserById(userId: number): Promise<{ id: number; name: string } | null> {
    try {
      const result = await this.request<{ id: number; name: string }>(`/users/${userId}`);
      return result;
    } catch (error) {
      console.warn(`Failed to fetch user ${userId}`);
      return null;
    }
  }

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
    isAI: boolean,
  ): Promise<ProcessWagerResponse | null> {
    try {
      return await this.request<ProcessWagerResponse, ProcessWagerRequest>(
        '/process-wager',
        'POST',
        {
          playerOneId,
          playerTwoId, // Send the actual player ID (could be negative for AI)
          wagerAmount,
          isAI,
        },
      );
    } catch (error) {
      return null;
    }
  }

  async recordMatchResult(result: MatchResult): Promise<void> {
    try {
      const requestData: RecordMatchRequest = {
        matchId: result.matchId,
        winnerId: result.winnerId,
        winnerName: result.winnerName,
        winnerScore: result.winnerScore,
        loserId: result.loserId,
        loserName: result.loserName,
        loserScore: result.loserScore,
        wagerAmount: result.wagerAmount,
        payoutAmount: result.payoutAmount,
        duration: result.duration,
        isAI: result.isAI,
      };

      await this.request<void, RecordMatchRequest>('/record-match', 'POST', requestData);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to record match result:', axiosError.message);
    }
  }
}
