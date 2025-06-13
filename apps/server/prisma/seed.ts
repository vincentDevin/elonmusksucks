import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, BetOption } from '@prisma/client';
const prisma = new PrismaClient();

// Read the SKIP_EMAIL_FLOW flag to bypass email verification if needed
const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

async function main() {
  // 1. Create a couple users (with optional emailVerified flag)
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
    },
  });

  // 2. Add profile details
  await prisma.user.update({
    where: { id: alice.id },
    data: {
      bio: 'Space enthusiast and Mars colonist-in-training.',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      location: 'Austin, TX',
      timezone: 'America/Chicago',
    },
  });
  await prisma.user.update({
    where: { id: bob.id },
    data: {
      bio: 'Rocket scientist by day, dog stroller by night.',
      avatarUrl: 'https://i.pravatar.cc/150?img=2',
      location: 'Los Angeles, CA',
      timezone: 'America/Los_Angeles',
    },
  });

  // 3. Create some predictions
  const p1 = await prisma.prediction.create({
    data: {
      title: 'Elon tweets in Klingon',
      description: 'Will Elon Musk tweet something in Klingon by end of month?',
      category: 'Twitter',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // one week
    },
  });
  const p2 = await prisma.prediction.create({
    data: {
      title: 'Tesla stock hits $1,000',
      description: 'Will TSLA close ≥ $1,000 on any trading day this quarter?',
      category: 'Stocks',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    },
  });

  // 4. Place a few bets
  await prisma.bet.create({ data: { userId: alice.id, predictionId: p1.id, amount: 100, option: BetOption.YES } });
  await prisma.bet.create({ data: { userId: bob.id,   predictionId: p1.id, amount: 200, option: BetOption.NO  } });
  await prisma.bet.create({ data: { userId: alice.id, predictionId: p2.id, amount: 150, option: BetOption.YES } });

  // 5. Create badges and assign one
  const [firstBet, bigSpender] = await Promise.all([
    prisma.badge.upsert({
      where: { name: 'First Bet' },
      update: {},
      create: {
        name: 'First Bet',
        description: 'Placed your first bet',
        iconUrl: 'https://example.com/icons/first-bet.png',
      },
    }),
    prisma.badge.upsert({
      where: { name: 'Big Spender' },
      update: {},
      create: {
        name: 'Big Spender',
        description: 'Bet over 1000 MuskBucks at once',
        iconUrl: 'https://example.com/icons/big-spender.png',
      },
    }),
  ]);

  await prisma.userBadge.create({
    data: { userId: alice.id, badgeId: firstBet.id },
  });

  // 6. Follow relationships
  await prisma.follow.create({ data: { followerId: alice.id, followingId: bob.id } });
  await prisma.follow.create({ data: { followerId: bob.id,   followingId: alice.id } });

  console.log('🌱 Seed data created');
  console.log('Skip email flow:', skipEmailFlow);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });