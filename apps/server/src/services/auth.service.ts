// apps/server/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import prisma from '../db';

export async function createUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, passwordHash },
  });
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
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
