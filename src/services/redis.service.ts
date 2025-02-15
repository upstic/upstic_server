import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '../utils/logger';

const logger = new Logger('RedisService');

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.client.on('error', (err) => logger.error('Redis Client Error', err));
  }

  async onModuleInit() {
    // Connection is handled automatically by ioredis
  }

  // Static methods for backward compatibility
  private static instance: RedisService;

  private static getInstance(): RedisService {
    if (!this.instance) {
      this.instance = new RedisService();
    }
    return this.instance;
  }

  static async get(key: string): Promise<any> {
    return this.getInstance().get(key);
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.getInstance().set(key, value, ttl);
  }

  static async delete(key: string): Promise<void> {
    return this.getInstance().del(key);
  }

  static async deletePattern(pattern: string): Promise<void> {
    return this.getInstance().clearCache(pattern);
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clearCache(pattern: string): Promise<void> {
    const stream = this.client.scanStream({
      match: pattern,
      count: 100
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await this.client.del(...keys);
      }
    });
  }
} 