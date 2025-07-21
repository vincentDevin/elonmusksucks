import redisClient from '../lib/redis';
import type { UserActivity } from '@ems/types';

export class ActivityTickerService {
  private readonly TICKER_LIST = 'activity:ticker';

  constructor(private redis = redisClient) {}

  async getTicker(limit = 20): Promise<UserActivity[]> {
    const items = await this.redis.lrange(this.TICKER_LIST, 0, limit - 1);
    return items.map((i) => JSON.parse(i) as UserActivity);
  }
}

export const activityTickerService = new ActivityTickerService();
