#!/usr/bin/env node
/**
 * Client-side socket listener test to verify all event handlers are properly configured
 * This script searches for socket.on() calls in client code and validates event names
 */

const fs = require('fs');
const path = require('path');

// Expected socket event listeners based on our backend implementation
const EXPECTED_EVENTS = [
  // Admin events
  'admin:metrics:update',
  
  // Stats events
  'stats:update',
  'stats:refresh', 
  'user:stats_update',
  'ranking:change',
  'achievement:unlocked',
  
  // Bet/Parlay status events
  'bet:status_change',
  'parlay:status_change',
  
  // Core events (should already exist)
  'predictionCreated',
  'predictionResolved',
  'betPlaced',
  'parlayPlaced',
  'unified:activity:update',
  
  // Connection events
  'connect',
  'disconnect',
  'error'
];

// Events that should NOT be emitted (removed anti-patterns)
const DEPRECATED_EVENTS = [
  'trading:subscribe',
  'userStatsUpdate', // Old camelCase format
  'achievementUnlocked', // Old camelCase format
];

function findSocketListeners(dir) {
  const results = {
    found: new Set(),
    deprecated: new Set(),
    files: []
  };
  
  function scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Find socket.on() calls
        const onMatch = line.match(/socket\.on\(['"`]([^'"`]+)['"`]/g);
        if (onMatch) {
          onMatch.forEach(match => {
            const event = match.match(/socket\.on\(['"`]([^'"`]+)['"`]/)[1];
            results.found.add(event);
            results.files.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              event,
              code: line.trim()
            });
          });
        }
        
        // Find socket.emit() calls for deprecated patterns
        const emitMatch = line.match(/socket\.emit\(['"`]([^'"`]+)['"`]/g);
        if (emitMatch) {
          emitMatch.forEach(match => {
            const event = match.match(/socket\.emit\(['"`]([^'"`]+)['"`]/)[1];
            if (DEPRECATED_EVENTS.includes(event)) {
              results.deprecated.add(event);
              results.files.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                event: `EMIT: ${event}`,
                code: line.trim(),
                deprecated: true
              });
            }
          });
        }
      });
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
    }
  }
  
  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          scanFile(fullPath);
        }
      });
    } catch (error) {
      console.error(`Error scanning ${dirPath}:`, error.message);
    }
  }
  
  scanDirectory(dir);
  return results;
}

function main() {
  console.log('🔍 Client Socket Listener Audit');
  console.log('================================\n');
  
  const srcDir = path.join(__dirname, 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found. Run this from the client directory.');
    process.exit(1);
  }
  
  const results = findSocketListeners(srcDir);
  
  console.log('📊 Socket Event Analysis:');
  console.log(`Found ${results.found.size} unique socket listeners\n`);
  
  // Check for expected events
  console.log('✅ Expected Events Found:');
  const foundExpected = EXPECTED_EVENTS.filter(event => results.found.has(event));
  foundExpected.forEach(event => {
    console.log(`  ✓ ${event}`);
  });
  
  console.log('\n❌ Missing Expected Events:');
  const missingExpected = EXPECTED_EVENTS.filter(event => !results.found.has(event));
  missingExpected.forEach(event => {
    console.log(`  ⚠️  ${event}`);
  });
  
  // Check for deprecated events
  if (results.deprecated.size > 0) {
    console.log('\n🚨 Deprecated Events Still Found:');
    Array.from(results.deprecated).forEach(event => {
      console.log(`  ❗ ${event} (should be removed)`);
    });
  } else {
    console.log('\n✅ No deprecated events found');
  }
  
  // Show unexpected events (not in our expected list)
  const unexpectedEvents = Array.from(results.found).filter(event => 
    !EXPECTED_EVENTS.includes(event) && !event.startsWith('connect') && !event.startsWith('disconnect')
  );
  
  if (unexpectedEvents.length > 0) {
    console.log('\n🤔 Unexpected Events Found:');
    unexpectedEvents.forEach(event => {
      console.log(`  ? ${event}`);
    });
  }
  
  // Detailed file breakdown
  if (process.argv.includes('--verbose')) {
    console.log('\n📁 Detailed File Breakdown:');
    results.files.forEach(item => {
      const status = item.deprecated ? '🚨' : '✅';
      console.log(`${status} ${item.file}:${item.line} - ${item.event}`);
      console.log(`    ${item.code}`);
    });
  }
  
  // Summary
  console.log('\n📋 Summary:');
  console.log(`  Total listeners found: ${results.found.size}`);
  console.log(`  Expected events covered: ${foundExpected.length}/${EXPECTED_EVENTS.length}`);
  console.log(`  Deprecated events found: ${results.deprecated.size}`);
  console.log(`  Files with socket code: ${new Set(results.files.map(f => f.file)).size}`);
  
  if (missingExpected.length === 0 && results.deprecated.size === 0) {
    console.log('\n🎉 All socket listeners properly configured!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Socket configuration needs attention.');
    console.log('Run with --verbose flag to see detailed file locations.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}