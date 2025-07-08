import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables (.env.test)
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

declare global {
  var prisma: PrismaClient;
}

let prisma: PrismaClient;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in .env.test');
  }

  // 1) apply Prisma migrations against the test DB
  execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env: { ...process.env },
  });

  // 2) connect PrismaClient
  prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await prisma.$connect();
  global.prisma = prisma;
});

afterEach(async () => {
  // Reset state by truncating all tables in the test database
  await prisma.$executeRawUnsafe(
    `
    TRUNCATE TABLE 
      "Prediction",
      "Bet",
      "User"
    RESTART IDENTITY CASCADE;
    `,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
