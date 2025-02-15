import { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

interface CacheOptions {
  duration: number;
  key?: string | ((req: Request) => string);
  condition?: (req: Request) => boolean;
  tags?: string[];
  compress?: boolean;
}

export class CacheHandler {
  private static readonly DEFAULT_DURATION = 3600; // 1 hour
  private static readonly CACHE_PREFIX = 'api:cache:';
  private static readonly TAG_PREFIX = 'api:cache:tag:';

  static middleware(options: CacheOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip cache for non-GET requests
        if (req.method !== 'GET') {
          return next();
        }

        // Check cache condition
        if (options.condition && !options.condition(req)) {
          return next();
        }

        const cacheKey = CacheHandler.generateCacheKey(req, options.key);
        const cachedResponse = await CacheHandler.getFromCache(cacheKey);

        if (cachedResponse) {
          logger.debug('Cache hit', { key: cacheKey });
          return res.json(JSON.parse(cachedResponse));
        }

        // Store original json method
        const originalJson = res.json;

        // Override json method to cache the response
        res.json = function(body: any): Response {
          CacheHandler.storeInCache(
            cacheKey,
            body,
            options.duration || CacheHandler.DEFAULT_DURATION,
            options.tags,
            options.compress
          ).catch(error => {
            logger.error('Cache storage error:', error);
          });

          return originalJson.call(this, body);
        };

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private static generateCacheKey(req: Request, keyOption?: string | ((req: Request) => string)): string {
    if (typeof keyOption === 'function') {
      return `${this.CACHE_PREFIX}${keyOption(req)}`;
    }

    if (typeof keyOption === 'string') {
      return `${this.CACHE_PREFIX}${keyOption}`;
    }

    // Default key generation
    const params = JSON.stringify(req.params);
    const query = JSON.stringify(req.query);
    const user = req.user?.id || 'anonymous';
    
    return `${this.CACHE_PREFIX}${req.path}:${params}:${query}:${user}`;
  }

  private static async getFromCache(key: string): Promise<string | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        await redis.incr(`${key}:hits`);
      }
      return cached;
    } catch (error) {
      logger.error('Cache retrieval error:', error);
      return null;
    }
  }

  private static async storeInCache(
    key: string,
    data: any,
    duration: number,
    tags?: string[],
    compress?: boolean
  ): Promise<void> {
    try {
      const value = JSON.stringify(data);
      const compressedValue = compress ? 
        await CacheHandler.compressData(value) : 
        value;

      // Store the cache with expiration
      await redis.setex(key, duration, compressedValue);

      // Store cache tags
      if (tags?.length) {
        await Promise.all([
          // Add key to each tag set
          ...tags.map(tag => 
            redis.sadd(`${this.TAG_PREFIX}${tag}`, key)
          ),
          // Store tags for this key
          redis.sadd(`${key}:tags`, ...tags)
        ]);
      }
    } catch (error) {
      logger.error('Cache storage error:', error);
    }
  }

  private static async compressData(data: string): Promise<string> {
    // Implement your compression logic here
    // This is a placeholder for actual compression
    return data;
  }

  static async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // Get all cache keys for these tags
      const keys = await Promise.all(
        tags.map(tag => 
          redis.smembers(`${this.TAG_PREFIX}${tag}`)
        )
      );

      // Flatten and deduplicate keys
      const uniqueKeys = [...new Set(keys.flat())];

      if (uniqueKeys.length > 0) {
        // Delete all cache entries and their metadata
        await Promise.all([
          redis.del(...uniqueKeys),
          ...uniqueKeys.map(key => redis.del(`${key}:hits`)),
          ...uniqueKeys.map(key => redis.del(`${key}:tags`)),
          ...tags.map(tag => redis.del(`${this.TAG_PREFIX}${tag}`))
        ]);

        logger.info('Cache invalidated', { tags, keysCount: uniqueKeys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      throw new AppError(500, 'Failed to invalidate cache');
    }
  }

  static async getCacheStats(): Promise<any> {
    try {
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      const stats = {
        totalEntries: keys.length,
        hitsByKey: {},
        sizeByKey: {},
        tagsByKey: {}
      };

      for (const key of keys) {
        const [value, hits, tags] = await Promise.all([
          redis.get(key),
          redis.get(`${key}:hits`),
          redis.smembers(`${key}:tags`)
        ]);

        if (value) {
          stats.sizeByKey[key] = value.length;
          stats.hitsByKey[key] = parseInt(hits || '0');
          stats.tagsByKey[key] = tags;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Cache stats error:', error);
      throw new AppError(500, 'Failed to get cache stats');
    }
  }
}

// Example usage:
/*
router.get('/users',
  CacheHandler.middleware({
    duration: 3600, // 1 hour
    tags: ['users'],
    condition: (req) => !req.query.nocache,
    key: (req) => `users:${req.query.page}:${req.query.limit}`,
    compress: true
  }),
  UserController.getUsers
);

// Invalidate cache when data changes
router.post('/users',
  async (req, res, next) => {
    try {
      // Create user logic
      await CacheHandler.invalidateByTags(['users']);
      // Response logic
    } catch (error) {
      next(error);
    }
  }
);
*/ 