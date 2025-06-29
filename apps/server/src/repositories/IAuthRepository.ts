// apps/server/src/repositories/IAuthRepository.ts

import type { User } from '@prisma/client';

export interface IAuthRepository {
  // --- Users ---
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
  }): Promise<User>;
  updatePassword(userId: number, passwordHash: string): Promise<User>;

  // --- Refresh tokens ---
  saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getRefreshToken(
    token: string,
  ): Promise<{ token: string; userId: number; expiresAt: Date } | null>;
  deleteRefreshToken(token: string): Promise<void>;

  // --- Email verification ---
  createEmailVerification(data: { userId: number; token: string; expiresAt: Date }): Promise<void>;
  findEmailVerification(
    token: string,
  ): Promise<{ id: number; userId: number; expiresAt: Date } | null>;
  deleteEmailVerification(id: number): Promise<void>;
  markEmailVerified(userId: number): Promise<User>;

  // --- Password reset ---
  createPasswordReset(data: { userId: number; token: string; expiresAt: Date }): Promise<void>;
  findPasswordReset(token: string): Promise<{ id: number; userId: number; expiresAt: Date } | null>;
  deletePasswordReset(id: number): Promise<void>;
}
