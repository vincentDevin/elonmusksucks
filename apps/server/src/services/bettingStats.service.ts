import type { IUserRepository } from '../repositories/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';

export class BettingStatsService {
  constructor(private userRepo: IUserRepository = new UserRepository()) {}

  async getUserTotalBets(userId: number): Promise<number> {
    return this.userRepo.getUserTotalBetsCount(userId);
  }

  async getCategoryWins(userId: number, category: string): Promise<number> {
    return this.userRepo.getUserCategoryWinsCount(userId, category);
  }

  async getUserParlayWins(userId: number): Promise<number> {
    return this.userRepo.getUserParlayWinsCount(userId);
  }

  async getUserPredictionCount(userId: number): Promise<number> {
    const predictions = await this.userRepo.getUserPredictions(userId);
    return predictions.length;
  }
}

export const bettingStatsService = new BettingStatsService();
