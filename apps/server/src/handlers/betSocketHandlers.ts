// apps/server/src/handlers/betSocketHandlers.ts
// -----------------------------------------------------------------------------
// Handles *both* single-bet and parlay commands.
// -----------------------------------------------------------------------------

import { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { bettingService } from '../services/betting.service';

type Ack = (err: string | null) => void;

export function registerBetHandlers(socket: Socket) {
  const auth = socket as AuthenticatedSocket;

  /* ───────────── bet:place ───────────── */
  socket.on('bet:place', async (p: { optionId: number; amount: number }, ack?: Ack) => {
    try {
      if (!auth.user) return ack?.('NOT_AUTHENTICATED');
      if (!p || typeof p.optionId !== 'number' || p.amount <= 0) return ack?.('INVALID_PAYLOAD');

      await bettingService.placeBet(auth.user.id, p.optionId, p.amount);
      return ack?.(null);
    } catch (e: any) {
      console.error('[bet] place error', e);
      return ack?.(mapBetError(e));
    }
  });

  /* ───────────── parlay:place ─────────── */
  socket.on(
    'parlay:place',
    async (p: { legs: { optionId: number }[]; amount: number }, ack?: Ack) => {
      try {
        if (!auth.user) return ack?.('NOT_AUTHENTICATED');
        if (
          !p ||
          !Array.isArray(p.legs) ||
          p.legs.length === 0 ||
          p.amount <= 0 ||
          p.legs.some((l) => typeof l.optionId !== 'number')
        )
          return ack?.('INVALID_PAYLOAD');

        await bettingService.placeParlay(auth.user.id, p.legs, p.amount);
        return ack?.(null);
      } catch (e: any) {
        console.error('[parlay] place error', e);
        return ack?.(mapBetError(e));
      }
    },
  );
}

/* Map service-level errors to simple string codes */
function mapBetError(err: any): string {
  switch (err?.message) {
    case 'OPTION_NOT_FOUND':
    case 'PREDICTION_CLOSED':
    case 'INSUFFICIENT_FUNDS':
      return err.message;
    default:
      return 'BET_FAILED';
  }
}
