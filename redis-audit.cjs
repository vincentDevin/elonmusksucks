#!/usr/bin/env node
/**
 * Redis Cache Audit and Cleanup Script
 * Audits all Redis keys and cleans out data that doesn't match current event naming conventions
 */

const Redis = require('ioredis');

// Current valid event naming conventions
const VALID_PATTERNS = [
  // Core domain events (present tense with colons)
  /^prediction:(create|resolve)$/,
  /^bet:(place|status_change)$/,
  /^parlay:(place|status_change)$/,
  /^odds:update:(enhanced|basic)$/,
  
  // Stats and user events
  /^stats:(update|refresh)$/,
  /^ranking:change$/,
  /^achievement:unlocked$/,
  /^user:(stats_update|activity)$/,
  
  // Admin events
  /^admin:metrics:update$/,
  
  // Leaderboard events
  /^leaderboard:(allTime|daily|rankChange|milestone)$/,
  
  // Activity system (unified only)
  /^unified:activity:(global|update)$/,
  
  // Moderation events
  /^moderation:(userBan|userUnban|userMute|userKick|messageDelete|postDelete)$/,
  
  // Chat events
  /^chat:(message|typing|stopTyping|usersOnline|history|error)$/,
  
  // Application data keys (non-event)
  /^user:/,
  /^session:/,
  /^cache:/,
  /^temp:/,
  /^lock:/,
  /^queue:/,
  /^unified:activity:recent$/,
  
  // BullMQ job queue keys (legitimate)
  /^bull:.+$/,
  
  // Leaderboard caching keys
  /^leaderboard:(last_refresh|stats|cache)$/,
  
  // Global chat state
  /^global:chat:/,
];

// Deprecated patterns to remove
const DEPRECATED_PATTERNS = [
  // Old camelCase events
  /^(userStatsUpdate|achievementUnlocked|betPlaced|parlayPlaced)$/,
  
  // Old activity system
  /^activity:(newsflash|personal|global)$/,
  /^activity:newsflash:normalized$/,
  
  // Trading subscription remnants
  /^trading:/,
  
  // User-specific channels (replaced with rooms)
  /^bet:status_change:\d+$/,
  /^parlay:status_change:\d+$/,
  /^unified:activity:user:\d+$/,
  
  // Old stats patterns
  /^userStats:/,
  /^rankingUpdate:/,
];

async function connectToRedis() {
  console.log('🔌 Connecting to Redis at 127.0.0.1:6379...\n');
  
  const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });
  
  redis.on('connect', () => {
    console.log('✅ Connected to Redis successfully\n');
  });
  
  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
    process.exit(1);
  });
  
  return redis;
}

function isValidKey(key) {
  // Check if key matches any valid pattern
  return VALID_PATTERNS.some(pattern => pattern.test(key));
}

function isDeprecatedKey(key) {
  // Check if key matches any deprecated pattern
  return DEPRECATED_PATTERNS.some(pattern => pattern.test(key));
}

function getKeyCategory(key) {
  if (key.startsWith('user:')) return 'User Data';
  if (key.startsWith('session:')) return 'Session Data';
  if (key.startsWith('cache:')) return 'Cache Data';
  if (key.startsWith('queue:')) return 'Job Queue';
  if (key.includes(':')) {
    const [prefix] = key.split(':');
    return `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Events`;
  }
  return 'Uncategorized';
}

async function auditRedisKeys(redis) {
  console.log('🔍 Scanning all Redis keys...\n');
  
  // Get all keys
  const keys = await redis.keys('*');
  console.log(`Found ${keys.length} total keys in Redis\n`);
  
  if (keys.length === 0) {
    console.log('✨ Redis is empty - nothing to audit');
    return { valid: [], deprecated: [], unknown: [] };
  }
  
  // Categorize keys
  const valid = [];
  const deprecated = [];
  const unknown = [];
  
  const categories = {};
  
  for (const key of keys) {
    const category = getKeyCategory(key);
    if (!categories[category]) categories[category] = [];
    categories[category].push(key);
    
    if (isDeprecatedKey(key)) {
      deprecated.push(key);
    } else if (isValidKey(key)) {
      valid.push(key);
    } else {
      unknown.push(key);
    }
  }
  
  // Display categorized results
  console.log('📊 Keys by Category:');
  console.log('===================');
  Object.entries(categories).forEach(([category, categoryKeys]) => {
    console.log(`\n${category}: ${categoryKeys.length} keys`);
    categoryKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    if (categoryKeys.length > 5) {
      console.log(`  ... and ${categoryKeys.length - 5} more`);
    }
  });
  
  console.log('\n📋 Audit Results:');
  console.log('==================');
  console.log(`✅ Valid keys: ${valid.length}`);
  console.log(`🚨 Deprecated keys: ${deprecated.length}`);
  console.log(`❓ Unknown keys: ${unknown.length}`);
  
  return { valid, deprecated, unknown, categories };
}

