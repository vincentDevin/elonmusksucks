// apps/server/src/utils/jwtHelpers.ts

import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@prisma/client';
import type { JWTKeyConfig, JWTRotationConfig } from '@ems/types';

// We assume dotenv.config() has already run in index.ts,
// so these exist—assert non‐null to convince TypeScript.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in environment');
}

// Default rotation configuration
const defaultRotationConfig: JWTRotationConfig = {
  currentKeyId: 'key-1',
  keys: {
    'key-1': {
      keyId: 'key-1',
      secret: ACCESS_TOKEN_SECRET,
      algorithm: 'HS256',
      createdAt: new Date(),
    },
  },
  overlapPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
};

let rotationConfig: JWTRotationConfig = defaultRotationConfig;

// ==========================================
// Token Validation Cache
// ==========================================
// Cache validated tokens to avoid redundant JWT verification
// Note: auth.middleware.ts already caches user lookups, this caches the JWT verification itself
interface TokenCacheEntry {
  userId: number;
  expiresAt: number;
}

const tokenValidationCache = new Map<string, TokenCacheEntry>();
const TOKEN_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (well before token expiry)
const MAX_CACHE_SIZE = 500; // Prevent memory leaks

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;

  // Convert iterator to array for compatibility
  const entries = Array.from(tokenValidationCache.entries());
  for (const [token, entry] of entries) {
    if (entry.expiresAt < now) {
      tokenValidationCache.delete(token);
      deletedCount++;
    }
  }

  // Also enforce max size
  if (tokenValidationCache.size > MAX_CACHE_SIZE) {
    const toDelete = tokenValidationCache.size - MAX_CACHE_SIZE;
    const keys = Array.from(tokenValidationCache.keys()).slice(0, toDelete);
    keys.forEach((key) => tokenValidationCache.delete(key));
    deletedCount += toDelete;
  }

  if (deletedCount > 0) {
    console.log(`[jwt] Cleaned up ${deletedCount} cached token validations`);
  }
}, 60 * 1000); // Clean every minute

// Key rotation utilities
export function getCurrentKey(): JWTKeyConfig {
  return rotationConfig.keys[rotationConfig.currentKeyId];
}

export function getValidationKeys(): JWTKeyConfig[] {
  const now = new Date();
  return Object.values(rotationConfig.keys).filter((key) => {
    if (!key.expiresAt) return true;
    return key.expiresAt > now;
  });
}

export function generateKeyPair(keyId: string): JWTKeyConfig {
  return {
    keyId,
    secret: require('crypto').randomBytes(64).toString('hex'),
    algorithm: 'HS256',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + rotationConfig.overlapPeriodMs),
  };
}

export function rotateKeys(newKeyId: string): void {
  const newKey = generateKeyPair(newKeyId);

  // Mark current key for expiration
  const currentKey = getCurrentKey();
  if (!currentKey.expiresAt) {
    currentKey.expiresAt = new Date(Date.now() + rotationConfig.overlapPeriodMs);
  }

  // Add new key and update current
  rotationConfig.keys[newKeyId] = newKey;
  rotationConfig.currentKeyId = newKeyId;

  console.log(
    `[jwt] Rotated to key ${newKeyId}, overlap period: ${rotationConfig.overlapPeriodMs}ms`,
  );
}

/**
 * Creates a short-lived access token (15m).
 */
export function generateAccessToken(user: User): string {
  const currentKey = getCurrentKey();
  return jwt.sign({ userId: user.id }, currentKey.secret, {
    expiresIn: '15m',
    header: {
      kid: currentKey.keyId,
      alg: currentKey.algorithm,
    },
  });
}

/**
 * Creates a long-lived refresh token (7d).
 */
export function generateRefreshToken(user: User): string {
  return jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Verifies a refresh token’s signature & expiration,
 * returning its payload ({ userId }) or throwing.
 */
export function verifyRefreshToken(token: string): { userId: number } {
  const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
  if (!payload || typeof payload !== 'object' || typeof payload.userId !== 'number') {
    throw new Error('Invalid refresh token payload');
  }
  return { userId: payload.userId };
}

/**
 * Verifies an access token's signature & expiration,
 * returning its payload ({ userId }) or throwing.
 * Uses in-memory cache to avoid redundant JWT verification.
 */
export function verifyAccessToken(token: string): { userId: number } {
  // Check cache first
  const cached = tokenValidationCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { userId: cached.userId };
  }

  // Cache miss or expired - validate token
  const validationKeys = getValidationKeys();
  let lastError: Error | null = null;

  for (const keyConfig of validationKeys) {
    try {
      const payload = jwt.verify(token, keyConfig.secret) as JwtPayload;
      if (!payload || typeof payload !== 'object' || typeof payload.userId !== 'number') {
        throw new Error('Invalid access token payload');
      }

      // Log only on first validation (cache miss)
      console.log(`[jwt] Token validated with key ${keyConfig.keyId}`);

      // Cache the successful validation
      tokenValidationCache.set(token, {
        userId: payload.userId,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      });

      return { userId: payload.userId };
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  console.warn('[jwt] Token validation failed with all available keys:', lastError?.message);
  throw new Error('Invalid or expired token');
}
