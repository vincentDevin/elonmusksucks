// scripts/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, TransactionType, BetStatus } from '@prisma/client';
const prisma = new PrismaClient();

const skipEmailFlow = process.env.SKIP_EMAIL_FLOW === 'true';

async function main() {
  console.log('🧹 Clearing out old prediction data…');
  // delete child tables first (transactions reference bets & parlays)
  await prisma.transaction.deleteMany();
  await prisma.parlayLeg.deleteMany();
  await prisma.parlay.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.predictionOption.deleteMany();
  await prisma.prediction.deleteMany();

  console.log('👥 Upserting users Alice & Bob…');
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
    },
    update: {}, // no changes on re-seed
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      passwordHash: 'not_a_real_hash',
      emailVerified: skipEmailFlow,
    },
    update: {},
  });

  console.log('🖼️  Updating their profiles…');
  await Promise.all([
    prisma.user.update({
      where: { id: alice.id },
      data: {
        bio: 'Space enthusiast and Mars colonist-in-training.',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
        location: 'Austin, TX',
        timezone: 'America/Chicago',
      },
    }),
    prisma.user.update({
      where: { id: bob.id },
      data: {
        bio: 'Rocket scientist by day, dog stroller by night.',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
        location: 'Los Angeles, CA',
        timezone: 'America/Los_Angeles',
      },
    }),
  ]);

  console.log('📝 Seeding predictions + options…');
  // 1) Two-option prediction
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
  // 2) Two-option stock prediction
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
  // 3) Three-option fun prediction
  const p3 = await prisma.prediction.create({
    data: {
      title: 'Color of next SpaceX rocket launch plume',
      description: 'Will the next launch plume be red / blue / yellow?',
      category: 'Space',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      options: {
        create: [
          { label: 'Red', odds: 2.5 },
          { label: 'Blue', odds: 2.0 },
          { label: 'Yellow', odds: 4.0 },
        ],
      },
    },
    include: { options: true },
  });

  console.log('🎲 Placing some bets…');
  // simple bets
  await Promise.all([
    prisma.bet.create({
      data: {
        userId: alice.id,
        predictionId: p1.id,
        optionId: p1.options[0]!.id, // Yes
        amount: 100,
        oddsAtPlacement: p1.options[0]!.odds,
        potentialPayout: Math.floor(100 * p1.options[0]!.odds),
      },
    }),
    prisma.bet.create({
      data: {
        userId: bob.id,
        predictionId: p1.id,
        optionId: p1.options[1]!.id, // No
        amount: 200,
        oddsAtPlacement: p1.options[1]!.odds,
        potentialPayout: Math.floor(200 * p1.options[1]!.odds),
      },
    }),
    prisma.bet.create({
      data: {
        userId: alice.id,
        predictionId: p2.id,
        optionId: p2.options[0]!.id, // Yes
        amount: 150,
        oddsAtPlacement: p2.options[0]!.odds,
        potentialPayout: Math.floor(150 * p2.options[0]!.odds),
      },
    }),
  ]);

  console.log('🎰 Creating a sample parlay for Alice…');
  // deduct her balance for the parlay
  const parlayAmount = 50;
  const updatedAlice = await prisma.user.update({
    where: { id: alice.id },
    data: { muskBucks: { decrement: parlayAmount } },
  });
  // record transaction
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
      balanceAfter: updatedAlice.muskBucks,
      relatedBetId: null,
      relatedParlayId: parlay.id,
    },
  });

  console.log('🏅 Seeding badges + follows…');
  const [firstBet, bigSpender] = await Promise.all([
    prisma.badge.upsert({
      where: { name: 'First Bet' },
      create: {
        name: 'First Bet',
        description: 'Placed your first bet',
        iconUrl: 'https://example.com/icons/first-bet.png',
      },
      update: {},
    }),
    prisma.badge.upsert({
      where: { name: 'Big Spender' },
      create: {
        name: 'Big Spender',
        description: 'Bet over 1000 MuskBucks at once',
        iconUrl: 'https://example.com/icons/big-spender.png',
      },
      update: {},
    }),
  ]);
  await prisma.userBadge.createMany({
    data: [{ userId: alice.id, badgeId: firstBet.id }],
    skipDuplicates: true,
  });
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: bob.id, followingId: alice.id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Done seeding.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
