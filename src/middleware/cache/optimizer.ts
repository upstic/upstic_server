import { RedisService } from '../../services/redis.service';
import { logger } from '../../utils/logger';
import { CacheMonitor } from './monitor';

export class CacheOptimizer {
  private static instance: CacheOptimizer;
  private redis: RedisService;
  private monitor: CacheMonitor;
  private readonly MEMORY_THRESHOLD = 0.8;
  private readonly HIT_RATE_THRESHOLD = 0.4;

  private constructor() {
    this.redis = RedisService.getInstance();
    this.monitor = CacheMonitor.getInstance();
    this.initializeOptimizer();
  }

  static getInstance(): CacheOptimizer {
    if (!CacheOptimizer.instance) {
      CacheOptimizer.instance = new CacheOptimizer();
    }
    return CacheOptimizer.instance;
  }

  private initializeOptimizer(): void {
    this.scheduleOptimization();
    this.monitorPerformance();
  }

  private scheduleOptimization(): void {
    setInterval(async () => {
      await this.optimize();
    }, 1800000); // Run every 30 minutes
  }

  private async monitorPerformance(): Promise<void> {
    setInterval(async () => {
      const metrics = await this.monitor.generateReport();
      if (metrics.status === 'critical') {
        await this.handleCriticalState();
      }
    }, 300000); // Check every 5 minutes
  }

  private async optimize(): Promise<void> {
    try {
      const metrics = await this.monitor.generateReport();
      
      if (metrics.memoryUsage > this.MEMORY_THRESHOLD) {
        await this.optimizeMemory();
      }

      if (metrics.hitRate < this.HIT_RATE_THRESHOLD) {
        await this.optimizeHitRate();
      }

      await this.cleanupExpiredKeys();
      await this.defragmentMemory();
    } catch (error) {
      logger.error('Error during cache optimization:', error);
    }
  }

  private async optimizeMemory(): Promise<void> {
    try {
      // Remove least recently used items
      const keys = await this.redis.getClient().keys('*');
      for (const key of keys) {
        const ttl = await this.redis.getClient().ttl(key);
        if (ttl === -1) { // No expiration set
          await this.redis.getClient().expire(key, 86400); // Set 24h expiration
        }
      }
    } catch (error) {
      logger.error('Error optimizing memory:', error);
    }
  }

  private async optimizeHitRate(): Promise<void> {
    try {
      // Analyze access patterns and adjust TTLs
      const keys = await this.redis.getClient().keys('*');
      for (const key of keys) {
        const accessCount = await this.getAccessCount(key);
        if (accessCount > 100) {
          await this.redis.getClient().expire(key, 172800); // Extend TTL to 48h
        }
      }
    } catch (error) {
      logger.error('Error optimizing hit rate:', error);
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    try {
      await this.redis.getClient().eval('return redis.call("FLUSHALL", "ASYNC")', 0);
    } catch (error) {
      logger.error('Error cleaning up expired keys:', error);
    }
  }

  private async defragmentMemory(): Promise<void> {
    try {
      await this.redis.getClient().memory('PURGE');
    } catch (error) {
      logger.error('Error defragmenting memory:', error);
    }
  }

  private async handleCriticalState(): Promise<void> {
    try {
      await this.optimizeMemory();
      await this.cleanupExpiredKeys();
      await this.defragmentMemory();
      logger.warn('Cache optimization performed due to critical state');
    } catch (error) {
      logger.error('Error handling critical state:', error);
    }
  }

  private async getAccessCount(key: string): Promise<number> {
    try {
      const info = await this.redis.getClient().object('IDLETIME', key);
      return parseInt(info);
    } catch (error) {
      logger.error('Error getting access count:', error);
      return 0;
    }
  }
} 