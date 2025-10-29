import type {
  PrismaUser,
  PrismaRefreshToken,
  PrismaEmailVerification,
  PrismaPasswordReset,
} from '@ems/types';

export interface IAuthRepository {
  // --- Users ---
  findByEmail(email: string): Promise<PrismaUser | null>;
  findById(id: number): Promise<PrismaUser | null>;
  findUserBalance(userId: number): Promise<{ muskBucks: bigint } | null>;
  createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
  }): Promise<PrismaUser>;
  updatePassword(userId: number, passwordHash: string): Promise<PrismaUser>;

  // --- Refresh tokens ---
  saveRefreshToken(userId: number, hashedToken: string, expiresAt: Date): Promise<void>;
  getAllRefreshTokensForUser(userId: number): Promise<PrismaRefreshToken[]>;
  getRefreshToken(token: string): Promise<PrismaRefreshToken | null>; // Deprecated
  deleteRefreshToken(token: string): Promise<void>;

  // --- Email verification ---
  createEmailVerification(data: { userId: number; token: string; expiresAt: Date }): Promise<void>;
  findEmailVerification(token: string): Promise<PrismaEmailVerification | null>;
  deleteEmailVerification(id: number): Promise<void>;
  markEmailVerified(userId: number): Promise<PrismaUser>;

  // --- Password reset ---
  createPasswordReset(data: { userId: number; token: string; expiresAt: Date }): Promise<void>;
  findPasswordReset(token: string): Promise<PrismaPasswordReset | null>;
  deletePasswordReset(id: number): Promise<void>;
}
