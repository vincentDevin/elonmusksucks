import type { IUserRepository } from '../repositories/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';

export class SocialStatsService {
  constructor(private userRepo: IUserRepository = new UserRepository()) {}

  async getUserFollowingCount(userId: number): Promise<number> {
    return this.userRepo.getFollowingCount(userId);
  }

  async getUserFollowersCount(userId: number): Promise<number> {
    return this.userRepo.getFollowersCount(userId);
  }
}

export const socialStatsService = new SocialStatsService();
