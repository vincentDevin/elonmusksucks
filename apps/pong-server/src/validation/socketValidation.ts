// apps/pong-server/src/validation/socketValidation.ts
// ══════════════════════════════════════════════════════════════════════════════
// Socket Event Input Validation
// ══════════════════════════════════════════════════════════════════════════════
// Type guards and validation functions for socket event payloads.
// Ensures all input data matches expected types and constraints before processing.
// ══════════════════════════════════════════════════════════════════════════════

import { AIDifficulty, MatchType } from '@ems/types';

// ══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateMatchPayload {
  type: 'ai' | 'pvp';
  wager: number;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
}

export interface JoinMatchPayload {
  matchId: string;
}

export interface PlayerInputPayload {
  paddleY: number;
  timestamp: number;
}

export interface PlayerReadyPayload {
  ready: boolean;
}

export interface SpectateMatchPayload {
  gameId: string;
}

export interface AuthPayload {
  token: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Validation Functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validates create_match event payload
 */
export function validateCreateMatch(data: unknown): data is CreateMatchPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] create_match: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate type (required)
  if (payload.type !== 'ai' && payload.type !== 'pvp') {
    console.warn('[VALIDATION] create_match: invalid match type', payload.type);
    return false;
  }

  // Validate wager (required, must be number)
  if (typeof payload.wager !== 'number' || !Number.isFinite(payload.wager)) {
    console.warn('[VALIDATION] create_match: invalid wager', payload.wager);
    return false;
  }

  // Wager must be non-negative
  if (payload.wager < 0) {
    console.warn('[VALIDATION] create_match: negative wager', payload.wager);
    return false;
  }

  // Wager must be an integer (no fractional MuskBucks)
  if (!Number.isInteger(payload.wager)) {
    console.warn('[VALIDATION] create_match: fractional wager', payload.wager);
    return false;
  }

  // For AI matches, validate difficulty
  if (payload.type === 'ai') {
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD', 'IMPOSSIBLE'];
    if (!payload.aiDifficulty || !validDifficulties.includes(payload.aiDifficulty)) {
      console.warn('[VALIDATION] create_match: invalid AI difficulty', payload.aiDifficulty);
      return false;
    }
  }

  return true;
}

/**
 * Validates join_match event payload
 */
export function validateJoinMatch(data: unknown): data is JoinMatchPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] join_match: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate matchId (required, must be string)
  if (typeof payload.matchId !== 'string') {
    console.warn('[VALIDATION] join_match: invalid matchId type');
    return false;
  }

  // MatchId should not be empty
  if (payload.matchId.trim().length === 0) {
    console.warn('[VALIDATION] join_match: empty matchId');
    return false;
  }

  // MatchId should have reasonable length (prevent overflow attacks)
  if (payload.matchId.length > 100) {
    console.warn('[VALIDATION] join_match: matchId too long', payload.matchId.length);
    return false;
  }

  return true;
}

/**
 * Validates player_input event payload
 */
export function validatePlayerInput(data: unknown): data is PlayerInputPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] player_input: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate paddleY (required, must be number)
  if (typeof payload.paddleY !== 'number' || !Number.isFinite(payload.paddleY)) {
    console.warn('[VALIDATION] player_input: invalid paddleY', payload.paddleY);
    return false;
  }

  // PaddleY must be non-negative (bounds checking done in game logic)
  if (payload.paddleY < 0) {
    console.warn('[VALIDATION] player_input: negative paddleY', payload.paddleY);
    return false;
  }

  // PaddleY should be reasonable (max field height is typically 600)
  if (payload.paddleY > 10000) {
    console.warn('[VALIDATION] player_input: paddleY too large', payload.paddleY);
    return false;
  }

  // Validate timestamp (required, must be number)
  if (typeof payload.timestamp !== 'number' || !Number.isFinite(payload.timestamp)) {
    console.warn('[VALIDATION] player_input: invalid timestamp', payload.timestamp);
    return false;
  }

  // Timestamp should be in the past (with 5 second buffer for clock skew)
  const now = Date.now();
  const MAX_FUTURE_OFFSET = 5000; // 5 seconds
  if (payload.timestamp > now + MAX_FUTURE_OFFSET) {
    console.warn('[VALIDATION] player_input: timestamp in future', {
      timestamp: payload.timestamp,
      now,
      diff: payload.timestamp - now,
    });
    return false;
  }

  // Timestamp should not be too old (more than 10 seconds)
  const MAX_AGE = 10000; // 10 seconds
  if (payload.timestamp < now - MAX_AGE) {
    console.warn('[VALIDATION] player_input: timestamp too old', {
      timestamp: payload.timestamp,
      now,
      age: now - payload.timestamp,
    });
    return false;
  }

  return true;
}

/**
 * Validates player_ready event payload
 */
export function validatePlayerReady(data: unknown): data is PlayerReadyPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] player_ready: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate ready (required, must be boolean)
  if (typeof payload.ready !== 'boolean') {
    console.warn('[VALIDATION] player_ready: invalid ready type', typeof payload.ready);
    return false;
  }

  return true;
}

/**
 * Validates spectate_match event payload
 */
export function validateSpectateMatch(data: unknown): data is SpectateMatchPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] spectate_match: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate gameId (required, must be string)
  if (typeof payload.gameId !== 'string') {
    console.warn('[VALIDATION] spectate_match: invalid gameId type');
    return false;
  }

  // GameId should not be empty
  if (payload.gameId.trim().length === 0) {
    console.warn('[VALIDATION] spectate_match: empty gameId');
    return false;
  }

  // GameId should have reasonable length
  if (payload.gameId.length > 100) {
    console.warn('[VALIDATION] spectate_match: gameId too long', payload.gameId.length);
    return false;
  }

  return true;
}

/**
 * Validates auth event payload
 */
export function validateAuth(data: unknown): data is AuthPayload {
  if (typeof data !== 'object' || !data) {
    console.warn('[VALIDATION] auth: payload is not an object');
    return false;
  }

  const payload = data as any;

  // Validate token (required, must be string)
  if (typeof payload.token !== 'string') {
    console.warn('[VALIDATION] auth: invalid token type');
    return false;
  }

  // Token should not be empty
  if (payload.token.trim().length === 0) {
    console.warn('[VALIDATION] auth: empty token');
    return false;
  }

  // JWT tokens are typically 100-500 characters, but we'll be generous
  if (payload.token.length > 2048) {
    console.warn('[VALIDATION] auth: token too long', payload.token.length);
    return false;
  }

  return true;
}

/**
 * Validates that a string is a valid match ID format
 * Match IDs follow pattern: lobby-{timestamp}-{random} or game-{timestamp}-{random}
 */
export function isValidMatchIdFormat(matchId: string): boolean {
  // Should start with 'lobby-' or 'game-'
  if (!matchId.startsWith('lobby-') && !matchId.startsWith('game-')) {
    return false;
  }

  // Should have reasonable length (typical: lobby-1234567890-abc123)
  if (matchId.length < 15 || matchId.length > 50) {
    return false;
  }

  // Basic format check (prefix-number-alphanumeric)
  const pattern = /^(lobby|game)-\d{10,13}-[a-z0-9]+$/;
  return pattern.test(matchId);
}
