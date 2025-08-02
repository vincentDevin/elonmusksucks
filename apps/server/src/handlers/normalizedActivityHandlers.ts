// apps/server/src/handlers/normalizedActivityHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket handlers for the new normalized activity event system
// -----------------------------------------------------------------------------

import { Socket, Server } from 'socket.io';
import { normalizedActivityService } from '../services/normalizedActivity.service';
import type { NormalizedActivityEvent } from '@ems/types';

/**
 * Register normalized activity ticker handlers on individual socket connections
 */
export function registerNormalizedActivityHandlers(socket: Socket) {
  socket.on('activity:ticker:normalized', async (limit?: number) => {
    try {
      const items: NormalizedActivityEvent[] = await normalizedActivityService.getRecentEvents(
        typeof limit === 'number' ? limit : 20,
      );
      socket.emit('activity:ticker:normalized', items);
    } catch (err) {
      console.error('[normalized-activity] ticker fetch failed:', err);
      socket.emit('activity:ticker:normalized', []);
    }
  });
}

/**
 * Register Redis subscription handlers for normalized activity events
 */
export function registerNormalizedActivityRedisHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: string, message: string) => {
    if (channel !== 'activity:newsflash:normalized') return;

    let payload: NormalizedActivityEvent;
    try {
      payload = JSON.parse(message);
    } catch {
      console.error('[normalized-activity] Failed to parse payload');
      return;
    }

    // Broadcast to all connected clients
    io.emit('activityNewsflash:normalized', payload);
  });
}
