import { PrismaClient, Outcome, BetOption } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Create a couple users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: 'not_a_real_hash',
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash: 'not_a_real_hash',
    },
  });

  // 2. Create some predictions
  const p1 = await prisma.prediction.create({
    data: {
      title: 'Elon tweets in Klingon',
      description: 'Will Elon Musk tweet something in Klingon by end of month?',
      category: 'Twitter',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // one week from now
    },
  });
  const p2 = await prisma.prediction.create({
    data: {
      title: 'Tesla stock hits $1,000',
      description: 'Will TSLA close at or above $1,000 on any trading day this quarter?',
      category: 'Stocks',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days out
    },
  });

  // 3. Place a couple of bets
  await prisma.bet.createMany({
    data: [
      { userId: alice.id, predictionId: p1.id, amount: 100, option: BetOption.YES },
      { userId: bob.id, predictionId: p1.id, amount: 200, option: BetOption.NO },
      { userId: alice.id, predictionId: p2.id, amount: 150, option: BetOption.YES },
    ],
  });

  console.log('🌱 Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
