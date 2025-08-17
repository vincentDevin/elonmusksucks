#!/usr/bin/env node
// Script to create 10 diverse test predictions for development
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get a random user to be the prediction creator (not admin)
async function getRandomUser() {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, name: true }
  });
  
  if (users.length === 0) {
    // Create a test user if none exist
    const testUser = await prisma.user.create({
      data: {
        email: `testuser${Date.now()}@example.com`,
        name: `TestUser_${Date.now()}`,
        passwordHash: 'dummy_hash',
        role: 'USER',
        muskBucks: 1000
      }
    });
    return testUser;
  }
  
  return users[Math.floor(Math.random() * users.length)];
}

// Prediction templates with variety
const predictionTemplates = [
  {
    title: "Tesla Stock Price by End of Month",
    description: "Will Tesla's stock (TSLA) close above $250 by the end of this month? Current market conditions and Elon's latest tweets suggest significant volatility ahead.",
    category: "Finance",
    type: "BINARY",
    options: [
      { label: "Yes, above $250", odds: 2.2 },
      { label: "No, $250 or below", odds: 1.8 }
    ],
    daysToExpire: 7
  },
  {
    title: "Next SpaceX Starship Test Flight",
    description: "When will SpaceX conduct the next Starship integrated flight test? With recent regulatory approvals and ongoing preparations, the timeline is heating up!",
    category: "Space",
    type: "MULTIPLE",
    options: [
      { label: "Within 2 weeks", odds: 4.5 },
      { label: "2-4 weeks", odds: 2.8 },
      { label: "1-2 months", odds: 2.1 },
      { label: "More than 2 months", odds: 3.2 }
    ],
    daysToExpire: 30
  },
  {
    title: "Twitter/X Daily Active Users",
    description: "Will X (formerly Twitter) reach 500 million daily active users by year end? Elon's controversial changes have been driving both growth and exodus.",
    category: "Social Media",
    type: "OVER_UNDER",
    threshold: 500,
    options: [
      { label: "Over 500M users", odds: 3.1 },
      { label: "Under 500M users", odds: 1.4 }
    ],
    daysToExpire: 90
  },
  {
    title: "Elon's Next Acquisition Target",
    description: "Which company will Elon Musk attempt to acquire next? His track record suggests he's always eyeing the next big disruption opportunity.",
    category: "Business",
    type: "MULTIPLE",
    options: [
      { label: "Wikipedia", odds: 8.5 },
      { label: "Discord", odds: 5.2 },
      { label: "Reddit", odds: 3.8 },
      { label: "TikTok", odds: 12.0 },
      { label: "None in next 6 months", odds: 1.9 }
    ],
    daysToExpire: 180
  },
  {
    title: "Cybertruck Production Numbers",
    description: "How many Cybertrucks will Tesla produce in the first quarter of full production? Manufacturing ramp-up has been slower than promised, but demand remains sky-high.",
    category: "Automotive",
    type: "MULTIPLE",
    options: [
      { label: "Less than 10,000", odds: 3.2 },
      { label: "10,000 - 25,000", odds: 2.4 },
      { label: "25,000 - 50,000", odds: 2.8 },
      { label: "More than 50,000", odds: 4.1 }
    ],
    daysToExpire: 45
  },
  {
    title: "Neuralink Human Trial Success",
    description: "Will Neuralink announce successful motor control restoration in their first human patient by end of year? The brain-computer interface race is accelerating.",
    category: "Technology",
    type: "BINARY",
    options: [
      { label: "Yes, successful restoration", odds: 2.7 },
      { label: "No major breakthrough", odds: 1.5 }
    ],
    daysToExpire: 120
  },
  {
    title: "Dogecoin Price Pump",
    description: "Will Dogecoin reach $1.00 following Elon's next major endorsement? His meme coin influence remains unmatched, but crypto markets are unpredictable.",
    category: "Cryptocurrency",
    type: "OVER_UNDER",
    threshold: 1.0,
    options: [
      { label: "Over $1.00", odds: 6.8 },
      { label: "Under $1.00", odds: 1.15 }
    ],
    daysToExpire: 14
  },
  {
    title: "Mars Mission Timeline Update",
    description: "Will SpaceX announce a revised timeline for the first crewed Mars mission? Recent Starship progress suggests major updates to the ambitious 2026 target.",
    category: "Space",
    type: "MULTIPLE",
    options: [
      { label: "Still targeting 2026", odds: 5.5 },
      { label: "Pushed to 2028", odds: 2.3 },
      { label: "Pushed to 2030+", odds: 3.8 },
      { label: "Moved up to 2025", odds: 15.0 }
    ],
    daysToExpire: 60
  },
  {
    title: "AI Model GPT Competitor",
    description: "Will X.AI's Grok model surpass GPT-4 in at least one major benchmark within the next quarter? The AI arms race is intensifying with massive compute investments.",
    category: "Artificial Intelligence",
    type: "BINARY",
    options: [
      { label: "Yes, Grok wins a benchmark", odds: 4.2 },
      { label: "No, GPT maintains lead", odds: 1.3 }
    ],
    daysToExpire: 90
  },
  {
    title: "Hyperloop Project Revival",
    description: "Will any Hyperloop project achieve passenger service speeds over 400mph in a commercial route? Multiple companies are racing to make Elon's vision reality.",
    category: "Transportation",
    type: "OVER_UNDER",
    threshold: 400,
    options: [
      { label: "Over 400mph achieved", odds: 7.2 },
      { label: "Under 400mph", odds: 1.12 }
    ],
    daysToExpire: 200
  }
];

