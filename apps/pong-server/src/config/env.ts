// apps/pong-server/src/config/env.ts
// ══════════════════════════════════════════════════════════════════════════════
// Environment Variable Validation - Pong Game Server
// ══════════════════════════════════════════════════════════════════════════════
// This module validates all required environment variables on startup.
// If any required variables are missing or invalid, the application will CRASH
// with a clear error message. This is a FAIL-FAST approach to prevent running
// with insecure defaults or misconfiguration.
// ══════════════════════════════════════════════════════════════════════════════

interface EnvironmentConfig {
  // Application
  NODE_ENV: string;
  PORT: number;

  // API Configuration (REQUIRED - NO FALLBACKS)
  API_BASE_URL: string;
  GAME_SERVER_SECRET: string;

  // CORS Configuration (REQUIRED - NO FALLBACKS)
  CLIENT_APP_URL: string;
  BASE_URL_CLIENT: string;

  // Optional Configuration
  MAX_PVP_WAGER: number;
}

/**
 * Validates and returns environment configuration
 * Throws an error if any required variables are missing or invalid
 */
function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  /**
   * Get required environment variable
   * Adds error if missing
   */
  const getRequired = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  };

  /**
   * Get optional environment variable with default
   */
  const getOptional = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue;
  };

  /**
   * Parse required integer from environment variable
   */
  const getRequiredInt = (key: string, defaultValue?: number): number => {
    const value = process.env[key];
    if (!value) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      errors.push(`Missing required environment variable: ${key}`);
      return 0;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      errors.push(`Environment variable ${key} must be a valid integer (got: "${value}")`);
      return 0;
    }

    return parsed;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Build Configuration
  // ──────────────────────────────────────────────────────────────────────────

  const config: EnvironmentConfig = {
    // Application
    NODE_ENV: getOptional('NODE_ENV', 'development'),
    PORT: getRequiredInt('PORT', 5001),

    // API Configuration (REQUIRED - NO FALLBACKS)
    API_BASE_URL: getRequired('API_BASE_URL'),
    GAME_SERVER_SECRET: getRequired('GAME_SERVER_SECRET'),

    // CORS Configuration (REQUIRED - NO FALLBACKS)
    CLIENT_APP_URL: getRequired('CLIENT_APP_URL'),
    BASE_URL_CLIENT: getRequired('BASE_URL_CLIENT'),

    // Optional Configuration
    MAX_PVP_WAGER: getRequiredInt('MAX_PVP_WAGER', 50000),
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Validation Rules
  // ──────────────────────────────────────────────────────────────────────────

  // Validate GAME_SERVER_SECRET is not the default/example value
  if (
    config.GAME_SERVER_SECRET === 'pong-internal-secret-2024' ||
    config.GAME_SERVER_SECRET === 'change-this-to-a-unique-secret-minimum-32-characters-long'
  ) {
    errors.push(
      'GAME_SERVER_SECRET cannot be the default/example value. Generate a secure secret with: openssl rand -hex 32',
    );
  }

  // Validate GAME_SERVER_SECRET length (minimum 32 characters for security)
  if (config.GAME_SERVER_SECRET && config.GAME_SERVER_SECRET.length < 32) {
    warnings.push(
      `GAME_SERVER_SECRET is only ${config.GAME_SERVER_SECRET.length} characters. Recommended minimum: 32 characters`,
    );
  }

  // Validate PORT is in valid range
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push(`PORT must be between 1 and 65535 (got: ${config.PORT})`);
  }

  // Validate MAX_PVP_WAGER is positive
  if (config.MAX_PVP_WAGER < 0) {
    errors.push(`MAX_PVP_WAGER must be positive (got: ${config.MAX_PVP_WAGER})`);
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    // Check that URLs use HTTPS in production
    const urlsToCheck = [
      { key: 'API_BASE_URL', value: config.API_BASE_URL },
      { key: 'CLIENT_APP_URL', value: config.CLIENT_APP_URL },
      { key: 'BASE_URL_CLIENT', value: config.BASE_URL_CLIENT },
    ];

    for (const { key, value } of urlsToCheck) {
      if (value && !value.startsWith('https://')) {
        warnings.push(
          `${key} should use HTTPS in production (currently: ${value.substring(0, 30)}...)`,
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Report Results
  // ──────────────────────────────────────────────────────────────────────────

  // Print warnings first
  if (warnings.length > 0) {
    console.warn('\n⚠️  ENVIRONMENT CONFIGURATION WARNINGS:\n');
    warnings.forEach((warning) => console.warn(`   ⚠️  ${warning}`));
    console.warn('');
  }

  // If there are errors, fail fast
  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`   ❌ ${error}`));
    console.error('\n💡 TIP: Check your .env file and ensure all required variables are set.');
    console.error('💡 TIP: See .env.example for a complete list of required variables.\n');
    throw new Error('Environment validation failed. Cannot start pong-server.');
  }

  // Success - log configuration summary
  console.log(`✅ Pong Server environment validated successfully (${config.NODE_ENV} mode)`);
  console.log(`   📡 API Server: ${config.API_BASE_URL}`);
  console.log(`   🎮 Server Port: ${config.PORT}`);
  console.log(`   🔒 Game Server Secret: ${config.GAME_SERVER_SECRET.substring(0, 8)}...`);
  console.log(`   🌐 Allowed Origins: ${config.CLIENT_APP_URL}, ${config.BASE_URL_CLIENT}`);
  console.log(`   💰 Max PVP Wager: ${config.MAX_PVP_WAGER} MuskBucks`);
  console.log('');

  return config;
}

// ══════════════════════════════════════════════════════════════════════════════
// Export validated configuration
// ══════════════════════════════════════════════════════════════════════════════
// This will run immediately when the module is imported, causing the application
// to fail fast if the environment is misconfigured.
// ══════════════════════════════════════════════════════════════════════════════

export const env = validateEnvironment();
export default env;
