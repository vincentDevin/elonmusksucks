// apps/pong-server/src/results.ts
// -----------------------------------------------------------------------------
// Pong Match Result Submission - Idempotent Processing
// -----------------------------------------------------------------------------

import type { MatchResultSubmission, IdempotencyKey } from '@ems/types';

// In-memory store for processed results (production would use Redis/DB)
const processedResults = new Map<IdempotencyKey, MatchResultSubmission>();

/**
 * Generate idempotency key for match result
 */
export function generateIdempotencyKey(matchId: string, userId: number): IdempotencyKey {
  return `${matchId}|${userId}`;
}

/**
 * Submit match result with idempotency protection
 * Returns true if processed, false if duplicate
 */
export function submitMatchResult(
  matchId: string,
  userId: number,
  score: number,
  won: boolean,
): boolean {
  const idempotencyKey = generateIdempotencyKey(matchId, userId);

  // Check if already processed
  if (processedResults.has(idempotencyKey)) {
    console.log(`[pong-results] Duplicate submission ignored: ${idempotencyKey}`);
    return false;
  }

  // Process new result
  const submission: MatchResultSubmission = {
    matchId,
    userId,
    score,
    won,
    idempotencyKey,
    submittedAt: new Date(),
  };

  processedResults.set(idempotencyKey, submission);
  console.log(
    `[pong-results] Match result processed: ${idempotencyKey}, score: ${score}, won: ${won}`,
  );
  return true;
}
