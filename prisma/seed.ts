// scripts/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, TransactionType, BetStatus } from '@prisma/client';
const prisma = new PrismaClient();

// Helper to clear a model if its table exists
async function clear<Model>(name: string, fn: () => Promise<Model>) {
  try {
    await fn();
    console.log(`🧹 Cleared ${name}`);
  } catch (err: any) {
    console.warn(`⚠️  Could not clear ${name}: ${err.message.split('\n')[0]}`);
  }
}

const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

async function main() {
  console.log('🧹 Clearing out old data...');

  // Order matters for FKs. We clear everything except User, Posts, Activity.
  await clear('Transaction',     () => prisma.transaction.deleteMany());
  await clear('ParlayLeg',       () => prisma.parlayLeg.deleteMany());
  await clear('Parlay',          () => prisma.parlay.deleteMany());
  await clear('Bet',             () => prisma.bet.deleteMany());
  await clear('UserBadge',       () => prisma.userBadge.deleteMany());
  await clear('Follow',          () => prisma.follow.deleteMany());
  await clear('UserStats',       () => prisma.userStats.deleteMany());
  await clear('PredictionOption',() => prisma.predictionOption.deleteMany());
  await clear('Prediction',      () => prisma.prediction.deleteMany());
  await clear('Badge',           () => prisma.badge.deleteMany());
  // ← do NOT clear 'User'
  // ← do NOT clear 'UserPost'
  // ← do NOT clear 'UserActivity'

  console.log('👥 Ensuring users Alice & Bob exist…');
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
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
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
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

  console.log('🏅 Creating badges…');
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
      { userId: bob.id,   badgeId: firstBet.id, awardedAt: new Date() },
    ],
    skipDuplicates: true,
  });

  console.log('🤝 Creating follows…');
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: bob.id,   followingId: alice.id },
    ],
    skipDuplicates: true,
  });

  console.log('📝 Seeding predictions + options…');
  // MULTIPLE choice with 4 options
  const pMultiple = await prisma.prediction.create({
    data: {
      title: 'Which SpaceX mission will launch next?',
      description: 'Pick the next type of SpaceX mission to lift off.',
      category: 'SpaceX',
      type: 'MULTIPLE',
      threshold: null,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      creatorId: alice.id,
      options: {
        create: [
          { label: 'Starlink',    odds: 2.0 },
          { label: 'Crew Dragon', odds: 3.5 },
          { label: 'GPS III',     odds: 5.0 },
          { label: 'X-37B',       odds: 8.0 },
        ],
      },
    },
    include: { options: true },
  });

  // BINARY yes/no
  const pBinary = await prisma.prediction.create({
    data: {
      title: 'Elon goes to Mars in 2025',
      description: 'Will Elon step foot on Mars before 2026?',
      category: 'Space',
      type: 'BINARY',
      threshold: null,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      creatorId: bob.id,
      options: {
        create: [
          { label: 'Yes', odds: 3.0 },
          { label: 'No',  odds: 1.2 },
        ],
      },
    },
    include: { options: true },
  });

  // OVER_UNDER
  const threshold = 100;
  const pOU = await prisma.prediction.create({
    data: {
      title: 'Tesla stock over/under $100',
      description: 'Will TSLA close above or below $100 on next trading day?',
      category: 'Stocks',
      type: 'OVER_UNDER',
      threshold,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      creatorId: alice.id,
      options: {
        create: [
          { label: `Over ${threshold}`, odds: 1.8 },
          { label: `Under ${threshold}`, odds: 1.8 },
        ],
      },
    },
    include: { options: true },
  });

  console.log('🎲 Placing some bets…');
  await Promise.all([
    prisma.bet.create({
      data: {
        userId: alice.id,
        predictionId: pMultiple.id,
        optionId: pMultiple.options[0]!.id,
        amount: 100,
        oddsAtPlacement: pMultiple.options[0]!.odds,
        potentialPayout: Math.floor(100 * pMultiple.options[0]!.odds),
        status: BetStatus.PENDING,
      },
    }),
    prisma.bet.create({
      data: {
        userId: bob.id,
        predictionId: pMultiple.id,
        optionId: pMultiple.options[1]!.id,
        amount: 200,
        oddsAtPlacement: pMultiple.options[1]!.odds,
        potentialPayout: Math.floor(200 * pMultiple.options[1]!.odds),
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
      combinedOdds: pMultiple.options[0]!.odds * pBinary.options[1]!.odds,
      potentialPayout: Math.floor(
        parlayAmount * pMultiple.options[0]!.odds * pBinary.options[1]!.odds
      ),
      legs: {
        create: [
          { optionId: pMultiple.options[0]!.id, oddsAtPlacement: pMultiple.options[0]!.odds },
          { optionId: pBinary.options[1]!.id,   oddsAtPlacement: pBinary.options[1]!.odds },
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

  // Upsert user posts
  console.log('📝 Seeding user feed posts…');
  const alicePost = await (
    (await prisma.userPost.findFirst({
      where: {
        authorId: alice.id,
        ownerId: alice.id,
        content: 'Hello world! This is Alice’s first post.',
      },
    })) ||
    prisma.userPost.create({
      data: {
        authorId: alice.id,
        ownerId: alice.id,
        content: 'Hello world! This is Alice’s first post.',
      },
    })
  );

  const bobCommentOnAlice = await (
    (await prisma.userPost.findFirst({
      where: {
        authorId: bob.id,
        ownerId: alice.id,
        content: 'Nice post, Alice! 🚀',
      },
    })) ||
    prisma.userPost.create({
      data: {
        authorId: bob.id,
        ownerId: alice.id,
        content: 'Nice post, Alice! 🚀',
        parentId: alicePost.id,
      },
    })
  );

  const bobPost = await (
    (await prisma.userPost.findFirst({
      where: {
        authorId: bob.id,
        ownerId: bob.id,
        content: 'First post on my profile!',
      },
    })) ||
    prisma.userPost.create({
      data: {
        authorId: bob.id,
        ownerId: bob.id,
        content: 'First post on my profile!',
      },
    })
  );

  const aliceCommentOnBob = await (
    (await prisma.userPost.findFirst({
      where: {
        authorId: alice.id,
        ownerId: bob.id,
        content: 'Hi Bob!',
      },
    })) ||
    prisma.userPost.create({
      data: {
        authorId: alice.id,
        ownerId: bob.id,
        content: 'Hi Bob!',
        parentId: bobPost.id,
      },
    })
  );

  // Upsert user activity
  console.log('🗂️ Seeding user activity…');
  await (
    (await prisma.userActivity.findFirst({
      where: {
        userId: alice.id,
        type: 'POST_CREATED',
        details: { equals: { postId: alicePost.id } },
      },
    })) ||
    prisma.userActivity.create({
      data: {
        userId: alice.id,
        type: 'POST_CREATED',
        details: { postId: alicePost.id },
      },
    })
  );

  await (
    (await prisma.userActivity.findFirst({
      where: {
        userId: bob.id,
        type: 'COMMENT_CREATED',
        details: { equals: { postId: bobPost.id } },
      },
    })) ||
    prisma.userActivity.create({
      data: {
        userId: bob.id,
        type: 'COMMENT_CREATED',
        details: { postId: bobPost.id },
      },
    })
  );

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
