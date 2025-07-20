// apps/server/src/handlers/redisChatEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for chat domain. Maps present‑tense Redis channel
// names to camelCase Socket.IO broadcasts. All broadcasts go to the
// `global` room for now.
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';

export type ChatRedisChannel =
  | 'chat:message'
  | 'chat:typing'
  | 'chat:stopTyping'
  | 'chat:join'
  | 'chat:leave'
  | 'chat:usersOnline';

const CHANNEL_TO_BROADCAST: Record<ChatRedisChannel, string> = {
  'chat:message': 'chatMessage',
  'chat:typing': 'chatTyping',
  'chat:stopTyping': 'chatStopTyping',
  'chat:join': 'chatUserJoined',
  'chat:leave': 'chatUserLeft',
  'chat:usersOnline': 'chatUsersOnline',
};

export function registerRedisChatHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: ChatRedisChannel, message: string) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      console.error(`[chat] Failed to parse payload for ${channel}`);
      return;
    }

    const broadcast = CHANNEL_TO_BROADCAST[channel];
    if (!broadcast) {
      console.warn('[chat] Unhandled channel:', channel);
      return;
    }

    io.to('global').emit(broadcast, payload);
  });

  // Subscribe to all chat channels we care about
  const channels: ChatRedisChannel[] = [
    'chat:message',
    'chat:typing',
    'chat:stopTyping',
    'chat:join',
    'chat:leave',
    'chat:usersOnline',
  ];

  for (const ch of channels) eventSub.subscribe(ch);
}
