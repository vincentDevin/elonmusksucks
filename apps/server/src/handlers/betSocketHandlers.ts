// apps/server/src/handlers/betSocketHandlers.ts
// -----------------------------------------------------------------------------
// Handles *both* single-bet and parlay commands.
// -----------------------------------------------------------------------------

import { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import {
  SOCKET_EVENTS,
  type BetPlaceRequest,
  type BetPlaceAck,
  type ParlayPlaceRequest,
  type ParlayPlaceAck,
  type BetErrorCode,
} from '@ems/types';
import { bettingService } from '../services/betting.service';
import { betRateLimiter, createRateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { betOperationQueue } from '../lib/BackpressureQueue';
import { metricsCollector } from '../lib/metrics';
import { tracingCollector } from '../lib/tracing';
import { checkPayloadSize } from '../middleware/payloadSizeGuard';
import { ACKConfigs } from '../lib/ackPolicy';

export function registerBetHandlers(socket: Socket) {
  const auth = socket as AuthenticatedSocket;

  /* ───────────── bet:place ───────────── */
  socket.on(
    SOCKET_EVENTS.BET_PLACE,
    async (p: BetPlaceRequest, ack?: (response: BetPlaceAck) => void) => {
      const ackConfig = ACKConfigs[SOCKET_EVENTS.BET_PLACE];
      await tracingCollector.trace(
        'bet_place_handler',
        async () => {
          await metricsCollector.timeHandler('bet_place', async () => {
            try {
              if (!auth.user) return ack?.('NOT_AUTHENTICATED');

              // Check payload size (64KB hard limit)
              const sizeCheck = checkPayloadSize(p);
              if (sizeCheck.exceedsHard) {
                console.error(`[bet] Payload too large: ${sizeCheck.size} bytes`);
                return ack?.('PAYLOAD_TOO_LARGE');
              }

              // Apply rate limiting
              const rateLimitCheck = createRateLimitMiddleware(
                betRateLimiter,
                SOCKET_EVENTS.BET_PLACE,
              );
              await new Promise<void>((resolve, reject) => {
                rateLimitCheck(auth.user!.id, (error?: string) => {
                  if (error) reject(new Error(error));
                  else resolve();
                });
              });

              if (!p || typeof p.optionId !== 'number' || p.amount <= 0)
                return ack?.('INVALID_PAYLOAD');

              // Queue heavy betting operation to prevent system overload
              await betOperationQueue.enqueue(async () => {
                return bettingService.placeBet(auth.user!.id, p.optionId, p.amount);
              }, 2); // High priority for single bets

              // Acknowledge success with ACK policy compliance
              console.log(
                `[ack-policy] ${SOCKET_EVENTS.BET_PLACE} responding within ${ackConfig.timeoutMs}ms window`,
              );
              return ack?.(null);
            } catch (e: any) {
              console.error('[bet] place error', e);
              console.error(
                `[ack-policy] ${SOCKET_EVENTS.BET_PLACE} failed, client should retry within policy`,
              );
              return ack?.(mapBetError(e));
              throw e; // Re-throw for metrics error tracking
            }
          });
        },
        { userId: auth.user?.id, optionId: p?.optionId, amount: p?.amount },
      );
    },
  );

  /* ───────────── parlay:place ─────────── */
  socket.on(
    SOCKET_EVENTS.PARLAY_PLACE,
    async (p: ParlayPlaceRequest, ack?: (response: ParlayPlaceAck) => void) => {
      try {
        if (!auth.user) return ack?.('NOT_AUTHENTICATED');

        // Check payload size (64KB hard limit)
        const sizeCheck = checkPayloadSize(p);
        if (sizeCheck.exceedsHard) {
          console.error(`[parlay] Payload too large: ${sizeCheck.size} bytes`);
          return ack?.('PAYLOAD_TOO_LARGE');
        }

        // Apply rate limiting
        const rateLimitCheck = createRateLimitMiddleware(
          betRateLimiter,
          SOCKET_EVENTS.PARLAY_PLACE,
        );
        await new Promise<void>((resolve, reject) => {
          rateLimitCheck(auth.user!.id, (error?: string) => {
            if (error) reject(new Error(error));
            else resolve();
          });
        });

        if (
          !p ||
          !Array.isArray(p.legs) ||
          p.legs.length === 0 ||
          p.amount <= 0 ||
          p.legs.some((l) => typeof l.optionId !== 'number')
        )
          return ack?.('INVALID_PAYLOAD');

        // Queue heavy parlay operation (lower priority than single bets)
        await betOperationQueue.enqueue(async () => {
          return bettingService.placeParlay(auth.user!.id, p.legs, p.amount);
        }, 1); // Medium priority for parlays

        return ack?.(null);
      } catch (e: any) {
        console.error('[parlay] place error', e);
        return ack?.(mapBetError(e));
      }
    },
  );
}

/* Map service-level errors to simple string codes */
function mapBetError(err: any): BetErrorCode {
  const message = err?.message || '';

  // Handle backpressure queue errors
  if (message.includes('Queue full')) {
    return 'SYSTEM_OVERLOADED';
  }
  if (message.includes('Operation timeout')) {
    return 'OPERATION_TIMEOUT';
  }

  // Handle rate limiting errors
  if (message.startsWith('RATE_LIMIT_EXCEEDED:')) {
    return message; // Pass through with wait time
  }

  switch (message) {
    case 'OPTION_NOT_FOUND':
    case 'PREDICTION_CLOSED':
    case 'INSUFFICIENT_FUNDS':
      return message;
    default:
      return 'BET_FAILED';
  }
}
