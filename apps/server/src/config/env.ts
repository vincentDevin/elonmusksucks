// apps/server/src/config/env.ts
// -----------------------------------------------------------------------------
// Environment Variable Validation - Fail Fast on Missing Required Variables
// -----------------------------------------------------------------------------

interface EnvironmentConfig {
  // Authentication
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  BCRYPT_SALT_ROUNDS: number;

  // Database
  DATABASE_URL: string;

  // Redis
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;

  // Application URLs
  CLIENT_APP_URL: string;
  BASE_URL_CLIENT: string;
  BASE_URL_SERVER: string;
  BASE_URL_PUBLIC: string;
  API_BASE_URL: string;

  // Storage (Tigris S3)
  TIGRIS_S3_ENDPOINT: string;
  TIGRIS_ACCESS_KEY_ID: string;
  TIGRIS_SECRET_ACCESS_KEY: string;
  TIGRIS_S3_BUCKET: string;

  // Game Server
  GAME_SERVER_SECRET: string;

  // Optional Email
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  SKIP_EMAIL_FLOW?: boolean;

  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';

  // Worker Concurrency (optional with defaults)
  WORKER_PAYOUT_CONCURRENCY?: number;
  WORKER_PONG_PAYOUT_CONCURRENCY?: number;
  WORKER_LEADERBOARD_REFRESH_CONCURRENCY?: number;
  WORKER_LEADERBOARD_EVENT_CONCURRENCY?: number;
  WORKER_FEED_CONCURRENCY?: number;
  WORKER_ARTICLE_CONCURRENCY?: number;

  // Feature Flags (optional with defaults)
  BETA_COHORT_PERCENTAGE?: number;
  SLOW_QUERY_MS?: number;
}

/**
 * Validate and parse environment variables on startup
 * Throws error if required variables are missing
 */
