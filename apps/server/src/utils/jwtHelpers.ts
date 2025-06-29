// apps/server/src/utils/jwtHelpers.ts

import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@prisma/client';

// We assume dotenv.config() has already run in index.ts,
// so these exist—assert non‐null to convince TypeScript.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    'Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in environment',
  );
}

/**
 * Creates a short-lived access token (15m).
 */
export function generateAccessToken(user: User): string {
  return jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
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
