#!/usr/bin/env node
// scripts/load-tests/tests/achievement-verification.js
// Verifies that achievements are still unlocking correctly after migration
//
// This test ensures that moving achievement processing to a separate server
// doesn't break the achievement unlock functionality

const { getOrCreateTestUser } = require('../helpers/auth.cjs');
const { getActivePredictions, placeRandomBet, getUserAchievements } = require('../helpers/testData.cjs');

async function runAchievementVerificationTest(options = {}) {
  const { numBets = 10, waitTime = 5000 } = options;

  console.log('\n🏆 ACHIEVEMENT VERIFICATION TEST');
  console.log('═'.repeat(80));
  console.log(`  Bets to place:       ${numBets}`);
  console.log(`  Wait time:           ${waitTime}ms (for async processing)`);
  console.log('═'.repeat(80));
  console.log('');

  try {
    // Step 1: Create a fresh test user
    console.log('📝 Creating test user...');
    const username = `achievetest_${Date.now()}`;
    const auth = await getOrCreateTestUser(username);
    console.log(`✅ Created user: ${auth.username} (ID: ${auth.userId})\n`);

    // Step 2: Check initial achievements
    console.log('📊 Checking initial achievements...');
    const initialAchievements = await getUserAchievements(auth.accessToken, auth.userId);
    const initialUnlocked = initialAchievements.filter((a) => a.unlockedAt).length;
    console.log(`  Initial unlocked achievements: ${initialUnlocked}\n`);

    // Step 3: Get active predictions
    console.log('📊 Fetching active predictions...');
    const predictions = await getActivePredictions(auth.accessToken, 20);
    console.log(`✅ Found ${predictions.length} active predictions\n`);

    if (predictions.length === 0) {
      throw new Error('No active predictions available! Please create some predictions first.');
    }

    // Step 4: Place bets to trigger achievements
    console.log(`🎯 Placing ${numBets} bets to trigger achievements...`);
    const betResults = [];

    for (let i = 0; i < numBets; i++) {
      const result = await placeRandomBet(auth.accessToken, predictions);
      betResults.push(result);
      process.stdout.write(`\r  Placed ${i + 1}/${numBets} bets`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successfulBets = betResults.filter((r) => r.success).length;
    console.log(`\n✅ Successfully placed ${successfulBets}/${numBets} bets\n`);

    // Step 5: Wait for achievement processing
    console.log(`⏳ Waiting ${waitTime}ms for achievement server to process...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    console.log('');

    // Step 6: Check final achievements
    console.log('📊 Checking final achievements...');
    const finalAchievements = await getUserAchievements(auth.accessToken, auth.userId);
    const finalUnlocked = finalAchievements.filter((a) => a.unlockedAt).length;
    const newlyUnlocked = finalUnlocked - initialUnlocked;

    console.log(`  Final unlocked achievements: ${finalUnlocked}`);
    console.log(`  Newly unlocked: ${newlyUnlocked}\n`);

    // Show newly unlocked achievements
    if (newlyUnlocked > 0) {
      console.log('🎉 NEWLY UNLOCKED ACHIEVEMENTS:\n');
      finalAchievements
        .filter((a) => a.unlockedAt)
        .filter((a) => !initialAchievements.find((ia) => ia.id === a.id && ia.unlockedAt))
        .forEach((achievement) => {
          console.log(`  ✨ ${achievement.name}`);
          console.log(`     ${achievement.description}`);
          console.log(`     Category: ${achievement.category}`);
          console.log('');
        });
    }

    // Assessment
    console.log('═'.repeat(80));
    console.log('\n📈 VERIFICATION RESULT:\n');

    if (newlyUnlocked > 0) {
      console.log('  ✅ SUCCESS: Achievements are unlocking correctly!');
      console.log(`     ${newlyUnlocked} achievement(s) unlocked after ${successfulBets} bets`);
      console.log('     Achievement server is processing events properly.');
    } else if (successfulBets > 0) {
      console.log('  ⚠️  WARNING: No achievements unlocked');
      console.log('     Possible reasons:');
      console.log('     - User may already have first-bet achievements');
      console.log('     - Achievement server may not be running');
      console.log('     - Redis events may not be reaching achievement server');
      console.log('     - Achievement processing may have failed');
    } else {
      console.log('  ❌ ERROR: No bets were successfully placed');
      console.log('     Cannot verify achievement functionality');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    return {
      success: newlyUnlocked > 0 || initialUnlocked > 0,
      initialUnlocked,
      finalUnlocked,
      newlyUnlocked,
      betsPlaced: successfulBets,
      userId: auth.userId,
      username: auth.username,
    };
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key === '--bets') options.numBets = parseInt(value, 10);
    if (key === '--wait') options.waitTime = parseInt(value, 10);
  });

  runAchievementVerificationTest(options)
    .then((result) => {
      console.log('✅ Verification test completed');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Verification test failed:', error);
      process.exit(1);
    });
}

module.exports = { runAchievementVerificationTest };
