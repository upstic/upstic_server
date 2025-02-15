import { Request } from 'express';
import axios from 'axios';
import { redis } from '../../utils/redis';
import { logger } from '../../utils/logger';
import { CacheStrategies } from './strategies';

interface WarmupConfig {
  urls: string[];
  interval: number;
  strategy: string;
  concurrency: number;
}

export class CacheWarmer {
  private static isWarming = false;
  private static warmupQueue: string[] = [];

  static async warmCache(config: WarmupConfig): Promise<void> {
    if (this.isWarming) {
      logger.warn('Cache warming already in progress');
      return;
    }

    this.isWarming = true;
    logger.info('Starting cache warmup');

    try {
      // Process URLs in chunks for concurrency control
      const chunks = this.chunkArray(config.urls, config.concurrency);

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(url => this.warmUrl(url, config.strategy))
        );
      }

      // Schedule next warmup
      setTimeout(() => {
        this.warmCache(config).catch(error => {
          logger.error('Scheduled cache warmup failed:', error);
        });
      }, config.interval);

    } catch (error) {
      logger.error('Cache warmup failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  private static async warmUrl(url: string, strategy: string): Promise<void> {
    try {
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'X-Cache-Warm': '1'
        }
      });

      const key = CacheStrategies.getStrategy(strategy).getKey({
        path: url,
        query: {}
      } as Request);

      await redis.setex(
        key,
        CacheStrategies.getStrategy(strategy).getTTL({} as Request),
        JSON.stringify(response.data)
      );

      logger.debug('Warmed cache for URL:', { url, key });
    } catch (error) {
      logger.error('Failed to warm cache for URL:', { url, error });
    }
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    return array.reduce((chunks: T[][], item: T, index: number) => {
      const chunkIndex = Math.floor(index / size);
      if (!chunks[chunkIndex]) {
        chunks[chunkIndex] = [];
      }
      chunks[chunkIndex].push(item);
      return chunks;
    }, []);
  }

  static addToWarmupQueue(url: string): void {
    if (!this.warmupQueue.includes(url)) {
      this.warmupQueue.push(url);
    }
  }

  static async processWarmupQueue(): Promise<void> {
    if (this.warmupQueue.length === 0) return;

    const urls = [...this.warmupQueue];
    this.warmupQueue = [];

    await this.warmCache({
      urls,
      interval: 0,
      strategy: 'highTraffic',
      concurrency: 5
    });
  }
} 