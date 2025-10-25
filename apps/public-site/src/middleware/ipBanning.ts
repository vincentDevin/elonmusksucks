import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// ══════════════════════════════════════════════════════════════════════════════
// IP Banning Middleware with Redis-backed violation tracking
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-ban configuration thresholds
 */
const BAN_CONFIG = {
  // 404 spam detection
  NOT_FOUND_THRESHOLD: 15, // Number of different 404s (increased from 10)
  NOT_FOUND_WINDOW: 5 * 60, // 5 minutes (in seconds)
  NOT_FOUND_BAN_DURATION: 60 * 60, // 1 hour ban (in seconds)

  // Rate limit violations
  RATE_LIMIT_THRESHOLD: 5, // Number of rate limit hits (increased from 3)
  RATE_LIMIT_WINDOW: 10 * 60, // 10 minutes
  RATE_LIMIT_BAN_DURATION: 30 * 60, // 30 minute ban

  // Malicious payload detection (instant permanent ban)
  MALICIOUS_PATTERNS: [
    // SQL injection attempts
    /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b).*(\bfrom\b|\btable\b|\bwhere\b)/i,
    // XSS attempts
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    // Path traversal
    /\.\.\//,
    /\.\.%2f/i,
    // Common exploit paths (WordPress, phpMyAdmin, etc.)
    /\/wp-admin/i,
    /\/wp-content/i,
    /\/wp-includes/i,
    /\/phpmyadmin/i,
    /\/wp-login\.php/i,
    /\/xmlrpc\.php/i,
    /\.php$/i,
    /\.asp$/i,
    /\.aspx$/i,
    /\.env$/i,
    /\/\.git/i,
    /\/\.ssh/i,
    /\/config\./i,
    /\/database\./i,
  ],
} as const;

/**
 * Violation types for tracking
 */
const VIOLATION_TYPES = {
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  MALICIOUS: 'malicious',
} as const;

type ViolationType = (typeof VIOLATION_TYPES)[keyof typeof VIOLATION_TYPES];

/**
 * Redis key prefixes
 */
const REDIS_KEYS = {
  BAN: (ip: string) => `ip_ban:${ip}`,
  VIOLATIONS: (ip: string, type: ViolationType) => `ip_violations:${type}:${ip}`,
  NOT_FOUND_PATHS: (ip: string) => `ip_404_paths:${ip}`,
} as const;

/**
 * IP Banning Service
 */
export class IPBanningService {
  private redis: Redis;
  private whitelist: Set<string>;

  constructor(redisUrl: string, whitelistedIPs: string[] = []) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.whitelist = new Set(whitelistedIPs);

    this.redis.on('error', (err) => {
      console.error('[IP_BAN] Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('[IP_BAN] Redis connected for IP banning service');
      if (this.whitelist.size > 0) {
        console.log(`[IP_BAN] IP whitelist enabled: ${this.whitelist.size} IPs whitelisted`);
      }
    });
  }

