// scripts/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, TransactionType, BetStatus } from '@prisma/client';
const prisma = new PrismaClient();

const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

async function main() {
  console.log('🧹 Clearing out old data...');
  // Order matters for FK constraints!
  await prisma.transaction.deleteMany();
  await prisma.parlayLeg.deleteMany();
  await prisma.parlay.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.userActivity.deleteMany();
  await prisma.userPost.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.predictionOption.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.user.deleteMany();

  console.log('👥 Creating users Alice & Bob…');
  // Upsert, but since we cleared, just create
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
      bio: 'Space enthusiast and Mars colonist-in-training.',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      location: 'Austin, TX',
      timezone: 'America/Chicago',
      muskBucks: 10000,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
      bio: 'Rocket scientist by day, dog stroller by night.',
      avatarUrl: 'https://i.pravatar.cc/150?img=2',
      location: 'Los Angeles, CA',
      timezone: 'America/Los_Angeles',
      muskBucks: 9500,
    },
  });

  console.log('🏅 Creating badges...');
  const [firstBet, bigSpender] = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Bet',
        description: 'Placed your first bet',
        iconUrl: 'https://example.com/icons/first-bet.png',
      },
    }),
    prisma.badge.create({
      data: {
        name: 'Big Spender',
        description: 'Bet over 1000 MuskBucks at once',
        iconUrl: 'https://example.com/icons/big-spender.png',
      },
    }),
  ]);

  await prisma.userBadge.createMany({
    data: [
      { userId: alice.id, badgeId: firstBet.id, awardedAt: new Date() },
      { userId: bob.id, badgeId: firstBet.id, awardedAt: new Date() },
    ],
    skipDuplicates: true,
  });

  console.log('🤝 Creating follows...');
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: bob.id, followingId: alice.id },
    ],
    skipDuplicates: true,
  });

  console.log('📝 Seeding predictions + options...');
  const p1 = await prisma.prediction.create({
    data: {
      title: 'Elon tweets in Klingon',
      description: 'Will Elon Musk tweet something in Klingon by end of month?',
      category: 'Twitter',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      options: {
        create: [
          { label: 'Yes', odds: 2.0 },
          { label: 'No', odds: 1.5 },
        ],
      },
    },
    include: { options: true },
  });
  const p2 = await prisma.prediction.create({
    data: {
      title: 'Tesla stock hits $1,000',
      description: 'Will TSLA close ≥ $1,000 on any trading day this quarter?',
      category: 'Stocks',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      options: {
        create: [
          { label: 'Yes', odds: 3.0 },
          { label: 'No', odds: 1.2 },
        ],
      },
    },
    include: { options: true },
  });

  console.log('🎲 Placing some bets...');
  await Promise.all([
    prisma.bet.create({
      data: {
        userId: alice.id,
        predictionId: p1.id,
        optionId: p1.options[0]!.id,
        amount: 100,
        oddsAtPlacement: p1.options[0]!.odds,
        potentialPayout: Math.floor(100 * p1.options[0]!.odds),
        status: BetStatus.PENDING,
      },
    }),
    prisma.bet.create({
      data: {
        userId: bob.id,
        predictionId: p1.id,
        optionId: p1.options[1]!.id,
        amount: 200,
        oddsAtPlacement: p1.options[1]!.odds,
        potentialPayout: Math.floor(200 * p1.options[1]!.odds),
        status: BetStatus.PENDING,
      },
    }),
  ]);

  console.log('🎰 Creating a sample parlay for Alice…');
  const parlayAmount = 50;
  const parlay = await prisma.parlay.create({
    data: {
      userId: alice.id,
      amount: parlayAmount,
      combinedOdds: p1.options[0]!.odds * p2.options[1]!.odds,
      potentialPayout: Math.floor(parlayAmount * p1.options[0]!.odds * p2.options[1]!.odds),
      legs: {
        create: [
          { optionId: p1.options[0]!.id, oddsAtPlacement: p1.options[0]!.odds },
          { optionId: p2.options[1]!.id, oddsAtPlacement: p2.options[1]!.odds },
        ],
      },
    },
  });
  await prisma.transaction.create({
    data: {
      userId: alice.id,
      type: TransactionType.DEBIT,
      amount: parlayAmount,
      balanceAfter: alice.muskBucks - parlayAmount,
      relatedParlayId: parlay.id,
    },
  });

  console.log('📝 Seeding user feed posts...');
  // Alice posts, Bob comments
  const alicePost = await prisma.userPost.create({
    data: {
      authorId: alice.id,
      ownerId: alice.id,
      content: 'Hello world! This is Alice’s first post.',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  });
  await prisma.userPost.create({
    data: {
      authorId: bob.id,
      ownerId: alice.id,
      content: 'Nice post, Alice! 🚀',
      parentId: alicePost.id,
      createdAt: new Date(Date.now() - 50 * 60 * 1000),
      updatedAt: new Date(Date.now() - 50 * 60 * 1000),
    },
  });

  // Bob posts, Alice comments
  const bobPost = await prisma.userPost.create({
    data: {
      authorId: bob.id,
      ownerId: bob.id,
      content: 'First post on my profile!',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });
  await prisma.userPost.create({
    data: {
      authorId: alice.id,
      ownerId: bob.id,
      content: 'Hi Bob!',
      parentId: bobPost.id,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
      updatedAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });

  console.log('📈 Seeding user stats...');
  await prisma.userStats.createMany({
    data: [
      {
        userId: alice.id,
        totalBets: 3,
        betsWon: 1,
        betsLost: 2,
        parlaysStarted: 1,
        parlaysWon: 0,
        totalWagered: 300,
        totalWon: 150,
        streak: 1,
        maxStreak: 2,
        profit: 150,
        roi: 0.5,
        mostCommonBet: 'Yes',
        biggestWin: 150,
        updatedAt: new Date(),
      },
      {
        userId: bob.id,
        totalBets: 1,
        betsWon: 0,
        betsLost: 1,
        parlaysStarted: 0,
        parlaysWon: 0,
        totalWagered: 200,
        totalWon: 0,
        streak: 0,
        maxStreak: 1,
        profit: -200,
        roi: -1,
        mostCommonBet: 'No',
        biggestWin: 0,
        updatedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log('🗂️ Seeding user activity...');
  await prisma.userActivity.createMany({
    data: [
      {
        userId: alice.id,
        type: 'POST_CREATED',
        details: { postId: alicePost.id },
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        userId: bob.id,
        type: 'COMMENT_CREATED',
        details: { postId: bobPost.id },
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Done seeding!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
