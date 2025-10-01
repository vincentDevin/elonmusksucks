/**
 * Config Layer - Security Configuration Types
 *
 * Security settings for CSRF, JWT, rate limiting, and encryption
 */

// ============================================================================
// CSRF Configuration
// ============================================================================

/**
 * CSRF Configuration
 */
export interface CSRFConfig {
  enabled: boolean;
  cookieName: string;
  headerName: string;
  tokenLength: number;
  ignoreMethods?: string[]; // e.g., ['GET', 'HEAD', 'OPTIONS']
  cookie?: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number; // seconds
  };
}

// ============================================================================
// JWT Configuration
// ============================================================================

/**
 * JWT Configuration
 */
export interface JWTConfig {
  accessToken: TokenConfig;
  refreshToken: TokenConfig;
  algorithm: JWTAlgorithm;
  issuer: string;
  audience: string;
}

/**
 * Token Configuration
 */
export interface TokenConfig {
  secret: string;
  expiresIn: number; // seconds
  notBefore?: number; // seconds (optional delay before token is valid)
}

/**
 * JWT Algorithms
 */
export const JWTAlgorithm = {
  HS256: 'HS256',
  HS384: 'HS384',
  HS512: 'HS512',
  RS256: 'RS256',
  RS384: 'RS384',
  RS512: 'RS512',
  ES256: 'ES256',
  ES384: 'ES384',
  ES512: 'ES512',
} as const;

export type JWTAlgorithm = (typeof JWTAlgorithm)[keyof typeof JWTAlgorithm];

/**
 * JWT Payload
 */
export interface JWTPayload {
  sub: number; // Subject (userId)
  iat: number; // Issued at
  exp: number; // Expiration
  nbf?: number; // Not before
  iss?: string; // Issuer
  aud?: string; // Audience
  jti?: string; // JWT ID
  [key: string]: unknown; // Additional claims
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Rate Limit Config
 */
export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: RateLimitKeyGenerator;
  handler?: RateLimitHandler;
  store?: 'memory' | 'redis';
}

/**
 * Rate Limit Key Generator Type
 */
export type RateLimitKeyGenerator = (req: unknown) => string;

/**
 * Rate Limit Handler Type
 */
export type RateLimitHandler = (req: unknown, res: unknown) => void;

/**
 * Endpoint Rate Limits
 */
export interface EndpointRateLimits {
  global?: RateLimitConfig;
  auth?: RateLimitConfig;
  api?: RateLimitConfig;
  betting?: RateLimitConfig;
  chat?: RateLimitConfig;
  admin?: RateLimitConfig;
}

// ============================================================================
// Password Configuration
// ============================================================================

/**
 * Password Policy
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommon: boolean;
  preventUserInfo: boolean; // Prevent username/email in password
  minStrength: PasswordStrength;
  expiryDays?: number; // Password expiry (optional)
  preventReuse?: number; // Number of previous passwords to check
}

/**
 * Password Strength Levels
 */
export const PasswordStrength = {
  WEAK: 'weak',
  FAIR: 'fair',
  GOOD: 'good',
  STRONG: 'strong',
  VERY_STRONG: 'very_strong',
} as const;

export type PasswordStrength =
  (typeof PasswordStrength)[keyof typeof PasswordStrength];

/**
 * Password Hashing Config
 */
export interface PasswordHashingConfig {
  algorithm: 'bcrypt' | 'argon2' | 'scrypt';
  bcrypt?: {
    rounds: number;
  };
  argon2?: {
    type: 'argon2i' | 'argon2d' | 'argon2id';
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
}

// ============================================================================
// Session Configuration
// ============================================================================

/**
 * Session Configuration
 */
export interface SessionConfig {
  store: 'redis' | 'memory';
  secret: string;
  name: string;
  cookie: {
    maxAge: number; // milliseconds
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    domain?: string;
    path: string;
  };
  rolling: boolean; // Reset expiry on each request
  resave: boolean;
  saveUninitialized: boolean;
}

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * CORS Configuration
 */
export interface CORSConfig {
  enabled: boolean;
  origin: string | string[] | RegExp | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number; // seconds
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// ============================================================================
// Encryption Configuration
// ============================================================================

/**
 * Encryption Configuration
 */
export interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations?: number; // For key derivation
  encoding: 'hex' | 'base64';
}

/**
 * Encryption Algorithms
 */
export const EncryptionAlgorithm = {
  AES_256_GCM: 'aes-256-gcm',
  AES_256_CBC: 'aes-256-cbc',
  AES_192_GCM: 'aes-192-gcm',
  AES_128_GCM: 'aes-128-gcm',
  CHACHA20_POLY1305: 'chacha20-poly1305',
} as const;

export type EncryptionAlgorithm =
  (typeof EncryptionAlgorithm)[keyof typeof EncryptionAlgorithm];

// ============================================================================
// Content Security Policy
// ============================================================================

/**
 * Content Security Policy
 */
export interface CSPConfig {
  enabled: boolean;
  directives: CSPDirectives;
  reportOnly: boolean;
  reportUri?: string;
}

/**
 * CSP Directives
 */
export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  workerSrc?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  baseUri?: string[];
  manifestSrc?: string[];
  upgradeInsecureRequests?: boolean;
}

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Security Headers Configuration
 */
export interface SecurityHeadersConfig {
  hsts?: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  noSniff?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xssProtection?: {
    enabled: boolean;
    mode: 'block' | 'report';
    reportUri?: string;
  };
  referrerPolicy?: ReferrerPolicy;
  permissionsPolicy?: Record<string, string[]>;
}

/**
 * Referrer Policy Values
 */
export const ReferrerPolicy = {
  NO_REFERRER: 'no-referrer',
  NO_REFERRER_WHEN_DOWNGRADE: 'no-referrer-when-downgrade',
  ORIGIN: 'origin',
  ORIGIN_WHEN_CROSS_ORIGIN: 'origin-when-cross-origin',
  SAME_ORIGIN: 'same-origin',
  STRICT_ORIGIN: 'strict-origin',
  STRICT_ORIGIN_WHEN_CROSS_ORIGIN: 'strict-origin-when-cross-origin',
  UNSAFE_URL: 'unsafe-url',
} as const;

export type ReferrerPolicy = (typeof ReferrerPolicy)[keyof typeof ReferrerPolicy];
