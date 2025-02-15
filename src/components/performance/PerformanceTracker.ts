import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { MetricsService } from '../../services/metrics.service';
import { AlertService } from '../../services/alert.service';
import { VisualizationService } from '../../services/visualization.service';

@Injectable()
export class PerformanceTracker {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly ALERT_THRESHOLDS = {
    cpu: 80, // percentage
    memory: 85, // percentage
    latency: 1000, // milliseconds
    errorRate: 5 // percentage
  };

  constructor(
    @InjectModel('Metric') private metricModel: Model<any>,
    @InjectModel('Alert') private alertModel: Model<any>,
    @InjectModel('Report') private reportModel: Model<any>,
    private metricsService: MetricsService,
    private alertService: AlertService,
    private visualizationService: VisualizationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async trackMetric(
    input: MetricInput
  ): Promise<MetricResponse> {
    try {
      // Validate metric data
      this.validateMetric(input);

      // Store metric
      const metric = await this.metricModel.create({
        ...input,
        timestamp: new Date()
      });

      // Process metric asynchronously
      this.processMetric(metric).catch(error => {
        this.logger.error('Error processing metric:', error);
      });

      return {
        success: true,
        metricId: metric._id,
        timestamp: metric.timestamp
      };
    } catch (error) {
      this.logger.error('Error tracking metric:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(
    input: PerformanceQuery
  ): Promise<PerformanceResponse> {
    const cacheKey = this.generateMetricsCacheKey(input);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get raw metrics
      const metrics = await this.queryMetrics(input);

      // Calculate statistics
      const statistics = this.calculateStatistics(metrics);

      // Generate insights
      const insights = await this.generateInsights(metrics);

      // Check for anomalies
      const anomalies = await this.detectAnomalies(metrics);

      const response = {
        metrics,
        statistics,
        insights,
        anomalies,
        metadata: this.generateMetricsMetadata(input)
      };

      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
      return response;
    } catch (error) {
      this.logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async generatePerformanceReport(
    input: ReportInput
  ): Promise<ReportResponse> {
    try {
      // Create report record
      const report = await this.reportModel.create({
        ...input,
        status: 'processing',
        createdAt: new Date()
      });

      // Generate report asynchronously
      this.generateReport(report).catch(error => {
        this.logger.error('Error generating report:', error);
        this.updateReportStatus(report._id, 'failed', error.message);
      });

      return {
        success: true,
        reportId: report._id,
        message: 'Report generation initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating report generation:', error);
      throw error;
    }
  }

  async configureAlerts(
    input: AlertConfig
  ): Promise<AlertConfigResponse> {
    try {
      const config = await this.alertModel.findOneAndUpdate(
        { type: input.type },
        { ...input, updatedAt: new Date() },
        { upsert: true, new: true }
      );

      return {
        success: true,
        configId: config._id,
        message: 'Alert configuration updated successfully'
      };
    } catch (error) {
      this.logger.error('Error configuring alerts:', error);
      throw error;
    }
  }

  private async processMetric(
    metric: any
  ): Promise<void> {
    try {
      // Check thresholds
      await this.checkThresholds(metric);

      // Update statistics
      await this.updateStatistics(metric);

      // Check for anomalies
      const isAnomaly = await this.checkForAnomaly(metric);
      if (isAnomaly) {
        await this.handleAnomaly(metric);
      }

      // Store processed metric
      await this.storeProcessedMetric(metric);

    } catch (error) {
      this.logger.error('Error processing metric:', error);
      throw error;
    }
  }

  private async generateReport(
    report: any
  ): Promise<void> {
    try {
      // Get report data
      const data = await this.getReportData(report);

      // Generate visualizations
      const visualizations = await this.generateVisualizations(
        data,
        report.visualizations
      );

      // Compile report
      const compiledReport = await this.compileReport(
        report,
        data,
        visualizations
      );

      // Store report
      const url = await this.storeReport(compiledReport);

      // Update report status
      await this.updateReportStatus(
        report._id,
        'completed',
        null,
        { url }
      );

    } catch (error) {
      this.logger.error('Error generating report:', error);
      throw error;
    }
  }

  private async checkThresholds(
    metric: any
  ): Promise<void> {
    const threshold = this.ALERT_THRESHOLDS[metric.type];
    if (!threshold) return;

    if (metric.value > threshold) {
      await this.alertService.createAlert({
        type: 'threshold_exceeded',
        severity: this.calculateAlertSeverity(metric.value, threshold),
        metric: metric.type,
        value: metric.value,
        threshold,
        timestamp: new Date()
      });
    }
  }

  private calculateAlertSeverity(
    value: number,
    threshold: number
  ): 'low' | 'medium' | 'high' {
    const deviation = (value - threshold) / threshold;
    if (deviation > 0.5) return 'high';
    if (deviation > 0.2) return 'medium';
    return 'low';
  }

  private generateMetricsCacheKey(
    input: PerformanceQuery
  ): string {
    return `performance:metrics:${JSON.stringify(input)}`;
  }
}

interface MetricInput {
  type: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface MetricResponse {
  success: boolean;
  metricId: string;
  timestamp: Date;
}

interface PerformanceQuery {
  metrics: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  interval?: string;
  filters?: Record<string, any>;
}

interface PerformanceResponse {
  metrics: Array<{
    timestamp: Date;
    values: Record<string, number>;
  }>;
  statistics: {
    summary: Record<string, {
      min: number;
      max: number;
      avg: number;
      p95: number;
    }>;
    trends: Record<string, {
      direction: 'up' | 'down' | 'stable';
      change: number;
    }>;
  };
  insights: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }>;
  anomalies: Array<{
    metric: string;
    timestamp: Date;
    value: number;
    expectedValue: number;
    deviation: number;
  }>;
  metadata: {
    timeframe: {
      start: Date;
      end: Date;
    };
    resolution: string;
    dataPoints: number;
  };
}

interface ReportInput {
  name: string;
  metrics: string[];
  timeframe: {
    start: Date;
    end: Date;
  };
  visualizations: Array<{
    type: string;
    metric: string;
    options?: Record<string, any>;
  }>;
  format: 'pdf' | 'html' | 'json';
}

interface ReportResponse {
  success: boolean;
  reportId: string;
  message: string;
}

interface AlertConfig {
  type: string;
  thresholds: {
    warning: number;
    critical: number;
  };
  notifications: {
    channels: string[];
    frequency: string;
  };
  enabled: boolean;
}

interface AlertConfigResponse {
  success: boolean;
  configId: string;
  message: string;
} 