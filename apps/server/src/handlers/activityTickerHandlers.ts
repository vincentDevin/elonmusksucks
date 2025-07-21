import { Socket } from 'socket.io';
import { activityTickerService } from '../services/activityTicker.service';
import type { UserActivity } from '@ems/types';

export function registerActivityTickerHandlers(socket: Socket) {
  socket.on('activity:ticker', async (limit?: number) => {
    try {
      const items: UserActivity[] = await activityTickerService.getTicker(
        typeof limit === 'number' ? limit : 20,
      );
      socket.emit('activity:ticker', items);
    } catch (err) {
      console.error('[activity] ticker fetch failed:', err);
      socket.emit('activity:ticker', []);
    }
  });
}
