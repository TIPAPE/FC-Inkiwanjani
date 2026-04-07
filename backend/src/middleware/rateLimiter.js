// backend/src/middleware/rateLimiter.js

/**
 * Simple in-memory rate limiter.
 *
 * Tracks request counts per IP in a Map with automatic expiry.
 * Not suitable for multi-instance deployments (use Redis for that).
 *
 * Usage:
 *   const limiter = rateLimiter({ windowMs: 60000, max: 100 });
 *   router.post('/login', limiter, authController.login);
 */

function rateLimiter({ windowMs = 60_000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  const store = new Map();

  // Clean up expired entries every minute
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (value.resetAt <= now) store.delete(key);
    }
  }, 60_000);

  // Prevent cleanup from keeping process alive
  if (cleanup.unref) cleanup.unref();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || 'unknown';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(ip, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    next();
  };
}

// Pre-configured limiters for common use cases
const loginLimiter = rateLimiter({ windowMs: 15 * 60_000, max: 10, message: 'Too many login attempts. Please wait 15 minutes.' });
const bookingLimiter = rateLimiter({ windowMs: 5 * 60_000, max: 20, message: 'Too many booking attempts. Please wait 5 minutes.' });
const commentLimiter = rateLimiter({ windowMs: 60_000, max: 10, message: 'Too many comments. Please wait a minute.' });
const pollLimiter = rateLimiter({ windowMs: 60_000, max: 5, message: 'Too many votes. Please wait a minute.' });
const generalLimiter = rateLimiter({ windowMs: 60_000, max: 200 });

module.exports = rateLimiter;
module.exports.loginLimiter = loginLimiter;
module.exports.bookingLimiter = bookingLimiter;
module.exports.commentLimiter = commentLimiter;
module.exports.pollLimiter = pollLimiter;
module.exports.generalLimiter = generalLimiter;
