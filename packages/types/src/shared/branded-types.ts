/**
 * Branded Types for Type Safety
 *
 * Branded types provide compile-time type safety for primitive values
 * with zero runtime cost
 */

// ============================================================================
// Branded Primitives
// ============================================================================

declare const UserIdBrand: unique symbol;
export type UserId = number & { readonly [UserIdBrand]: true };

declare const PredictionIdBrand: unique symbol;
export type PredictionId = number & { readonly [PredictionIdBrand]: true };

declare const IdempotencyKeyBrand: unique symbol;
/**
 * Idempotency Key - Branded string type for transaction deduplication
 *
 * Used to prevent duplicate processing of financial transactions (bets, payouts, transfers).
 * Format: `{entity}:{id}:{timestamp}` or `{entity}|{id}|{context}`
 *
 * Examples:
 * - `bet:123:1640000000000` - Bet placement
 * - `payout:456:1640000000001` - Payout processing
 * - `match:abc|player:123|result` - Match result processing
 */
export type IdempotencyKey = string & { readonly [IdempotencyKeyBrand]: true };

export type ISODateString = string & { readonly __isoDateBrand: true };
export type TimestampMs = number & { readonly __timestampMsBrand: true };

// ============================================================================
// Helper Functions (zero runtime cost)
// ============================================================================

export const createUserId = (id: number): UserId => id as UserId;
export const createPredictionId = (id: number): PredictionId => id as PredictionId;
export const createIdempotencyKey = (key: string): IdempotencyKey => key as IdempotencyKey;
export const createISODateString = (date: string): ISODateString => date as ISODateString;
export const createTimestampMs = (ms: number): TimestampMs => ms as TimestampMs;
