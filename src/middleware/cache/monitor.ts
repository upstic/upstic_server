import { Request, Response } from 'express';
import { redis } from '../../utils/redis';
import { logger } from '../../utils/logger';
import { Gauge, Counter, Histogram } from 'prom-client';
import { EventEmitter } from 'events';
import { RedisService } from '../../services/redis.service';

interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  latency: number;
  errors: number;
  evictions: number;
  memory: number;
  hitRatio: number;
}

interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class CacheMonitor {
  private static instance: CacheMonitor;
  private redis: RedisService;
  private metrics: Map<string, any>;

  private constructor() {
    this.redis = RedisService.getInstance();
    this.metrics = new Map();
    this.initializeMonitoring();
  }

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  private initializeMonitoring(): void {
    this.trackHitRate();
    this.trackMemoryUsage();
    this.trackKeyspace();
    this.trackLatency();
  }

  private async trackHitRate(): Promise<void> {
    try {
      const info = await this.redis.getClient().info('stats');
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)[1]);
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)[1]);
      const hitRate = hits / (hits + misses);
      this.metrics.set('hitRate', hitRate);
    } catch (error) {
      logger.error('Error tracking cache hit rate:', error);
    }
  }

  private async trackMemoryUsage(): Promise<void> {
    try {
      const info = await this.redis.getClient().info('memory');
      const usedMemory = parseInt(info.match(/used_memory:(\d+)/)[1]);
      const maxMemory = parseInt(info.match(/maxmemory:(\d+)/)[1]);
      const memoryUsage = usedMemory / maxMemory;
      this.metrics.set('memoryUsage', memoryUsage);
    } catch (error) {
      logger.error('Error tracking memory usage:', error);
    }
  }

  private async trackKeyspace(): Promise<void> {
    try {
      const keys = await this.redis.getClient().dbSize();
      this.metrics.set('totalKeys', keys);
    } catch (error) {
      logger.error('Error tracking keyspace:', error);
    }
  }

  private async trackLatency(): Promise<void> {
    try {
      const start = Date.now();
      await this.redis.getClient().ping();
      const latency = Date.now() - start;
      this.metrics.set('latency', latency);
    } catch (error) {
      logger.error('Error tracking latency:', error);
    }
  }

  public getMetrics(): Map<string, any> {
    return this.metrics;
  }

  public async generateReport(): Promise<object> {
    await Promise.all([
      this.trackHitRate(),
      this.trackMemoryUsage(),
      this.trackKeyspace(),
      this.trackLatency()
    ]);

    return {
      timestamp: new Date(),
      hitRate: this.metrics.get('hitRate'),
      memoryUsage: this.metrics.get('memoryUsage'),
      totalKeys: this.metrics.get('totalKeys'),
      latency: this.metrics.get('latency'),
      status: this.getHealthStatus()
    };
  }

  private getHealthStatus(): string {
    const memoryUsage = this.metrics.get('memoryUsage');
    const hitRate = this.metrics.get('hitRate');
    const latency = this.metrics.get('latency');

    if (memoryUsage > 0.9 || hitRate < 0.2 || latency > 100) {
      return 'critical';
    } else if (memoryUsage > 0.7 || hitRate < 0.5 || latency > 50) {
      return 'warning';
    }
    return 'healthy';
  }
}

// Export singleton instance
export const cacheMonitor = CacheMonitor.getInstance(); 