async function createTestPredictions() {
  console.log('🚀 Creating 10 diverse test predictions...\n');
  
  const creator = await getRandomUser();
  console.log(`📝 Using creator: ${creator.name} (ID: ${creator.id})\n`);
  
  const results = [];
  
  for (let i = 0; i < predictionTemplates.length; i++) {
    const template = predictionTemplates[i];
    
    try {
      // Create the prediction (starts as unapproved)
      const prediction = await prisma.prediction.create({
        data: {
          title: template.title,
          description: template.description,
          category: template.category,
          type: template.type,
          threshold: template.threshold || null,
          expiresAt: new Date(Date.now() + template.daysToExpire * 24 * 60 * 60 * 1000),
          resolved: false,
          approved: false, // Starts in pending queue
          creatorId: creator.id,
          options: {
            create: template.options.map(option => ({
              label: option.label,
              odds: option.odds
            }))
          }
        },
        include: {
          options: true
        }
      });
      
      console.log(`✅ Created: "${prediction.title}"`);
      console.log(`   Category: ${prediction.category} | Type: ${prediction.type}`);
      console.log(`   Expires: ${prediction.expiresAt.toLocaleDateString()}`);
      console.log(`   Options: ${prediction.options.length}`);
      
      if (prediction.options.length <= 2) {
        console.log(`   ${prediction.options.map(o => `${o.label} (${o.odds}x)`).join(' | ')}`);
      } else {
        console.log(`   ${prediction.options.slice(0, 2).map(o => `${o.label} (${o.odds}x)`).join(' | ')} + ${prediction.options.length - 2} more`);
      }
      
      console.log('');
      results.push(prediction);
      
    } catch (error) {
      console.error(`❌ Failed to create "${template.title}":`, error.message);
    }
  }
  
  console.log(`\n🎉 Successfully created ${results.length} test predictions!`);
  console.log('\n📋 Summary by category:');
  
  const categories = {};
  results.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} prediction${count !== 1 ? 's' : ''}`);
  });
  
  console.log('\n⚠️  Note: All predictions start as UNAPPROVED and need admin approval');
  console.log('   Go to the admin dashboard to approve them for betting!');
  
  return results;
}

// Run the script
createTestPredictions()
  .catch(error => {
    console.error('💥 Script failed:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });