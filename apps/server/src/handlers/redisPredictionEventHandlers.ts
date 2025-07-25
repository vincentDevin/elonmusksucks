// apps/server/src/handlers/redisPredictionEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for *prediction‑market* domain.  Converts the
// present‑tense Redis channels (prediction:create, bet:placed, …) into the
// camel‑cased Socket.IO events that the front‑end already listens for:
//   • predictionCreated
//   • predictionResolved
//   • betPlaced
//   • parlayPlaced
// All broadcasts still go to the global room for now.
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';

export type PredictionRedisChannel =
  | 'prediction:create'
  | 'prediction:resolve'
  | 'bet:placed'
  | 'parlay:placed';

const CHANNEL_TO_BROADCAST: Record<PredictionRedisChannel, string> = {
  'prediction:create':  'predictionCreated',
  'prediction:resolve': 'predictionResolved',
  'bet:placed':         'betPlaced',
  'parlay:placed':      'parlayPlaced',
};

export function registerRedisPredictionHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: PredictionRedisChannel, message: string) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      console.error(`[prediction] Failed to parse payload for ${channel}`);
      return;
    }

    // quick runtime guard in dev – avoids entire server crash if channel mapping mismatches
    switch (channel) {
      case 'prediction:create':
      case 'prediction:resolve':
        // Expecting a full PredictionDTO
        break;
      case 'bet:placed':
        // Expecting BetWithUserDTO
        break;
      case 'parlay:placed':
        // Expecting ParlayLegWithUserDTO
        break;
      default:
        console.warn('[prediction] Unhandled channel:', channel);
        return;
    }

    const broadcast = CHANNEL_TO_BROADCAST[channel];
    io.to('global').emit(broadcast, payload);
  });

  // Subscribe to all channels in one go
  const channels: PredictionRedisChannel[] = [
    'prediction:create',
    'prediction:resolve',
    'bet:placed',
    'parlay:placed',
  ];

  for (const ch of channels) eventSub.subscribe(ch);
}
