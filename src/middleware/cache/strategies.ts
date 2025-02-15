import { RedisService } from '../../services/redis.service';
import { logger } from '../../utils/logger';

export enum CacheStrategy {
  SIMPLE = 'simple',
  SLIDING_WINDOW = 'sliding_window',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  READ_THROUGH = 'read_through'
}

export interface CacheConfig {
  strategy: CacheStrategy;
  ttl?: number;
  maxSize?: number;
  updateInterval?: number;
}

export class CacheStrategies {
  private static instance: CacheStrategies;
  private redis: RedisService;
  private writeQueue: Map<string, any>;
  private readonly DEFAULT_TTL = 3600; // 1 hour

  private constructor() {
    this.redis = RedisService.getInstance();
    this.writeQueue = new Map();
    this.initializeWriteBehindProcessor();
  }

  static getInstance(): CacheStrategies {
    if (!CacheStrategies.instance) {
      CacheStrategies.instance = new CacheStrategies();
    }
    return CacheStrategies.instance;
  }

  async get(key: string, strategy: CacheStrategy = CacheStrategy.SIMPLE): Promise<any> {
    try {
      switch (strategy) {
        case CacheStrategy.SLIDING_WINDOW:
          return await this.getSlidingWindow(key);
        case CacheStrategy.READ_THROUGH:
          return await this.getReadThrough(key);
        default:
          return await this.redis.getClient().get(key);
      }
    } catch (error) {
      logger.error(`Error getting cache with strategy ${strategy}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, config: CacheConfig): Promise<void> {
    try {
      switch (config.strategy) {
        case CacheStrategy.WRITE_THROUGH:
          await this.setWriteThrough(key, value, config.ttl);
          break;
        case CacheStrategy.WRITE_BEHIND:
          await this.setWriteBehind(key, value);
          break;
        case CacheStrategy.SLIDING_WINDOW:
          await this.setSlidingWindow(key, value, config.ttl);
          break;
        default:
          await this.setSimple(key, value, config.ttl);
      }
    } catch (error) {
      logger.error(`Error setting cache with strategy ${config.strategy}:`, error);
    }
  }

  private async setSimple(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.redis.getClient().setex(key, ttl, JSON.stringify(value));
  }

  private async setSlidingWindow(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.redis.getClient().setex(key, ttl, JSON.stringify(value));
    await this.redis.getClient().zadd('sliding_window', Date.now(), key);
  }

  private async setWriteThrough(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    // Simultaneously update cache and database
    await Promise.all([
      this.redis.getClient().setex(key, ttl, JSON.stringify(value)),
      this.updateDatabase(key, value)
    ]);
  }

  private async setWriteBehind(key: string, value: any): Promise<void> {
    // Add to write queue
    this.writeQueue.set(key, value);
    // Update cache immediately
    await this.redis.getClient().set(key, JSON.stringify(value));
  }

  private async getSlidingWindow(key: string): Promise<any> {
    const value = await this.redis.getClient().get(key);
    if (value) {
      // Reset expiration and update access time
      await this.redis.getClient().expire(key, this.DEFAULT_TTL);
      await this.redis.getClient().zadd('sliding_window', Date.now(), key);
    }
    return value ? JSON.parse(value) : null;
  }

  private async getReadThrough(key: string): Promise<any> {
    let value = await this.redis.getClient().get(key);
    if (!value) {
      // Fetch from database if not in cache
      value = await this.fetchFromDatabase(key);
      if (value) {
        await this.redis.getClient().setex(key, this.DEFAULT_TTL, JSON.stringify(value));
      }
    }
    return value ? JSON.parse(value) : null;
  }

  private async updateDatabase(key: string, value: any): Promise<void> {
    // Implement database update logic
    logger.info(`Database updated for key: ${key}`);
  }

  private async fetchFromDatabase(key: string): Promise<any> {
    // Implement database fetch logic
    logger.info(`Fetched from database for key: ${key}`);
    return null;
  }

  private initializeWriteBehindProcessor(): void {
    setInterval(async () => {
      if (this.writeQueue.size > 0) {
        const batch = new Map(this.writeQueue);
        this.writeQueue.clear();
        
        for (const [key, value] of batch) {
          try {
            await this.updateDatabase(key, value);
          } catch (error) {
            logger.error(`Error processing write-behind for key ${key}:`, error);
            // Re-queue failed items
            this.writeQueue.set(key, value);
          }
        }
      }
    }, 5000); // Process every 5 seconds
  }
}