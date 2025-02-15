import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { RedisService } from '../../services/redis.service';
import { PerformanceService } from '../../services/performance.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheHandler {
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000; // items
  private readonly CACHE_WARMUP_BATCH_SIZE = 50;
  private readonly EVICTION_POLICIES = ['lru', 'lfu', 'fifo'] as const;

  private cacheConfig: {
    policy: typeof this.EVICTION_POLICIES[number];
    compression: boolean;
    warmup: boolean;
  };

  constructor(
    @InjectModel('CacheStats') private statsModel: Model<any>,
    private redisService: RedisService,
    private performanceService: PerformanceService,
    private configService: ConfigService,
    private logger: Logger
  ) {
    this.initializeCacheConfig();
  }

  async get<T>(
    key: string,
    options?: CacheOptions
  ): Promise<T | null> {
    try {
      // Check local cache first
      const localValue = await this.getFromLocalCache<T>(key);
      if (localValue) {
        await this.updateCacheStats('hit', 'local');
        return localValue;
      }

      // Check Redis cache
      const redisValue = await this.getFromRedis<T>(key);
      if (redisValue) {
        await this.updateCacheStats('hit', 'redis');
        // Update local cache
        await this.setToLocalCache(key, redisValue, options?.ttl);
        return redisValue;
      }

      await this.updateCacheStats('miss');
      return null;
    } catch (error) {
      this.logger.error('Error getting from cache:', error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      // Compress value if configured
      const processedValue = this.cacheConfig.compression
        ? await this.compressValue(value)
        : value;

      // Set in Redis
      await this.setToRedis(key, processedValue, options?.ttl);

      // Set in local cache
      await this.setToLocalCache(key, value, options?.ttl);

      await this.updateCacheStats('set');
      return true;
    } catch (error) {
      this.logger.error('Error setting cache:', error);
      return false;
    }
  }

  async invalidate(
    key: string | string[]
  ): Promise<boolean> {
    try {
      const keys = Array.isArray(key) ? key : [key];

      // Invalidate from Redis
      await this.redisService.del(keys);

      // Invalidate from local cache
      await this.invalidateFromLocalCache(keys);

      await this.updateCacheStats('invalidate');
      return true;
    } catch (error) {
      this.logger.error('Error invalidating cache:', error);
      return false;
    }
  }

  async warmup(
    patterns: string[]
  ): Promise<WarmupResult> {
    try {
      const results: WarmupResult = {
        processed: 0,
        success: 0,
        failed: 0,
        patterns
      };

      for (const pattern of patterns) {
        const keys = await this.redisService.keys(pattern);
        
        // Process in batches
        for (let i = 0; i < keys.length; i += this.CACHE_WARMUP_BATCH_SIZE) {
          const batch = keys.slice(i, i + this.CACHE_WARMUP_BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(key => this.warmupKey(key))
          );

          results.processed += batch.length;
          results.success += batchResults.filter(r => r.status === 'fulfilled').length;
          results.failed += batchResults.filter(r => r.status === 'rejected').length;
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error warming up cache:', error);
      throw error;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const [localStats, redisStats] = await Promise.all([
        this.getLocalCacheStats(),
        this.getRedisStats()
      ]);

      return {
        hits: {
          total: localStats.hits + redisStats.hits,
          local: localStats.hits,
          redis: redisStats.hits
        },
        misses: {
          total: localStats.misses + redisStats.misses,
          local: localStats.misses,
          redis: redisStats.misses
        },
        size: {
          local: localStats.size,
          redis: redisStats.size
        },
        performance: {
          avgLatency: await this.calculateAverageLatency(),
          hitRate: this.calculateHitRate(localStats, redisStats)
        }
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      throw error;
    }
  }

  private async warmupKey(
    key: string
  ): Promise<void> {
    const value = await this.redisService.get(key);
    if (value) {
      await this.setToLocalCache(key, value);
    }
  }

  private async compressValue<T>(
    value: T
  ): Promise<any> {
    // Implement compression logic
    return value;
  }

  private async updateCacheStats(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    source?: 'local' | 'redis'
  ): Promise<void> {
    try {
      await this.statsModel.create({
        operation,
        source,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error updating cache stats:', error);
    }
  }

  private initializeCacheConfig(): void {
    this.cacheConfig = {
      policy: this.configService.get('cache.evictionPolicy', 'lru'),
      compression: this.configService.get('cache.compression', false),
      warmup: this.configService.get('cache.warmup', true)
    };
  }

  private calculateHitRate(
    localStats: any,
    redisStats: any
  ): number {
    const totalRequests = 
      localStats.hits + 
      localStats.misses + 
      redisStats.hits + 
      redisStats.misses;

    if (totalRequests === 0) return 0;

    return (localStats.hits + redisStats.hits) / totalRequests;
  }
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compression?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface WarmupResult {
  processed: number;
  success: number;
  failed: number;
  patterns: string[];
}

interface CacheStats {
  hits: {
    total: number;
    local: number;
    redis: number;
  };
  misses: {
    total: number;
    local: number;
    redis: number;
  };
  size: {
    local: number;
    redis: number;
  };
  performance: {
    avgLatency: number;
    hitRate: number;
  };
}

interface CacheEntry<T> {
  value: T;
  ttl: number;
  createdAt: Date;
  lastAccessed?: Date;
  accessCount?: number;
  size?: number;
  tags?: string[];
}

interface CacheConfig {
  policy: 'lru' | 'lfu' | 'fifo';
  compression: boolean;
  warmup: boolean;
  maxSize?: number;
  defaultTTL?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  latency: number[];
  evictions: number;
  errors: number;
} 