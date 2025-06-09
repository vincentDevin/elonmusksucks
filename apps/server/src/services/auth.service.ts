import bcrypt from 'bcrypt';
import prisma from '../db';
import { randomBytes } from 'crypto';
import { User } from '@prisma/client';

const DUMMY_HASH = '$2b$10$KIXh1g4myh5j9hFSUVjdaeQXG7q3NDy4W8P4Y8XxYQCEhiqbz0R4e';

export async function createUser(name: string, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw new Error('REGISTRATION_ERROR');

  return prisma.user.create({
    data: { name, email: normalized, passwordHash },
  });
}

export async function validateUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return ok && user ? user : null;
}

export async function saveRefreshToken(userId: number, token: string) {
  // upsert or create
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

// Generate a one-time email verification token
export async function createEmailVerification(userId: number): Promise<string> {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await prisma.emailVerification.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

// Verify an email token and mark user verified
export async function verifyEmailToken(token: string): Promise<boolean> {
  const record = await prisma.emailVerification.findUnique({
    where: { token },
  });
  if (!record || record.expiresAt < new Date()) {
    return false;
  }
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });
  await prisma.emailVerification.delete({ where: { id: record.id } });
  return true;
}

/**
 * Generate a one-time password-reset token and email it.
 */
export async function createPasswordReset(userId: number): Promise<string> {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1h
  await prisma.passwordReset.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

/**
 * Given a token + new password, reset the user’s password.
 * Returns true on success, false if token invalid/expired.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const record = await prisma.passwordReset.findUnique({
    where: { token },
  });
  if (!record || record.expiresAt < new Date()) {
    return false;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });
  // consume the token
  await prisma.passwordReset.delete({ where: { id: record.id } });
  return true;
}

/**
 * Fetch a user by (normalized) email.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email: normalized },
  });
}
