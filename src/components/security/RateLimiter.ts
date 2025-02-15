import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Logger } from '../../utils/logger';

@Injectable()
export class RateLimiterComponent {
  private limiters: Map<string, RateLimiterRedis> = new Map();
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    private logger: Logger
  ) {
    this.initializeRedis();
    this.setupDefaultLimiters();
  }

  private initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD'),
      keyPrefix: 'ratelimit:'
    });
  }

  private setupDefaultLimiters() {
    // API rate limiter
    this.createLimiter('api', {
      points: 100, // Number of points
      duration: 60, // Per 60 seconds
      blockDuration: 60 // Block for 60 seconds if exceeded
    });

    // Login rate limiter
    this.createLimiter('login', {
      points: 5, // 5 attempts
      duration: 300, // Per 5 minutes
      blockDuration: 300 // Block for 5 minutes if exceeded
    });

    // File upload rate limiter
    this.createLimiter('upload', {
      points: 10, // 10 uploads
      duration: 3600, // Per hour
      blockDuration: 3600 // Block for 1 hour if exceeded
    });

    // Search rate limiter
    this.createLimiter('search', {
      points: 30, // 30 searches
      duration: 60, // Per minute
      blockDuration: 60 // Block for 1 minute if exceeded
    });
  }

  createLimiter(
    name: string,
    options: RateLimiterOptions
  ): void {
    try {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `${name}_`,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration,
        insuranceLimiter: new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: `${name}_insurance_`,
          points: options.points,
          duration: options.duration,
          blockDuration: options.blockDuration
        })
      });

      this.limiters.set(name, limiter);
    } catch (error) {
      this.logger.error(`Error creating rate limiter ${name}:`, error);
      throw error;
    }
  }

  async consume(
    name: string,
    key: string,
    points: number = 1
  ): Promise<RateLimitResult> {
    try {
      const limiter = this.limiters.get(name);
      if (!limiter) {
        throw new Error(`Rate limiter ${name} not found`);
      }

      const result = await limiter.consume(key, points);
      
      return {
        success: true,
        remainingPoints: result.remainingPoints,
        msBeforeNext: result.msBeforeNext
      };
    } catch (error) {
      if (error.remainingPoints !== undefined) {
        return {
          success: false,
          remainingPoints: error.remainingPoints,
          msBeforeNext: error.msBeforeNext,
          isBlocked: true
        };
      }
      
      this.logger.error(`Error consuming rate limit ${name}:`, error);
      throw error;
    }
  }

  async get(name: string, key: string): Promise<RateLimitInfo> {
    try {
      const limiter = this.limiters.get(name);
      if (!limiter) {
        throw new Error(`Rate limiter ${name} not found`);
      }

      const result = await limiter.get(key);
      
      return result ? {
        remainingPoints: result.remainingPoints,
        msBeforeNext: result.msBeforeNext,
        consumedPoints: result.consumedPoints
      } : null;
    } catch (error) {
      this.logger.error(`Error getting rate limit info ${name}:`, error);
      throw error;
    }
  }

  async delete(name: string, key: string): Promise<void> {
    try {
      const limiter = this.limiters.get(name);
      if (!limiter) {
        throw new Error(`Rate limiter ${name} not found`);
      }

      await limiter.delete(key);
    } catch (error) {
      this.logger.error(`Error deleting rate limit ${name}:`, error);
      throw error;
    }
  }

  async reset(name: string): Promise<void> {
    try {
      const limiter = this.limiters.get(name);
      if (!limiter) {
        throw new Error(`Rate limiter ${name} not found`);
      }

      await this.redis.del(`${name}_*`);
    } catch (error) {
      this.logger.error(`Error resetting rate limiter ${name}:`, error);
      throw error;
    }
  }
}

interface RateLimiterOptions {
  points: number;
  duration: number;
  blockDuration: number;
}

interface RateLimitResult {
  success: boolean;
  remainingPoints: number;
  msBeforeNext: number;
  isBlocked?: boolean;
}

interface RateLimitInfo {
  remainingPoints: number;
  msBeforeNext: number;
  consumedPoints: number;
} 