function validateEnvironment(): EnvironmentConfig {
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

  // Helper to parse integer with validation
  const getRequiredInt = (key: string): number => {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      return 0;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      errors.push(`Invalid integer value for ${key}: ${value}`);
      return 0;
    }
    return parsed;
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
  const config: EnvironmentConfig = {
    // Authentication - CRITICAL
    ACCESS_TOKEN_SECRET: getRequired('ACCESS_TOKEN_SECRET'),
    REFRESH_TOKEN_SECRET: getRequired('REFRESH_TOKEN_SECRET'),
    BCRYPT_SALT_ROUNDS: getRequiredInt('BCRYPT_SALT_ROUNDS'),

    // Database - CRITICAL
    DATABASE_URL: getRequired('DATABASE_URL'),

    // Redis - CRITICAL (either REDIS_URL or REDIS_HOST/PORT)
    REDIS_URL: getOptional('REDIS_URL'),
    REDIS_HOST: getOptional('REDIS_HOST'),
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,

    // Application URLs - CRITICAL
    CLIENT_APP_URL: getRequired('CLIENT_APP_URL'),
    BASE_URL_CLIENT: getRequired('BASE_URL_CLIENT'),
    BASE_URL_SERVER: getRequired('BASE_URL_SERVER'),
    BASE_URL_PUBLIC: getRequired('BASE_URL_PUBLIC'),
    API_BASE_URL: getRequired('API_BASE_URL'),

    // Storage - CRITICAL
    TIGRIS_S3_ENDPOINT: getRequired('TIGRIS_S3_ENDPOINT'),
    TIGRIS_ACCESS_KEY_ID: getRequired('TIGRIS_ACCESS_KEY_ID'),
    TIGRIS_SECRET_ACCESS_KEY: getRequired('TIGRIS_SECRET_ACCESS_KEY'),
    TIGRIS_S3_BUCKET: getRequired('TIGRIS_S3_BUCKET'),

    // Game Server - CRITICAL
    GAME_SERVER_SECRET: getRequired('GAME_SERVER_SECRET'),

    // Optional Email
    SENDGRID_API_KEY: getOptional('SENDGRID_API_KEY'),
    FROM_EMAIL: getOptional('FROM_EMAIL'),
    SKIP_EMAIL_FLOW: process.env.SKIP_EMAIL_FLOW === 'true',

    // Server Configuration
    PORT: getOptionalInt('PORT', 5000),
    NODE_ENV: nodeEnv as 'development' | 'test' | 'production',

    // Worker Concurrency (optional with sensible defaults)
    WORKER_PAYOUT_CONCURRENCY: getOptionalInt('WORKER_PAYOUT_CONCURRENCY', 2),
    WORKER_PONG_PAYOUT_CONCURRENCY: getOptionalInt('WORKER_PONG_PAYOUT_CONCURRENCY', 1),
    WORKER_LEADERBOARD_REFRESH_CONCURRENCY: getOptionalInt(
      'WORKER_LEADERBOARD_REFRESH_CONCURRENCY',
      1,
    ),
    WORKER_LEADERBOARD_EVENT_CONCURRENCY: getOptionalInt('WORKER_LEADERBOARD_EVENT_CONCURRENCY', 3),
    WORKER_FEED_CONCURRENCY: getOptionalInt('WORKER_FEED_CONCURRENCY', 3),
    WORKER_ARTICLE_CONCURRENCY: getOptionalInt('WORKER_ARTICLE_CONCURRENCY', 5),

    // Feature Flags
    BETA_COHORT_PERCENTAGE: getOptionalInt('BETA_COHORT_PERCENTAGE', 2),
    SLOW_QUERY_MS: getOptionalInt('SLOW_QUERY_MS', 100),
  };

  // Validate Redis configuration (must have either REDIS_URL or REDIS_HOST)
  if (!config.REDIS_URL && !config.REDIS_HOST) {
    errors.push('Missing Redis configuration: Must provide either REDIS_URL or REDIS_HOST');
  }

  // Validate bcrypt salt rounds (should be between 10-15)
  if (config.BCRYPT_SALT_ROUNDS < 10 || config.BCRYPT_SALT_ROUNDS > 15) {
    console.warn(
      `[env] WARNING: BCRYPT_SALT_ROUNDS is ${config.BCRYPT_SALT_ROUNDS}. Recommended range: 10-15`,
    );
  }

  // Validate GAME_SERVER_SECRET is not the old default
  if (config.GAME_SERVER_SECRET === 'pong-internal-secret-2024') {
    errors.push(
      'GAME_SERVER_SECRET cannot be the default value "pong-internal-secret-2024". Please set a unique secret.',
    );
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    // Ensure HTTPS URLs in production
    const httpsUrls = [
      'CLIENT_APP_URL',
      'BASE_URL_CLIENT',
      'BASE_URL_SERVER',
      'BASE_URL_PUBLIC',
      'API_BASE_URL',
    ];
    httpsUrls.forEach((key) => {
      const value = config[key as keyof EnvironmentConfig];
      if (typeof value === 'string' && value.startsWith('http://')) {
        console.warn(`[env] WARNING: ${key} uses HTTP in production. HTTPS strongly recommended.`);
      }
    });

    // Ensure Redis uses TLS (rediss://)
    if (config.REDIS_URL && !config.REDIS_URL.startsWith('rediss://')) {
      console.warn('[env] WARNING: REDIS_URL should use TLS (rediss://) in production');
    }

    // Ensure email is configured (unless explicitly skipped)
    if (!config.SKIP_EMAIL_FLOW && !config.SENDGRID_API_KEY) {
      console.warn(
        '[env] WARNING: SENDGRID_API_KEY not set in production. Email features will not work.',
      );
    }
  }

  // If any errors, throw and prevent startup
  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.\n');
    throw new Error('Environment validation failed. See errors above.');
  }

  // Log successful validation
  console.log(`✅ Environment validated successfully (${config.NODE_ENV} mode)`);
  console.log(`   - Database: ${config.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(
    `   - Redis: ${config.REDIS_URL ? config.REDIS_URL.split('@')[1] || 'configured' : `${config.REDIS_HOST}:${config.REDIS_PORT}`}`,
  );
  console.log(`   - Storage: ${config.TIGRIS_S3_BUCKET} @ ${config.TIGRIS_S3_ENDPOINT}`);
  console.log(`   - Server Port: ${config.PORT}`);
  console.log(`   - Bcrypt Rounds: ${config.BCRYPT_SALT_ROUNDS}`);

  return config;
}

// Validate on module load (fail fast)
export const env = validateEnvironment();

// Export for convenience
export default env;
