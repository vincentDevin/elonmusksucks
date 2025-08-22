import prisma from '../db';
import type { User, EmailVerification, PasswordReset, RefreshToken } from '@prisma/client';
import type { IAuthRepository } from './IAuthRepository';

export class PrismaAuthRepository implements IAuthRepository {
  // --- Users ---
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findUserBalance(userId: number): Promise<{ muskBucks: bigint } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { muskBucks: true },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
  }): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          emailVerified: data.emailVerified,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        throw new Error('REGISTRATION_ERROR');
      }
      throw err;
    }
  }

  async updatePassword(userId: number, passwordHash: string): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  // --- Refresh tokens ---
  async saveRefreshToken(userId: number, hashedToken: string, expiresAt: Date): Promise<void> {
    // Remove any existing tokens for this user
    await prisma.refreshToken.deleteMany({ where: { userId } });
    // Create the new token (now storing hashed version)
    await prisma.refreshToken.create({ data: { userId, token: hashedToken, expiresAt } });
  }

  async getAllRefreshTokensForUser(userId: number): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
  }

  async getRefreshToken(token: string): Promise<RefreshToken | null> {
    // This method is now deprecated - use getAllRefreshTokensForUser and compare hashes
    const record = await prisma.refreshToken.findUnique({ where: { token } });
    if (record && record.expiresAt < new Date()) {
      await this.deleteRefreshToken(record.token);
      return null;
    }
    return record;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.delete({ where: { token } });
    } catch (error: any) {
      // If token doesn't exist (P2025), ignore the error
      if (error.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  // --- Email verification ---
  async createEmailVerification(data: {
    userId: number;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.emailVerification.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findEmailVerification(token: string): Promise<EmailVerification | null> {
    const record = await prisma.emailVerification.findUnique({ where: { token } });
    if (record && record.expiresAt < new Date()) {
      await this.deleteEmailVerification(record.id);
      return null;
    }
    return record;
  }

  async deleteEmailVerification(id: number): Promise<void> {
    await prisma.emailVerification.delete({ where: { id } });
  }

  async markEmailVerified(userId: number): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  }

  // --- Password reset ---
  async createPasswordReset(data: {
    userId: number;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.passwordReset.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPasswordReset(token: string): Promise<PasswordReset | null> {
    const record = await prisma.passwordReset.findUnique({ where: { token } });
    if (record && record.expiresAt < new Date()) {
      await this.deletePasswordReset(record.id);
      return null;
    }
    return record;
  }

  async deletePasswordReset(id: number): Promise<void> {
    await prisma.passwordReset.delete({ where: { id } });
  }
}
