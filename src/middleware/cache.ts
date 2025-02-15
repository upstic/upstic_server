import { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';

interface CacheOptions {
  duration: number; // Cache duration in seconds
  key?: string | ((req: Request) => string); // Custom cache key or function to generate key
}

export const cacheMiddleware = (options: CacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const cacheKey = typeof options.key === 'function'
        ? options.key(req)
        : options.key || `${req.originalUrl}`;

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        return res.status(200).json(parsed);
      }

      // Store original send function
      const originalSend = res.json;

      // Override send function to cache response
      res.json = function(body: any): Response {
        // Store in cache
        redis.setex(
          cacheKey,
          options.duration,
          JSON.stringify(body)
        ).catch(err => {
          logger.error('Cache storage error:', err);
        });

        // Call original send
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Cache control headers middleware
export const setCacheHeaders = (options: {
  public?: boolean;
  maxAge?: number;
  staleWhileRevalidate?: number;
  noStore?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.noStore) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      const directives = [
        options.public ? 'public' : 'private',
        `max-age=${options.maxAge || 0}`,
      ];

      if (options.staleWhileRevalidate) {
        directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
      }

      res.setHeader('Cache-Control', directives.join(', '));
    }
    next();
  };
};

// Cache invalidation middleware
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalSend = res.json;

      res.json = function(body: any): Response {
        // Invalidate cache patterns after successful non-GET requests
        if (req.method !== 'GET') {
          Promise.all(
            patterns.map(pattern => redis.del(pattern))
          ).catch(err => {
            logger.error('Cache invalidation error:', err);
          });
        }

        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Example usage in routes:
/*
router.get('/users',
  setCacheHeaders({ public: true, maxAge: 300 }), // 5 minutes
  cacheMiddleware({ 
    duration: 300,
    key: req => `users:${req.query.page}:${req.query.limit}`
  }),
  UserController.getUsers
);

router.post('/users',
  invalidateCache(['users:*']),
  UserController.createUser
);
*/ 