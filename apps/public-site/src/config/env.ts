// apps/public-site/src/config/env.ts
// ══════════════════════════════════════════════════════════════════════════════
// Environment Variable Validation - Public Marketing Site
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
  CLIENT_APP_URL: string;

  // Optional Configuration
  ALLOWED_ORIGINS?: string;
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
    PORT: getRequiredInt('PORT', 5173),

    // API Configuration (REQUIRED - NO FALLBACKS)
    API_BASE_URL: getRequired('API_BASE_URL'),
    CLIENT_APP_URL: getRequired('CLIENT_APP_URL'),

    // Optional Configuration
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Validation Rules
  // ──────────────────────────────────────────────────────────────────────────

  // Validate PORT is in valid range
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push(`PORT must be between 1 and 65535 (got: ${config.PORT})`);
  }

  // Validate URLs are not localhost in production
  if (config.NODE_ENV === 'production') {
    // Check that URLs use HTTPS in production
    const urlsToCheck = [
      { key: 'API_BASE_URL', value: config.API_BASE_URL },
      { key: 'CLIENT_APP_URL', value: config.CLIENT_APP_URL },
    ];

    for (const { key, value } of urlsToCheck) {
      if (value && !value.startsWith('https://') && !value.startsWith('http://localhost')) {
        warnings.push(
          `${key} should use HTTPS in production (currently: ${value.substring(0, 30)}...)`,
        );
      }

      // Warn if using localhost in production
      if (value && value.includes('localhost') && config.NODE_ENV === 'production') {
        warnings.push(`${key} uses localhost in production - this is likely incorrect`);
      }

      // Warn if using 127.0.0.1 in production
      if (value && value.includes('127.0.0.1') && config.NODE_ENV === 'production') {
        warnings.push(`${key} uses 127.0.0.1 in production - this is likely incorrect`);
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
    throw new Error('Environment validation failed. Cannot start public-site.');
  }

  // Success - log configuration summary
  console.log(`✅ Public site environment validated successfully (${config.NODE_ENV} mode)`);
  console.log(`   📡 API Base URL: ${config.API_BASE_URL}`);
  console.log(`   🌐 Client App URL: ${config.CLIENT_APP_URL}`);
  console.log(`   🎮 Server Port: ${config.PORT}`);
  if (config.ALLOWED_ORIGINS) {
    console.log(`   🔐 Allowed Origins: ${config.ALLOWED_ORIGINS}`);
  }
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
