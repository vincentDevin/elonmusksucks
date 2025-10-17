// apps/client/src/config/env.ts
// ══════════════════════════════════════════════════════════════════════════════
// Environment Variable Validation - Client Application
// ══════════════════════════════════════════════════════════════════════════════
// This module validates all required environment variables on startup.
// If any required variables are missing or invalid, the application will CRASH
// with a clear error message. This is a FAIL-FAST approach to prevent running
// with insecure defaults or misconfiguration.
//
// IMPORTANT: All client environment variables MUST be prefixed with VITE_
// to be exposed to the client bundle.
// ══════════════════════════════════════════════════════════════════════════════

interface EnvironmentConfig {
  // Application
  NODE_ENV: string;
  DEV: boolean;
  PROD: boolean;

  // API Configuration
  // In development: Empty string (uses Vite proxy)
  // In production: Full API URL (e.g., https://api.elonmusksucks.net)
  API_BASE_URL: string;

  // Public Site URL (for redirects)
  PUBLIC_SITE_URL: string;

  // Socket.IO URL
  // In development: Empty string (uses Vite proxy)
  // In production: Full API URL (e.g., https://api.elonmusksucks.net)
  SOCKET_URL: string;

  // Pong Server URL
  // In development: Can be empty (defaults to localhost:5001)
  // In production: Full Pong server URL (e.g., https://pong.elonmusksucks.net)
  PONG_SERVER_URL: string;

  // Optional: Feature Flags
  FEATURE_FLAGS: {
    pong_beta: boolean;
    enhanced_chat: boolean;
    advanced_analytics: boolean;
    experimental_ui: boolean;
  };
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
   * In development, some variables can be empty (uses Vite proxy)
   * In production, all variables are required
   */
  const getRequired = (key: string, allowEmptyInDev = false): string => {
    const value = import.meta.env[key];
    const isDev = import.meta.env.DEV;

    if (!value) {
      if (allowEmptyInDev && isDev) {
        return '';
      }
      errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  };

  /**
   * Get optional environment variable with default
   */
  const getOptional = (key: string, defaultValue: string): string => {
    return import.meta.env[key] || defaultValue;
  };

  /**
   * Get boolean environment variable
   */
  const getBoolean = (key: string, defaultValue: boolean): boolean => {
    const value = import.meta.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    return value === 'true' || value === '1';
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Build Configuration
  // ──────────────────────────────────────────────────────────────────────────

  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  const mode = import.meta.env.MODE || 'development';

  const config: EnvironmentConfig = {
    // Application
    NODE_ENV: mode,
    DEV: isDev,
    PROD: isProd,

    // API Configuration
    // In development, empty string uses Vite proxy (localhost:3000/api → localhost:5000/api)
    // In production, must be full URL
    API_BASE_URL: getRequired('VITE_API_BASE_URL', true),
    PUBLIC_SITE_URL: getRequired('VITE_PUBLIC_SITE_URL', true),
    SOCKET_URL: getRequired('VITE_SOCKET_URL', true),
    PONG_SERVER_URL: getOptional('VITE_PONG_SERVER_URL', 'http://localhost:5001'),

    // Feature Flags (optional)
    FEATURE_FLAGS: {
      pong_beta: getBoolean('VITE_FEATURE_PONG_BETA', false),
      enhanced_chat: getBoolean('VITE_FEATURE_ENHANCED_CHAT', false),
      advanced_analytics: getBoolean('VITE_FEATURE_ADVANCED_ANALYTICS', false),
      experimental_ui: getBoolean('VITE_FEATURE_EXPERIMENTAL_UI', false),
    },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Validation Rules
  // ──────────────────────────────────────────────────────────────────────────

  // In production, validate URLs are HTTPS
  if (isProd) {
    const urlsToCheck = [
      { key: 'VITE_API_BASE_URL', value: config.API_BASE_URL },
      { key: 'VITE_PUBLIC_SITE_URL', value: config.PUBLIC_SITE_URL },
      { key: 'VITE_SOCKET_URL', value: config.SOCKET_URL },
    ];

    for (const { key, value } of urlsToCheck) {
      // In production, these URLs should not be empty
      if (!value) {
        errors.push(`${key} is required in production mode`);
        continue;
      }

      // Check for HTTPS in production
      if (!value.startsWith('https://')) {
        warnings.push(
          `${key} should use HTTPS in production (currently: ${value.substring(0, 30)}...)`,
        );
      }

      // Warn if using localhost in production
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        warnings.push(`${key} uses localhost in production - this is likely incorrect`);
      }
    }
  }

  // In development, warn if URLs are set (Vite proxy is preferred)
  if (isDev) {
    if (config.API_BASE_URL) {
      warnings.push(
        'VITE_API_BASE_URL is set in development. Vite proxy will be used instead. This is fine for testing production builds locally.',
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Report Results
  // ──────────────────────────────────────────────────────────────────────────

  // Print warnings first
  if (warnings.length > 0) {
    console.warn('\n⚠️  CLIENT ENVIRONMENT CONFIGURATION WARNINGS:\n');
    warnings.forEach((warning) => console.warn(`   ⚠️  ${warning}`));
    console.warn('');
  }

  // If there are errors, fail fast
  if (errors.length > 0) {
    console.error('\n❌ CLIENT ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`   ❌ ${error}`));
    console.error('\n💡 TIP: Check your .env file and ensure all required variables are set.');
    console.error('💡 TIP: All client environment variables must be prefixed with VITE_');
    console.error('💡 TIP: See .env.example for a complete list of required variables.\n');
    throw new Error('Environment validation failed. Cannot start client application.');
  }

  // Success - log configuration summary (only in development)
  if (isDev) {
    console.log(`✅ Client environment validated successfully (${mode} mode)`);
    console.log(`   📡 API Base URL: ${config.API_BASE_URL || '[Vite Proxy]'}`);
    console.log(`   🌐 Public Site URL: ${config.PUBLIC_SITE_URL || '[localhost:5173]'}`);
    console.log(`   🔌 Socket URL: ${config.SOCKET_URL || '[Vite Proxy]'}`);

    // Log enabled feature flags
    const enabledFlags = Object.entries(config.FEATURE_FLAGS)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    if (enabledFlags.length > 0) {
      console.log(`   🚩 Feature Flags: ${enabledFlags.join(', ')}`);
    }
    console.log('');
  }

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
