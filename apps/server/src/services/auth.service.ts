// apps/server/src/services/auth.service.ts
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import type { User } from '@prisma/client';
import type { IAuthRepository } from '../repositories/IAuthRepository';
import { PrismaAuthRepository } from '../repositories/AuthRepository';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
const DUMMY_HASH = '$2b$10$KIXh1g4myh5j9hFSUVjdaeQXG7q3NDy4W8P4Y8XxYQCEhiqbz0R4e';
const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

const repo: IAuthRepository = new PrismaAuthRepository();

/**
 * Create a new user (hashing & salting their password).
 * Throws 'REGISTRATION_ERROR' if email is already taken.
 */
export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const normalized = email.trim().toLowerCase();

  // check for existing account
  const existing = await repo.findByEmail(normalized);
  if (existing) throw new Error('REGISTRATION_ERROR');

  // hash & salt
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  // create
  return repo.createUser({
    name,
    email: normalized,
    passwordHash,
    emailVerified: skipEmailFlow,
  });
}

/**
 * Validate an email+password combo.
 * Returns the user if ok, or null.
 */
export async function validateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();

  // find by email (or dummy)
  const user = await repo.findByEmail(normalized);
  const hash = user?.passwordHash ?? DUMMY_HASH;

  // compare
  const match = await bcrypt.compare(password, hash);
  return match && user ? user : null;
}

// --- Refresh tokens ---

export async function saveRefreshToken(userId: number, token: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await repo.saveRefreshToken(userId, token, expiresAt);
}

export async function getRefreshToken(token: string) {
  return repo.getRefreshToken(token);
}

export async function deleteRefreshToken(token: string) {
  await repo.deleteRefreshToken(token);
}

// --- User lookup ---

export async function getUserById(userId: number) {
  return repo.findById(userId);
}

// --- Email verification ---

export async function createEmailVerification(userId: number): Promise<string> {
  if (skipEmailFlow) {
    await repo.markEmailVerified(userId);
    return '';
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await repo.createEmailVerification({ userId, token, expiresAt });
  return token;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  if (skipEmailFlow) return true;

  const record = await repo.findEmailVerification(token);
  if (!record || record.expiresAt < new Date()) return false;

  await repo.markEmailVerified(record.userId);
  await repo.deleteEmailVerification(record.id);
  return true;
}

// --- Password reset ---

export async function createPasswordReset(userId: number): Promise<string> {
  if (skipEmailFlow) return '';

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await repo.createPasswordReset({ userId, token, expiresAt });
  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  if (skipEmailFlow) {
    // treat token as email for dev convenience
    const devUser = await repo.findByEmail(token);
    if (!devUser) return false;
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await repo.updatePassword(devUser.id, passwordHash);
    return true;
  }

  const record = await repo.findPasswordReset(token);
  if (!record || record.expiresAt < new Date()) return false;

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await repo.updatePassword(record.userId, passwordHash);
  await repo.deletePasswordReset(record.id);
  return true;
}

// --- Lookup by email ---

export async function getUserByEmail(email: string): Promise<User | null> {
  return repo.findByEmail(email.trim().toLowerCase());
}
