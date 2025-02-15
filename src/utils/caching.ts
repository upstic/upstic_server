import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Logger } from './logger';

@Injectable()
export class CacheUtils {
  private redis!: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor(
    private configService: ConfigService,
    private logger: Logger
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttl: number = this.DEFAULT_TTL
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  async clearPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      this.logger.error(`Cache clear pattern error for ${pattern}:`, error);
      return false;
    }
  }

  async increment(key: string, value: number = 1): Promise<number | null> {
    try {
      return await this.redis.incrby(key, value);
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  async decrement(key: string, value: number = 1): Promise<number | null> {
    try {
      return await this.redis.decrby(key, value);
    } catch (error) {
      this.logger.error(`Cache decrement error for key ${key}:`, error);
      return null;
    }
  }

  async lock(
    key: string,
    ttl: number = 30
  ): Promise<string | null> {
    const token = Math.random().toString(36).substring(2);
    const locked = await this.redis.set(
      `lock:${key}`,
      token,
      'EX',
      ttl,
      'NX'
    );
    return locked ? token : null;
  }

  async unlock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(
      script,
      1,
      `lock:${key}`,
      token
    );
    return result === 1;
  }

  async tags(tags: string[]): Promise<CacheTag> {
    return new CacheTag(this.redis, tags, this.logger);
  }
}

class CacheTag {
  constructor(
    private redis: Redis,
    private tags: string[],
    private logger: Logger
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const tagVersions = await this.getTagVersions();
      const fullKey = this.getFullKey(key, tagVersions);
      const data = await this.redis.get(fullKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Cache tag get error for key ${key}:`, error);
      return null;
    }
  }

  private async getTagVersions(): Promise<Record<string, string>> {
    const versions = await Promise.all(
      this.tags.map(async tag => {
        const version = await this.redis.get(`tag:${tag}:version`) || '0';
        return [tag, version];
      })
    );
    return Object.fromEntries(versions);
  }

  private getFullKey(
    key: string,
    tagVersions: Record<string, string>
  ): string {
    const tagPart = this.tags
      .map(tag => `${tag}:${tagVersions[tag]}`)
      .join(':');
    return `${tagPart}:${key}`;
  }
} 