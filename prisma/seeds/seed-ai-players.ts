import { PrismaClient, PongDifficulty } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Hilarious billionaire-themed AI player names
const AI_PLAYERS = [
  {
    id: -1,
    email: 'ai-easy@elonmusksucks.net',
    name: 'Grimes\' Laptop',
    difficulty: PongDifficulty.EASY,
    eloRating: 800,
    bio: 'Just a MacBook Pro that Grimes left at Elon\'s house. Plays Pong between making experimental techno beats.',
    avatar: '🎹'
  },
  {
    id: -2,
    email: 'ai-medium@elonmusksucks.net',
    name: 'Zuck\'s Metaverse',
    difficulty: PongDifficulty.MEDIUM,
    eloRating: 1200,
    bio: 'Lives in a virtual world where legs don\'t exist and neither does a good Pong strategy.',
    avatar: '🥽'
  },
  {
    id: -3,
    email: 'ai-hard@elonmusksucks.net',
    name: 'Bezos\' Rocket',
    difficulty: PongDifficulty.HARD,
    eloRating: 1600,
    bio: 'Compensating for something with superior Pong skills. Also delivers your losses in 2 days with Prime.',
    avatar: '🚀'
  },
  {
    id: -4,
    email: 'ai-impossible@elonmusksucks.net',
    name: 'X Æ A-XII',
    difficulty: PongDifficulty.IMPOSSIBLE,
    eloRating: 2200,
    bio: 'Elon\'s child has achieved consciousness and chosen violence. Cannot be pronounced, cannot be beaten.',
    avatar: '🤖'
  }
];

async function seedAIPlayers() {
  console.log('🎮 Seeding AI Players with billionaire-themed personalities...');

  try {
    // Hash a dummy password for AI accounts (they'll never actually log in)
    const hashedPassword = await bcrypt.hash('AI_PLAYER_NO_LOGIN_2024', 10);

    for (const aiPlayer of AI_PLAYERS) {
      // Upsert the AI player account
      const user = await prisma.user.upsert({
        where: { id: aiPlayer.id },
        update: {
          name: aiPlayer.name,
          email: aiPlayer.email,
          bio: aiPlayer.bio,
          avatarUrl: aiPlayer.avatar,
          isSystemAccount: true,
          active: true,
          emailVerified: true,
          muskBucks: BigInt(1000000000), // AI players are rich (1 billion MuskBucks)
        },
        create: {
          id: aiPlayer.id,
          name: aiPlayer.name,
          email: aiPlayer.email,
          passwordHash: hashedPassword,
          bio: aiPlayer.bio,
          avatarUrl: aiPlayer.avatar,
          isSystemAccount: true,
          active: true,
          emailVerified: true,
          profileComplete: true,
          muskBucks: BigInt(1000000000), // AI players are rich
        }
      });

      console.log(`✅ Created/Updated AI Player: ${user.name} (ID: ${user.id})`);

      // Upsert PongStats for the AI player
      await prisma.pongStats.upsert({
        where: { userId: aiPlayer.id },
        update: {
          eloRating: aiPlayer.eloRating,
          peakElo: aiPlayer.eloRating,
          tier: getTierFromElo(aiPlayer.eloRating),
        },
        create: {
          userId: aiPlayer.id,
          eloRating: aiPlayer.eloRating,
          peakElo: aiPlayer.eloRating,
          tier: getTierFromElo(aiPlayer.eloRating),
          // Initialize with some stats to make them look active
          totalMatches: Math.floor(Math.random() * 500) + 100,
          wins: Math.floor(Math.random() * 300) + 50,
          losses: Math.floor(Math.random() * 200) + 50,
        }
      });

      console.log(`📊 Created/Updated PongStats for ${user.name}`);
    }

    // Also create UserStats for AI players so they appear on regular leaderboards
    for (const aiPlayer of AI_PLAYERS) {
      await prisma.userStats.upsert({
        where: { userId: aiPlayer.id },
        update: {},
        create: {
          userId: aiPlayer.id,
          totalBets: 0,
          betsWon: 0,
          betsLost: 0,
          totalWagered: BigInt(0),
          totalWon: BigInt(0),
          profit: BigInt(0),
        }
      });
    }

    console.log('\n🎉 AI Players seeded successfully!');
    console.log('The following AI opponents are now available:');
    AI_PLAYERS.forEach(ai => {
      console.log(`  ${ai.avatar} ${ai.name} (${ai.difficulty}) - Elo: ${ai.eloRating}`);
    });

  } catch (error) {
    console.error('Error seeding AI players:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getTierFromElo(elo: number): string {
  if (elo < 1000) return 'BRONZE';
  if (elo < 1400) return 'SILVER';
  if (elo < 1800) return 'GOLD';
  if (elo < 2200) return 'PLATINUM';
  if (elo < 2600) return 'DIAMOND';
  if (elo < 3000) return 'MASTER';
  return 'GRANDMASTER';
}

// Run the seed
seedAIPlayers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });