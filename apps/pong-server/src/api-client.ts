import axios from 'axios';
import { MatchResult } from '@ems/types';

export class PongApiClient {
  private baseUrl: string;
  private gameServerSecret: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api/pong';
    this.gameServerSecret = process.env.GAME_SERVER_SECRET || 'pong-internal-secret-2024';
  }

  private async request<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    try {
      const response = await axios({
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
    } catch (error: any) {
      console.error(`API request failed: ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  async authenticateUser(
    token: string,
  ): Promise<{ id: number; name: string; muskBucks: number } | null> {
    try {
      console.log(`🔐 Authenticating user via API: ${this.baseUrl}/auth`);
      console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);

      const result = await this.request<{ id: number; name: string; muskBucks: number }>(
        '/auth',
        'POST',
        { token },
      );
      console.log(`✅ API auth successful:`, result);
      return result;
    } catch (error: any) {
      console.error(`❌ API auth failed:`, error.response?.data || error.message);
      return null;
    }
  }

  async validateWager(playerId: number, amount: number): Promise<boolean> {
    try {
      const result = await this.request<{ valid: boolean }>('/validate-wager', 'POST', {
        userId: playerId,
        amount,
      });
      return result.valid;
    } catch (error) {
      return false;
    }
  }

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
    isAI: boolean,
  ): Promise<{ success: boolean; transactionId: string } | null> {
    try {
      return await this.request<{ success: boolean; transactionId: string }>(
        '/process-wager',
        'POST',
        {
          playerOneId,
          playerTwoId,
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
      await this.request('/record-match', 'POST', {
        matchId: result.matchId,
        winnerId: result.winnerId,
        loserId: result.playerOneId === result.winnerId ? result.playerTwoId : result.playerOneId,
        wagerAmount: result.wagerAmount,
        payoutAmount: result.payoutAmount,
        duration: result.duration,
        isAI: result.playerTwoId === null,
      });
    } catch (error) {
      console.error('Failed to record match result:', error);
    }
  }
}
