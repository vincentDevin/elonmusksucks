import rateLimit from 'express-rate-limit';

// A generic limiter: max 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// CRITICAL SECURITY: Authentication rate limiter to prevent brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 authentication attempts per window per IP
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed authentication attempts
  skipSuccessfulRequests: true,
});

// More aggressive rate limiter for password reset requests
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 password reset attempts per hour per IP
  message: {
    error: 'Too many password reset requests, please try again in 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Account lockout tracking (in-memory for simplicity, use Redis in production)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > oneHour) {
      failedAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

export const accountLockoutMiddleware = (req: any, res: any, next: any) => {
  const identifier = req.body.email || req.ip; // Use email if available, fallback to IP
  const now = Date.now();
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  const maxAttempts = 5;
  
  const attempts = failedAttempts.get(identifier);
  
  // Check if account is currently locked
  if (attempts?.lockedUntil && now < attempts.lockedUntil) {
    const remainingTime = Math.ceil((attempts.lockedUntil - now) / 60000); // minutes
    return res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`
    });
  }
  
  // Store original end method to intercept response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    // Check if this was a failed auth attempt
    if (res.statusCode === 401 && req.body.email) {
      const currentAttempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
      currentAttempts.count += 1;
      currentAttempts.lastAttempt = now;
      
      // Lock account if too many attempts
      if (currentAttempts.count >= maxAttempts) {
        currentAttempts.lockedUntil = now + lockoutDuration;
        console.warn(`Account locked for ${identifier} due to ${currentAttempts.count} failed attempts`);
      }
      
      failedAttempts.set(identifier, currentAttempts);
    } else if (res.statusCode === 200 && req.body.email) {
      // Clear failed attempts on successful login
      failedAttempts.delete(identifier);
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};