  /**
   * Check if IP is whitelisted (never ban these IPs)
   */
  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  /**
   * Check if IP is banned
   */
  async isBanned(ip: string): Promise<{ banned: boolean; reason?: string; expiresIn?: number }> {
    // Whitelisted IPs are never banned
    if (this.isWhitelisted(ip)) {
      return { banned: false };
    }

    try {
      const banKey = REDIS_KEYS.BAN(ip);
      const banData = await this.redis.get(banKey);

      if (!banData) {
        return { banned: false };
      }

      const { reason } = JSON.parse(banData);
      const ttl = await this.redis.ttl(banKey);

      return {
        banned: true,
        reason,
        expiresIn: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      console.error('[IP_BAN] Error checking ban status:', error);
      // Fail open - don't ban on Redis errors
      return { banned: false };
    }
  }

  /**
   * Ban an IP address
   */
  async banIP(ip: string, reason: string, durationSeconds: number): Promise<void> {
    try {
      const banKey = REDIS_KEYS.BAN(ip);
      const banData = JSON.stringify({
        reason,
        bannedAt: new Date().toISOString(),
        duration: durationSeconds,
      });

      await this.redis.setex(banKey, durationSeconds, banData);

      console.log(`[IP_BAN] ⛔ Banned IP: ${ip}`, {
        reason,
        duration: `${durationSeconds}s (${Math.round(durationSeconds / 60)}min)`,
      });
    } catch (error) {
      console.error('[IP_BAN] Error banning IP:', error);
    }
  }

  /**
   * Track a violation and check if ban threshold reached
   */
  async trackViolation(
    ip: string,
    type: ViolationType,
    metadata?: { path?: string },
  ): Promise<{ shouldBan: boolean; reason?: string; duration?: number }> {
    // Never track violations or ban whitelisted IPs
    if (this.isWhitelisted(ip)) {
      return { shouldBan: false };
    }

    try {
      const violationKey = REDIS_KEYS.VIOLATIONS(ip, type);

      // Increment violation counter
      const count = await this.redis.incr(violationKey);

      // Set expiry on first violation
      if (count === 1) {
        if (type === VIOLATION_TYPES.NOT_FOUND) {
          await this.redis.expire(violationKey, BAN_CONFIG.NOT_FOUND_WINDOW);
        } else if (type === VIOLATION_TYPES.RATE_LIMIT) {
          await this.redis.expire(violationKey, BAN_CONFIG.RATE_LIMIT_WINDOW);
        }
      }

      // For 404s, also track unique paths
      if (type === VIOLATION_TYPES.NOT_FOUND && metadata?.path) {
        const pathsKey = REDIS_KEYS.NOT_FOUND_PATHS(ip);
        await this.redis.sadd(pathsKey, metadata.path);
        await this.redis.expire(pathsKey, BAN_CONFIG.NOT_FOUND_WINDOW);

        // Check unique 404 paths
        const uniquePaths = await this.redis.scard(pathsKey);
        if (uniquePaths >= BAN_CONFIG.NOT_FOUND_THRESHOLD) {
          return {
            shouldBan: true,
            reason: `404 spam: ${uniquePaths} unique paths in ${BAN_CONFIG.NOT_FOUND_WINDOW / 60} minutes`,
            duration: BAN_CONFIG.NOT_FOUND_BAN_DURATION,
          };
        }
      }

      // Check rate limit violations
      if (type === VIOLATION_TYPES.RATE_LIMIT && count >= BAN_CONFIG.RATE_LIMIT_THRESHOLD) {
        return {
          shouldBan: true,
          reason: `Rate limit violations: ${count} hits in ${BAN_CONFIG.RATE_LIMIT_WINDOW / 60} minutes`,
          duration: BAN_CONFIG.RATE_LIMIT_BAN_DURATION,
        };
      }

      // Malicious requests are instant ban
      if (type === VIOLATION_TYPES.MALICIOUS) {
        return {
          shouldBan: true,
          reason: `Malicious request detected: ${metadata?.path || 'unknown'}`,
          duration: 24 * 60 * 60, // 24 hour ban
        };
      }

      return { shouldBan: false };
    } catch (error) {
      console.error('[IP_BAN] Error tracking violation:', error);
      return { shouldBan: false };
    }
  }

  /**
   * Check if request contains malicious patterns
   */
  isMaliciousRequest(req: Request): boolean {
    const fullUrl = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] || '';

    // Check URL against malicious patterns
    for (const pattern of BAN_CONFIG.MALICIOUS_PATTERNS) {
      if (pattern.test(fullUrl)) {
        return true;
      }
    }

    // Check for suspicious user agents (common scanners)
    const suspiciousAgents = [
      /nikto/i,
      /sqlmap/i,
      /nmap/i,
      /masscan/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
    ];

    for (const pattern of suspiciousAgents) {
      if (pattern.test(userAgent)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cleanup method (call on shutdown)
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Get client IP from request (handles proxies)
 */
function getClientIP(req: Request): string {
  // Try Fly.io specific header first
  const flyClientIP = req.headers['fly-client-ip'];
  if (flyClientIP && typeof flyClientIP === 'string') {
    return flyClientIP;
  }

  // Try standard proxy headers
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = typeof xForwardedFor === 'string' ? xForwardedFor.split(',') : xForwardedFor;
    return ips[0].trim();
  }

  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP && typeof xRealIP === 'string') {
    return xRealIP;
  }

  // Fallback to req.ip
  return req.ip || 'unknown';
}

/**
 * Middleware factory - IP ban checker
 */
export function createIPBanMiddleware(banService: IPBanningService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);

    // Skip ban check for health endpoint
    if (req.path === '/health') {
      return next();
    }

    try {
      // Check if IP is banned
      const banStatus = await banService.isBanned(ip);
      if (banStatus.banned) {
        console.warn(`[IP_BAN] Blocked banned IP: ${ip}`, {
          path: req.path,
          reason: banStatus.reason,
          expiresIn: banStatus.expiresIn,
        });

        res.status(403).json({
          error: 'Access forbidden',
          message: 'Your IP has been temporarily banned due to suspicious activity.',
          expiresIn: banStatus.expiresIn,
        });
        return;
      }

      // Check for malicious patterns
      if (banService.isMaliciousRequest(req)) {
        console.warn(`[IP_BAN] 🚨 Malicious request detected from ${ip}:`, {
          path: req.originalUrl,
          userAgent: req.headers['user-agent'],
        });

        // Track and ban immediately
        const result = await banService.trackViolation(ip, VIOLATION_TYPES.MALICIOUS, {
          path: req.originalUrl,
        });

        if (result.shouldBan && result.duration) {
          await banService.banIP(ip, result.reason || 'Malicious request', result.duration);
        }

        res.status(403).json({
          error: 'Forbidden',
          message: 'Malicious request detected.',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[IP_BAN] Middleware error:', error);
      // Fail open - allow request on error
      next();
    }
  };
}

/**
 * Middleware factory - 404 tracker
 */
export function create404TrackerMiddleware(banService: IPBanningService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);

    // Store original end function
    const originalEnd = res.end;

    // Override end to detect 404s
    res.end = function (this: Response, ...args: any[]): Response {
      if (res.statusCode === 404) {
        // Track 404 violation asynchronously (don't block response)
        setImmediate(async () => {
          try {
            const result = await banService.trackViolation(ip, VIOLATION_TYPES.NOT_FOUND, {
              path: req.path,
            });

            if (result.shouldBan && result.duration) {
              await banService.banIP(ip, result.reason || '404 spam', result.duration);
            }
          } catch (error) {
            console.error('[IP_BAN] Error tracking 404:', error);
          }
        });
      }

      // Call original end
      return originalEnd.apply(this, args as any);
    };

    next();
  };
}

/**
 * Middleware factory - Rate limit tracker
 */
export function createRateLimitTrackerMiddleware(banService: IPBanningService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);

    // Store original end function
    const originalEnd = res.end;

    // Override end to detect rate limit responses
    res.end = function (this: Response, ...args: any[]): Response {
      if (res.statusCode === 429) {
        // Track rate limit violation asynchronously
        setImmediate(async () => {
          try {
            const result = await banService.trackViolation(ip, VIOLATION_TYPES.RATE_LIMIT);

            if (result.shouldBan && result.duration) {
              await banService.banIP(
                ip,
                result.reason || 'Excessive rate limit violations',
                result.duration,
              );
            }
          } catch (error) {
            console.error('[IP_BAN] Error tracking rate limit:', error);
          }
        });
      }

      return originalEnd.apply(this, args as any);
    };

    next();
  };
}
