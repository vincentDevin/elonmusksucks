// apps/achievement-server/src/config/env.ts
// -----------------------------------------------------------------------------
// Environment Variable Validation - Achievement Server
// Minimal configuration - only needs database, redis, and basic settings
// -----------------------------------------------------------------------------

interface AchievementServerConfig {
  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;

  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
  LOG_LEVEL?: string;

  // Achievement Processing Configuration
  ACHIEVEMENT_CONCURRENCY?: number; // How many events to process concurrently
  ACHIEVEMENT_BATCH_SIZE?: number; // How many events to batch process
}

/**
 * Validate and parse environment variables on startup
 * Throws error if required variables are missing
 */
function validateEnvironment(): AchievementServerConfig {
  const errors: string[] = [];

  // Helper to get required env var
  const getRequired = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  };

  // Helper to get optional env var
  const getOptional = (key: string): string | undefined => {
    return process.env[key] || undefined;
  };

  // Helper to parse optional integer with default
  const getOptionalInt = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, test, or production`);
  }

  // Build config
  const config: AchievementServerConfig = {
    // Database - CRITICAL
    DATABASE_URL: getRequired('DATABASE_URL'),

    // Redis - CRITICAL (either REDIS_URL or REDIS_HOST/PORT)
    REDIS_URL: getOptional('REDIS_URL'),
    REDIS_HOST: getOptional('REDIS_HOST'),
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,

    // Server Configuration
    // Use ACHIEVEMENT_SERVER_PORT or fallback to 3001 (different from main server's 5000)
    PORT: getOptionalInt('ACHIEVEMENT_SERVER_PORT', 3001),
    NODE_ENV: nodeEnv as 'development' | 'test' | 'production',
    LOG_LEVEL: getOptional('LOG_LEVEL') || 'info',

    // Achievement Processing Configuration
    ACHIEVEMENT_CONCURRENCY: getOptionalInt('ACHIEVEMENT_CONCURRENCY', 5), // Process 5 events concurrently
    ACHIEVEMENT_BATCH_SIZE: getOptionalInt('ACHIEVEMENT_BATCH_SIZE', 10), // Batch up to 10 events
  };

  // Validate Redis configuration (must have either REDIS_URL or REDIS_HOST)
  if (!config.REDIS_URL && !config.REDIS_HOST) {
    errors.push('Missing Redis configuration: Must provide either REDIS_URL or REDIS_HOST');
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    // Ensure Redis uses TLS (rediss://)
    if (config.REDIS_URL && !config.REDIS_URL.startsWith('rediss://')) {
      console.warn('[env] WARNING: REDIS_URL should use TLS (rediss://) in production');
    }
  }

  // If any errors, throw and prevent startup
  if (errors.length > 0) {
    console.error('\n❌ ACHIEVEMENT SERVER ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.\n');
    throw new Error('Environment validation failed. See errors above.');
  }

  // Log successful validation
  console.log(`✅ Achievement Server environment validated (${config.NODE_ENV} mode)`);
  console.log(`   - Database: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(
    `   - Redis: ${config.REDIS_URL ? config.REDIS_URL.split('@')[1] || 'configured' : `${config.REDIS_HOST}:${config.REDIS_PORT}`}`,
  );
  console.log(`   - Server Port: ${config.PORT}`);
  console.log(`   - Log Level: ${config.LOG_LEVEL}`);
  console.log(`   - Achievement Concurrency: ${config.ACHIEVEMENT_CONCURRENCY}`);

  return config;
}

// Validate on module load (fail fast)
export const env = validateEnvironment();

// Export for convenience
export default env;
