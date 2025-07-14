// apps/server/src/handlers/redisChatEventHandlers.ts

import { Server } from 'socket.io';

type ChatRedisChannel =
  | 'chat:newMessage'
  | 'chat:typing'
  | 'chat:stopTyping'
  | 'chat:userJoined'
  | 'chat:userLeft'
  | 'chat:usersOnline';

export function registerRedisChatHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: ChatRedisChannel, message: string) => {
    let payload: any;
    try {
      payload = JSON.parse(message);
    } catch (e) {
      console.error(`[chat] Failed to parse message for channel "${channel}":`, message);
      return;
    }

    // Only ever emit to the global room for now (easy to change for per-room in future)
    io.to('global').emit(channel, payload);
  });

  // Subscribe to *all* chat channels (including usersOnline for user counts)
  const channels: ChatRedisChannel[] = [
    'chat:newMessage',
    'chat:typing',
    'chat:stopTyping',
    'chat:userJoined',
    'chat:userLeft',
    'chat:usersOnline',
  ];

  for (const ch of channels) {
    eventSub.subscribe(ch);
  }
}
