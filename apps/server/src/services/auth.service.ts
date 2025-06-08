import bcrypt from 'bcrypt';
import prisma from '../db';

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
