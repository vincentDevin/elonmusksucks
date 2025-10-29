#!/usr/bin/env tsx
// apps/server/src/scripts/setup-redis-security.ts
// -----------------------------------------------------------------------------
// Script to set up Redis security configuration
// Run with: npx tsx src/scripts/setup-redis-security.ts
// -----------------------------------------------------------------------------

import 'dotenv/config';
import redisClient from '../lib/redis';
import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

async function generateSecurePasswords() {
  console.log('🔑 Generating secure passwords...');

  const passwords = {
    requirepass: randomBytes(32).toString('base64'),
    app_user: randomBytes(24).toString('base64'),
    readonly_user: randomBytes(20).toString('base64'),
    admin_user: randomBytes(32).toString('base64'),
    worker_user: randomBytes(24).toString('base64'),
    monitor_user: randomBytes(20).toString('base64'),
  };

  console.log('Generated passwords:');
  Object.entries(passwords).forEach(([user, password]) => {
    console.log(`${user}: ${password}`);
  });

  return passwords;
}

async function updateConfigFiles(passwords: Record<string, string>) {
  console.log('\n📝 Updating configuration files...');

  const configDir = join(__dirname, '../config');

  // Update Redis security config
  const securityConfigPath = join(configDir, 'redis-security.conf');
  let securityConfig = readFileSync(securityConfigPath, 'utf8');
  securityConfig = securityConfig.replace(
    'requirepass your_strong_redis_password_here',
    `requirepass ${passwords.requirepass}`,
  );
  writeFileSync(securityConfigPath, securityConfig);

  // Update ACL file
  const aclPath = join(configDir, 'redis-users.acl');
  let aclConfig = readFileSync(aclPath, 'utf8');

  aclConfig = aclConfig.replace('app_strong_password_here', passwords.app_user);
  aclConfig = aclConfig.replace('readonly_password_here', passwords.readonly_user);
  aclConfig = aclConfig.replace('admin_strong_password_here', passwords.admin_user);
  aclConfig = aclConfig.replace('worker_password_here', passwords.worker_user);
  aclConfig = aclConfig.replace('monitor_password_here', passwords.monitor_user);

  writeFileSync(aclPath, aclConfig);

  console.log('✅ Configuration files updated');
}

async function generateEnvTemplate(passwords: Record<string, string>) {
  console.log('\n📄 Generating environment template...');

  const envTemplate = `
# Redis Security Configuration
# Copy these values to your .env file and restart Redis with security config

# Primary Redis connection (app_user)
REDIS_PASSWORD=${passwords.app_user}
REDIS_USERNAME=app_user

# Alternative Redis URLs for different roles
REDIS_URL_READONLY=redis://readonly_user:${passwords.readonly_user}@127.0.0.1:6379
REDIS_URL_WORKER=redis://worker_user:${passwords.worker_user}@127.0.0.1:6379
REDIS_URL_ADMIN=redis://admin_user:${passwords.admin_user}@127.0.0.1:6379
REDIS_URL_MONITOR=redis://monitor_user:${passwords.monitor_user}@127.0.0.1:6379

# For production, use the full Redis URL with authentication:
# REDIS_URL=redis://app_user:${passwords.app_user}@127.0.0.1:6379
`;

  const templatePath = join(__dirname, '../config/redis-env-template.txt');
  writeFileSync(templatePath, envTemplate.trim());

  console.log(`📄 Environment template saved to: ${templatePath}`);
}

async function checkCurrentRedisConnection() {
  console.log('\n🔍 Checking current Redis connection...');

  try {
    const pong = await redisClient.ping();
    console.log(`✅ Redis connection: ${pong}`);

    const info = await redisClient.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`📊 Redis version: ${version}`);

    // Check if authentication is already enabled
    try {
      await redisClient.config('GET', 'requirepass');
      console.log('⚠️  Authentication may already be configured');
    } catch (error) {
      console.log('ℹ️  No authentication currently configured');
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🔒 Setting up Redis security configuration...\n');

  try {
    // Check current connection
    await checkCurrentRedisConnection();

    // Generate secure passwords
    const passwords = await generateSecurePasswords();

    // Update config files
    await updateConfigFiles(passwords);

    // Generate .env template
    await generateEnvTemplate(passwords);

    console.log('\n✅ Redis security setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy values from redis-env-template.txt to your .env file');
    console.log('2. Stop Redis server');
    console.log('3. Start Redis with security config:');
    console.log('   redis-server src/config/redis-security.conf');
    console.log('4. Update your application to use REDIS_USERNAME and REDIS_PASSWORD');
    console.log('5. Test connection with new credentials');
  } catch (error) {
    console.error('❌ Redis security setup failed:', error);
    process.exit(1);
  } finally {
    await redisClient.quit();
    process.exit(0);
  }
}

main().catch(console.error);