async function inspectSampleKeys(redis, keys, label) {
  if (keys.length === 0) return;
  
  console.log(`\n🔬 Inspecting ${label} (showing up to 5 samples):`);
  console.log('='.repeat(50));
  
  for (let i = 0; i < Math.min(5, keys.length); i++) {
    const key = keys[i];
    try {
      const type = await redis.type(key);
      let value = '';
      
      switch (type) {
        case 'string':
          const str = await redis.get(key);
          value = str.length > 100 ? str.substring(0, 97) + '...' : str;
          break;
        case 'list':
          const listLen = await redis.llen(key);
          value = `List with ${listLen} items`;
          if (listLen > 0) {
            const sample = await redis.lrange(key, 0, 0);
            if (sample[0]) {
              const sampleStr = sample[0].length > 50 ? sample[0].substring(0, 47) + '...' : sample[0];
              value += ` (sample: ${sampleStr})`;
            }
          }
          break;
        case 'set':
          const setLen = await redis.scard(key);
          value = `Set with ${setLen} members`;
          break;
        case 'hash':
          const hashLen = await redis.hlen(key);
          value = `Hash with ${hashLen} fields`;
          break;
        case 'zset':
          const zsetLen = await redis.zcard(key);
          value = `Sorted set with ${zsetLen} members`;
          break;
        default:
          value = `${type} type`;
      }
      
      console.log(`\n🔑 ${key} (${type})`);
      console.log(`   ${value}`);
      
      // Try to get TTL
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        console.log(`   ⏰ Expires in ${ttl} seconds`);
      } else if (ttl === 0) {
        console.log(`   ⏰ Expired`);
      } else {
        console.log(`   ♾️  No expiration`);
      }
      
    } catch (error) {
      console.log(`\n🔑 ${key} - Error inspecting: ${error.message}`);
    }
  }
}

async function cleanDeprecatedKeys(redis, deprecatedKeys) {
  if (deprecatedKeys.length === 0) {
    console.log('\n✨ No deprecated keys to clean');
    return 0;
  }
  
  console.log(`\n🧹 Cleaning ${deprecatedKeys.length} deprecated keys...`);
  
  let deletedCount = 0;
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < deprecatedKeys.length; i += BATCH_SIZE) {
    const batch = deprecatedKeys.slice(i, i + BATCH_SIZE);
    
    try {
      const deleted = await redis.del(...batch);
      deletedCount += deleted;
      console.log(`   Deleted batch ${Math.floor(i/BATCH_SIZE) + 1}: ${deleted}/${batch.length} keys`);
      
      // Show which keys were deleted
      batch.forEach(key => console.log(`     - ${key}`));
      
    } catch (error) {
      console.error(`   Error deleting batch: ${error.message}`);
      // Try individual deletion
      for (const key of batch) {
        try {
          await redis.del(key);
          deletedCount++;
          console.log(`     - ${key} (individual delete)`);
        } catch (err) {
          console.error(`     ❌ Failed to delete ${key}: ${err.message}`);
        }
      }
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < deprecatedKeys.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n✅ Cleanup complete: ${deletedCount} keys deleted`);
  return deletedCount;
}

async function generateReport(redis, auditResults) {
  const { valid, deprecated, unknown } = auditResults;
  const info = await redis.info('memory');
  const memoryUsage = info.split('\r\n').find(line => line.startsWith('used_memory_human:'));
  
  console.log('\n📄 Final Audit Report');
  console.log('======================');
  console.log(`Redis Memory Usage: ${memoryUsage ? memoryUsage.split(':')[1] : 'Unknown'}`);
  console.log(`Total Keys After Cleanup: ${valid.length + unknown.length}`);
  console.log(`Valid Event Keys: ${valid.length}`);
  console.log(`Unknown Keys (may need manual review): ${unknown.length}`);
  console.log(`Deprecated Keys Removed: ${deprecated.length}`);
  
  if (unknown.length > 0) {
    console.log('\n⚠️  Unknown keys that may need manual review:');
    unknown.slice(0, 10).forEach(key => console.log(`   - ${key}`));
    if (unknown.length > 10) {
      console.log(`   ... and ${unknown.length - 10} more`);
    }
  }
  
  console.log('\n🎉 Redis audit and cleanup complete!');
  console.log('\nRecommendations:');
  console.log('- Monitor Redis memory usage regularly');
  console.log('- Set appropriate TTLs for temporary data');
  console.log('- Consider implementing key naming standards');
  if (unknown.length > 0) {
    console.log('- Review unknown keys to determine if they should be kept or cleaned');
  }
}

async function main() {
  console.log('🚀 Redis Cache Audit & Cleanup');
  console.log('===============================\n');
  
  const redis = await connectToRedis();
  
  try {
    // Audit all keys
    const auditResults = await auditRedisKeys(redis);
    
    // Inspect samples of each category
    await inspectSampleKeys(redis, auditResults.deprecated, 'Deprecated Keys');
    await inspectSampleKeys(redis, auditResults.unknown, 'Unknown Keys');
    
    // Ask for confirmation before cleanup
    if (auditResults.deprecated.length > 0) {
      console.log(`\n⚠️  Found ${auditResults.deprecated.length} deprecated keys that should be removed.`);
      
      if (process.argv.includes('--auto-clean')) {
        await cleanDeprecatedKeys(redis, auditResults.deprecated);
      } else {
        console.log('\nTo automatically clean deprecated keys, run with --auto-clean flag');
        console.log('Example: node redis-audit.js --auto-clean');
      }
    }
    
    // Generate final report
    await generateReport(redis, auditResults);
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}