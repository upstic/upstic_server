import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { redis } from '../../utils/redis';
import { logger } from '../../utils/logger';
import { AppError } from '../errorHandler';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  private static createStore() {
    return new RedisStore({
      sendCommand: (...args: string[]) => redis.sendCommand(args),
      prefix: 'ratelimit:',
    });
  }

  private static defaultKeyGenerator(req: Request): string {
    return `${req.ip}:${req.path}`;
  }

  private static async incrementFailedAttempts(key: string): Promise<number> {
    const attempts = await redis.incr(`failed:${key}`);
    await redis.expire(`failed:${key}`, 3600); // 1 hour
    return attempts;
  }

  static createLimiter(config: RateLimitConfig) {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || 'Too many requests, please try again later',
      statusCode: config.statusCode || 429,
      store: RateLimiter.createStore(),
      keyGenerator: config.keyGenerator || RateLimiter.defaultKeyGenerator,
      handler: async (req: Request, res: Response) => {
        const key = (config.keyGenerator || RateLimiter.defaultKeyGenerator)(req);
        const attempts = await RateLimiter.incrementFailedAttempts(key);

        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          attempts,
          user: req.user?.id
        });

        if (attempts > 10) {
          // Implement additional security measures
          await RateLimiter.handleSuspiciousActivity(req);
        }

        res.status(config.statusCode || 429).json({
          success: false,
          message: config.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for certain conditions
        return req.ip === '127.0.0.1' || req.path === '/health';
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  private static async handleSuspiciousActivity(req: Request) {
    const key = `suspicious:${req.ip}`;
    await redis.set(key, '1', 'EX', 86400); // 24 hours
    
    logger.alert('Suspicious activity detected', {
      ip: req.ip,
      user: req.user?.id,
      headers: req.headers,
      path: req.path
    });
  }
}

// Different rate limit configurations
export const generalLimiter = RateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

export const authLimiter = RateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req: Request) => `auth:${req.ip}:${req.body.email}`
});

export const apiLimiter = RateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req: Request) => {
    return req.user ? `api:${req.user.id}` : `api:${req.ip}`;
  }
}); 