// apps/server/src/repositories/PrismaAuthRepository.ts

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

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified,
      },
    });
  }

  async updatePassword(userId: number, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // --- Refresh tokens ---
  async saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async getRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } });
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
    return prisma.emailVerification.findUnique({ where: { token } });
  }

  async deleteEmailVerification(id: number): Promise<void> {
    await prisma.emailVerification.delete({ where: { id } });
  }

  async markEmailVerified(userId: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
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
    return prisma.passwordReset.findUnique({ where: { token } });
  }

  async deletePasswordReset(id: number): Promise<void> {
    await prisma.passwordReset.delete({ where: { id } });
  }
}
