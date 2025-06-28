import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import prisma from '../db';
import { randomBytes } from 'crypto';
import { User } from '@prisma/client';

const DUMMY_HASH = '$2b$10$KIXh1g4myh5j9hFSUVjdaeQXG7q3NDy4W8P4Y8XxYQCEhiqbz0R4e';
// Flag to bypass email verification & reset flows in development
const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

// Create a new user, optionally auto-verifying email in dev
export async function createUser(name: string, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw new Error('REGISTRATION_ERROR');

  return prisma.user.create({
    data: {
      name,
      email: normalized,
      passwordHash,
      emailVerified: skipEmailFlow,
    },
  });
}

// Validate credentials
export async function validateUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return ok && user ? user : null;
}

// Refresh token storage
export async function saveRefreshToken(userId: number, token: string) {
  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}
export async function getRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({ where: { token } });
}
export async function deleteRefreshToken(token: string) {
  return prisma.refreshToken.delete({ where: { token } });
}
export async function getUserById(userId: number) {
  return prisma.user.findUnique({ where: { id: userId } });
}

// Email verification
export async function createEmailVerification(userId: number): Promise<string> {
  if (skipEmailFlow) {
    // Immediately mark verified in dev mode
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    return '';
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerification.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  if (skipEmailFlow) {
    // Always succeed in dev mode
    return true;
  }

  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) return false;

  await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  await prisma.emailVerification.delete({ where: { id: record.id } });
  return true;
}

// Password reset flows
export async function createPasswordReset(userId: number): Promise<string> {
  if (skipEmailFlow) {
    // Skip generating a token in dev
    return '';
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordReset.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  if (skipEmailFlow) {
    // In dev, treat token as email to lookup user directly
    const user = await prisma.user.findUnique({ where: { email: token } });
    if (!user) return false;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return true;
  }

  const record = await prisma.passwordReset.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) return false;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordReset.delete({ where: { id: record.id } });
  return true;
}

// Fetch user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  return prisma.user.findUnique({ where: { email: normalized } });
}
