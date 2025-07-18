// scripts/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, TransactionType, BetStatus } from '@prisma/client';
import { PayoutRepository } from '../apps/server/src/repositories/PayoutRepository';

const prisma = new PrismaClient();
const payoutRepo = new PayoutRepository();

async function clear<Model>(name: string, fn: () => Promise<Model>) {
  try {
    await fn();
    console.log(`🧹 Cleared ${name}`);
  } catch (err: any) {
    console.warn(`⚠️  Could not clear ${name}: ${err.message.split('\n')[0]}`);
  }
}

async function main() {
  console.log('🧹 Clearing out old data...');
  await clear('Transaction',      () => prisma.transaction.deleteMany());
  await clear('ParlayLeg',        () => prisma.parlayLeg.deleteMany());
  await clear('Parlay',           () => prisma.parlay.deleteMany());
  await clear('Bet',              () => prisma.bet.deleteMany());
  await clear('UserStats',        () => prisma.userStats.deleteMany());
  await clear('UserActivity',     () => prisma.userActivity.deleteMany());
  await clear('UserPost',         () => prisma.userPost.deleteMany());
  await clear('PredictionOption', () => prisma.predictionOption.deleteMany());
  await clear('Prediction',       () => prisma.prediction.deleteMany());
  await clear('UserBadge',        () => prisma.userBadge.deleteMany());
  await clear('Badge',            () => prisma.badge.deleteMany());
  await clear('Follow',           () => prisma.follow.deleteMany());

  console.log('👥 Creating users Alice, Bob, and Carol…');
  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({ where: { email: 'alice@example.com' }, update: {}, create: {
      email: 'alice@example.com', name: 'Alice', passwordHash: 'hash', emailVerified: true,
      bio: 'Space enthusiast', avatarUrl: 'https://i.pravatar.cc/150?img=1',
      location: 'Austin, TX', timezone: 'America/Chicago', muskBucks: 10000,
    }}),
    prisma.user.upsert({ where: { email: 'bob@example.com' }, update: {}, create: {
      email: 'bob@example.com', name: 'Bob', passwordHash: 'hash', emailVerified: true,
      bio: 'Rocket scientist', avatarUrl: 'https://i.pravatar.cc/150?img=2',
      location: 'Los Angeles, CA', timezone: 'America/Los_Angeles', muskBucks: 9500,
    }}),
    prisma.user.upsert({ where: { email: 'carol@example.com' }, update: {}, create: {
      email: 'carol@example.com', name: 'Carol', passwordHash: 'hash', emailVerified: true,
      bio: 'Crypto trader', avatarUrl: 'https://i.pravatar.cc/150?img=3',
      location: 'New York, NY', timezone: 'America/New_York', muskBucks: 8000,
    }}),
  ]);

  console.log('🏅 Badges and follows…');
  const [badgeFirstBet, badgeHighRoller] = await prisma.$transaction([
    prisma.badge.create({ data: { name: 'First Bet', description: 'Placed first bet', iconUrl: '' } }),
    prisma.badge.create({ data: { name: 'High Roller', description: 'Bet >1000', iconUrl: '' } }),
  ]);
  await prisma.userBadge.createMany({ data: [
    { userId: alice.id, badgeId: badgeFirstBet.id, awardedAt: new Date() },
    { userId: bob.id,   badgeId: badgeFirstBet.id, awardedAt: new Date() },
  ], skipDuplicates: true });
  await prisma.follow.createMany({ data: [
    { followerId: alice.id, followingId: bob.id },
    { followerId: bob.id,   followingId: alice.id },
  ], skipDuplicates: true });

  console.log('📝 Seeding predictions + options…');
  const pMultiple = await prisma.prediction.create({ data: {
    title: 'Next SpaceX mission?', description: '', category: 'SpaceX', type: 'MULTIPLE', threshold: null,
    expiresAt: new Date(Date.now() + 7*24*3600e3), creatorId: alice.id,
    options: { create: [
      { label: 'Starlink', odds: 2.0 },
      { label: 'Crew Dragon', odds: 3.5 },
      { label: 'GPS III', odds: 5.0 },
      { label: 'X-37B', odds: 8.0 },
    ]},
  }, include: { options: true }});
  const pBinary = await prisma.prediction.create({ data: {
    title: 'Elon on Mars by 2025?', description: '', category: 'Space', type: 'BINARY', threshold: null,
    expiresAt: new Date('2026-01-01'), creatorId: bob.id,
    options: { create: [ { label: 'Yes', odds: 3.0 }, { label: 'No', odds: 1.2 } ] },
  }, include: { options: true }});
  const threshold = 100;
  const pOU = await prisma.prediction.create({ data: {
    title: 'TSLA over/under $100', description: '', category: 'Stocks', type: 'OVER_UNDER', threshold,
    expiresAt: new Date(Date.now() + 3*24*3600e3), creatorId: carol.id,
    options: { create: [
      { label: `Over ${threshold}`, odds: 1.8 },
      { label: `Under ${threshold}`, odds: 1.8 },
    ]},
  }, include: { options: true }});

  console.log('🎲 Placing bets + parlays…');
  await prisma.bet.create({ data: {
    userId: alice.id, predictionId: pMultiple.id, optionId: pMultiple.options[0].id,
    amount: 150, oddsAtPlacement: pMultiple.options[0].odds,
    potentialPayout: Math.floor(150*pMultiple.options[0].odds), status: BetStatus.PENDING,
  }});
  const parlayBob = await prisma.parlay.create({ data: {
    userId: bob.id, amount: 200,
    combinedOdds: pMultiple.options[1].odds * pBinary.options[1].odds,
    potentialPayout: Math.floor(200 * pMultiple.options[1].odds * pBinary.options[1].odds),
    legs: { create: [
      { optionId: pMultiple.options[1].id, oddsAtPlacement: pMultiple.options[1].odds },
      { optionId: pBinary.options[1].id, oddsAtPlacement: pBinary.options[1].odds },
    ]},
  }});
  await prisma.transaction.create({ data: {
    userId: bob.id, type: TransactionType.DEBIT, amount: 200, balanceAfter: bob.muskBucks - 200,
    relatedParlayId: parlayBob.id,
  }});
  await prisma.bet.create({ data: {
    userId: carol.id, predictionId: pOU.id, optionId: pOU.options[0].id,
    amount: 300, oddsAtPlacement: pOU.options[0].odds,
    potentialPayout: Math.floor(300*pOU.options[0].odds), status: BetStatus.PENDING,
  }});

  console.log('🗂️ Seeding user posts + activity…');
  const alicePost = await prisma.userPost.create({ data: {
    authorId: alice.id, ownerId: alice.id, content: 'Hello world! Alice here.'
  }});
  const bobComment = await prisma.userPost.create({ data: {
    authorId: bob.id, ownerId: alice.id, content: 'Nice post, Alice!', parentId: alicePost.id
  }});
  const carolReply = await prisma.userPost.create({ data: {
    authorId: carol.id, ownerId: bob.id, content: 'I agree!', parentId: bobComment.id
  }});
  await prisma.userActivity.create({ data: { userId: alice.id,   type: 'POST_CREATED',   details: { postId: alicePost.id } }});
  await prisma.userActivity.create({ data: { userId: bob.id,     type: 'COMMENT_CREATED',details: { postId: bobComment.id } }});
  await prisma.userActivity.create({ data: { userId: carol.id,   type: 'COMMENT_CREATED',details: { postId: carolReply.id } }});

  console.log('🔔 Resolving predictions…');
  await payoutRepo.resolvePrediction(pMultiple.id, pMultiple.options[0].id);
  await payoutRepo.resolvePrediction(pBinary.id, pBinary.options[1].id);
  await payoutRepo.resolvePrediction(pOU.id, pOU.options[0].id);

  console.log('🔄 Refreshing leaderboard_view...');
  await prisma.$executeRaw`REFRESH MATERIALIZED VIEW leaderboard_view`;

  console.log('✅ Seeding complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
