import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IJob, IWorker, IApplication, IShift, IClient } from '../interfaces/models.interface';
import { IReport } from '../interfaces/report.interface';
import { ReportType, ReportFormat } from '../types/report.types';
import { ReportStatus } from '../models/Report';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Logger } from '../utils/logger';
import { generatePDF } from '../utils/pdf-generator';
import { generateExcel } from '../utils/excel-generator';
import { NotificationService } from './notification.service';

const logger = new Logger('AnalyticsService');

interface PlacementMetric {
  workerId: string;
  clientId: string;
  jobId: string;
  startDate: Date;
  endDate: Date;
  rate: number;
}

interface FinancialMetric {
  workerId: string;
  clientId: string;
  jobId: string;
  date: Date;
  hours: number;
  rate: number;
  total: number;
}

interface MetricsOptions {
  startDate: Date;
  endDate: Date;
  clientId?: string;
  workerId?: string;
}

@Injectable()
export class AnalyticsService {
  private useQueueFallback = false;
  private pendingAnalytics: Map<string, any> = new Map();
  private analyticsProcessingInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>,
    @InjectModel('Shift') private readonly shiftModel: Model<IShift>,
    @InjectModel('Report') private readonly reportModel: Model<IReport>,
    @Optional() @InjectQueue('analytics') private readonly analyticsQueue: Queue | null,
    private readonly notificationService: NotificationService,
    @InjectModel('Client') private readonly clientModel: Model<IClient>
  ) {
    // Check if queue is available, otherwise use fallback
    if (!this.analyticsQueue || !(global as any).REDIS_COMPATIBLE) {
      logger.warn('BullMQ analytics queue not available, using fallback processing mechanism');
      this.useQueueFallback = true;
      this.setupFallbackProcessing();
    } else {
      try {
        // Check if the queue is properly initialized
        this.analyticsQueue.client.ping().then(() => {
          logger.info('BullMQ analytics queue initialized successfully');
        }).catch(error => {
          logger.warn(`BullMQ analytics queue initialization error: ${error.message}`);
          this.useQueueFallback = true;
          this.setupFallbackProcessing();
        });
      } catch (error) {
        logger.warn(`BullMQ analytics queue error: ${error.message}, using fallback mechanism`);
        this.useQueueFallback = true;
        this.setupFallbackProcessing();
      }
    }
  }

  private setupFallbackProcessing() {
    // Set up interval to process analytics in memory when queue is not available
    this.analyticsProcessingInterval = setInterval(async () => {
      if (this.pendingAnalytics.size === 0) return;
      
      logger.debug(`Processing ${this.pendingAnalytics.size} pending analytics tasks using fallback mechanism`);
      
      for (const [id, task] of this.pendingAnalytics.entries()) {
        try {
          logger.info(`Processing analytics task ${id} using fallback mechanism`);
          
          // Process the task
          await this.processAnalyticsTask(task);
          
          // Remove from pending queue after successful processing
          this.pendingAnalytics.delete(id);
        } catch (error) {
          logger.error(`Error processing analytics task ${id} in fallback mode:`, error);
          
          // Increment attempt count
          task.attempts = (task.attempts || 0) + 1;
          
          // If max attempts reached, mark as failed and remove from queue
          if (task.attempts >= 3) {
            logger.warn(`Analytics task ${id} failed after ${task.attempts} attempts, removing from queue`);
            this.pendingAnalytics.delete(id);
            
            // Update report status if this is a report generation task
            if (task.reportId) {
              try {
                await this.reportModel.findByIdAndUpdate(task.reportId, {
                  status: ReportStatus.FAILED,
                  error: error instanceof Error ? error.message : 'Unknown error after multiple attempts'
                });
              } catch (updateError) {
                logger.error(`Failed to update report status for ${task.reportId}:`, updateError);
              }
            }
          }
        }
      }
    }, 10000); // Process every 10 seconds
  }

  private async processAnalyticsTask(task: any): Promise<void> {
    // Implementation depends on task type
    if (task.type === 'generateReport') {
      await this.generateReport(task.options);
    } else if (task.type === 'calculateMetrics') {
      await this.getMetrics(task.options);
    }
    // Add other task types as needed
  }

  async generateReport(options: {
    startDate: Date;
    endDate: Date;
    clientId?: string;
    branchId?: string;
    workerId?: string;
    filters?: Record<string, any>;
    groupBy?: string[];
    sortBy?: string;
    format: ReportFormat;
    type: ReportType;
    requestedBy?: string;
  }): Promise<IReport> {
    let createdReport: IReport;
    
    try {
      createdReport = await this.reportModel.create({
        status: ReportStatus.GENERATING,
        format: options.format,
        type: options.type,
        name: `${options.type} Report`,
        createdAt: new Date(),
        metadata: {
          requestedBy: options.requestedBy || 'system',
          requestedAt: new Date(),
          version: 1,
          attempts: 0
        }
      });

      // If using queue and it's available
      if (!this.useQueueFallback && this.analyticsQueue) {
        await this.analyticsQueue.add('generateReport', {
          reportId: createdReport._id.toString(),
          options
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
        
        return createdReport;
      } 
      
      // Otherwise process directly or add to fallback queue
      if (this.useQueueFallback) {
        // Add to pending tasks for fallback processing
        const taskId = `report_${createdReport._id.toString()}`;
        this.pendingAnalytics.set(taskId, {
          type: 'generateReport',
          reportId: createdReport._id.toString(),
          options,
          attempts: 0
        });
        
        return createdReport;
      }

      // Direct processing if neither queue nor fallback is used
      const metrics = await this.getMetrics(options);
      const buffer = await this.formatReport(metrics, options.format);

      // Update report with generated file
      const updatedReport = await this.reportModel.findByIdAndUpdate(
        createdReport._id,
        {
          status: ReportStatus.COMPLETED,
          generatedFileUrl: await this.uploadFile(buffer, options.format),
          lastGenerated: new Date(),
          'metadata.completedAt': new Date(),
          'metadata.duration': Date.now() - new Date(createdReport.metadata.requestedAt).getTime()
        },
        { new: true }
      );

      // Notify recipients if they exist in the schedule
      if (updatedReport.schedule?.recipients?.length) {
        for (const recipient of updatedReport.schedule.recipients) {
          await this.notificationService.sendReportNotification(
            recipient, 
            updatedReport._id.toString()
          );
        }
      }

      return updatedReport;
    } catch (error) {
      logger.error('Error generating report:', { error, reportId: createdReport?._id });
      
      if (createdReport) {
        await this.reportModel.findByIdAndUpdate(createdReport._id, {
          status: ReportStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw error;
    }
  }

  async getComplianceMetrics(clientId: Types.ObjectId | string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Implementation for compliance metrics
      const metrics = {
        documentComplianceRate: 0,
        certificationValidity: 0,
        incidentReports: 0,
        // Add more metrics as needed
      };

      return metrics;
    } catch (error) {
      logger.error('Error getting compliance metrics:', { error, clientId });
      throw error;
    }
  }

  async getPerformanceMetrics(clientId: Types.ObjectId | string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Implementation for performance metrics
      const metrics = {
        fillRate: 0,
        timeToFill: 0,
        retentionRate: 0,
        // Add more metrics as needed
      };

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', { error, clientId });
      throw error;
    }
  }

  async getMetrics(options: {
    startDate: Date;
    endDate: Date;
    clientId?: string;
    branchId?: string;
    workerId?: string;
    filters?: Record<string, any>;
    groupBy?: string[];
    sortBy?: string;
    format: ReportFormat;
    type: ReportType;
  }): Promise<any[]> {
    try {
      let metrics: any[] = [];

      switch (options.type) {
        case ReportType.COMPLIANCE:
          if (options.clientId) {
            const complianceMetrics = await this.getComplianceMetrics(
              options.clientId.toString(),
              options.startDate,
              options.endDate
            );
            metrics = [complianceMetrics];
          }
          break;

        case ReportType.PERFORMANCE:
          if (options.clientId) {
            const performanceMetrics = await this.getPerformanceMetrics(
              options.clientId.toString(),
              options.startDate,
              options.endDate
            );
            metrics = [performanceMetrics];
          }
          break;

        case ReportType.WORKER_ANALYTICS:
          metrics = await this.getWorkerMetrics(options);
          break;

        case ReportType.PLACEMENT_ANALYTICS:
          metrics = await this.getPlacementMetrics(options);
          break;

        case ReportType.FINANCIAL:
          metrics = await this.getFinancialMetrics(options);
          break;

        default:
          throw new Error(`Unsupported report type: ${options.type}`);
      }

      if (options.groupBy?.length) {
        metrics = this.aggregateMetrics(metrics, options.groupBy);
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting metrics:', { error, options });
      throw error;
    }
  }

  async getPlacementMetrics(options: MetricsOptions): Promise<PlacementMetric[]> {
    try {
      const placements = await this.applicationModel
        .find({
          createdAt: { $gte: options.startDate, $lte: options.endDate },
          ...(options.clientId && { clientId: options.clientId }),
          ...(options.workerId && { workerId: options.workerId }),
          status: 'PLACED'
        })
        .lean<IApplication[]>()
        .exec();

      return placements.map(placement => ({
        workerId: placement.workerId.toString(),
        clientId: placement.clientId.toString(),
        jobId: placement.jobId.toString(),
        startDate: placement.startDate,
        endDate: placement.endDate,
        rate: placement.rate
      }));
    } catch (error) {
      logger.error('Error getting placement metrics:', { error, options });
      throw error;
    }
  }

  async getFinancialMetrics(options: MetricsOptions): Promise<FinancialMetric[]> {
    try {
      const shifts = await this.shiftModel
        .find({
          date: { $gte: options.startDate, $lte: options.endDate },
          ...(options.clientId && { clientId: options.clientId }),
          ...(options.workerId && { workerId: options.workerId }),
          status: 'COMPLETED'
        })
        .lean<IShift[]>()
        .exec();

      return shifts.map(shift => ({
        workerId: shift.workerId.toString(),
        clientId: shift.clientId.toString(),
        jobId: shift.jobId.toString(),
        date: shift.date,
        hours: shift.hours,
        rate: shift.rate,
        total: shift.hours * shift.rate
      }));
    } catch (error) {
      logger.error('Error getting financial metrics:', { error, options });
      throw error;
    }
  }

  async formatReport(data: any[], format: ReportFormat): Promise<Buffer> {
    try {
      const columns = Object.keys(data[0] || {});
      
      // Create a simple report object to pass to the generators
      const reportObj = {
        type: ReportType.JOB_ANALYTICS,
        format,
        data,
        columns
      };
      
      switch (format) {
        case ReportFormat.PDF:
          return generatePDF(reportObj as any);
        case ReportFormat.EXCEL:
          return generateExcel(reportObj as any);
        case ReportFormat.CSV:
          return Buffer.from(this.generateCSV(data, columns));
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error formatting report:', error);
      throw error;
    }
  }

  generateCSV(data: any[], columns: string[]): string {
    const header = columns.join(',') + '\n';
    const rows = data.map(item =>
      columns.map(column => JSON.stringify(item[column] || '')).join(',')
    );
    return header + rows.join('\n');
  }

  async uploadFile(buffer: Buffer, format: string): Promise<string> {
    try {
      // TODO: Implement file upload logic
      // This is a placeholder that returns a dummy URL
      return `https://storage.example.com/reports/${Date.now()}.${format.toLowerCase()}`;
    } catch (error) {
      logger.error('Error uploading file:', { error, format });
      throw error;
    }
  }

  aggregateMetrics(data: any[], groupBy?: string[]): any[] {
    if (!groupBy?.length) return data;

    const groupedData = new Map<string, any>();

    for (const item of data) {
      const key = groupBy.map(field => item[field]).join('|');
      if (!groupedData.has(key)) {
        groupedData.set(key, { ...item });
      } else {
        const existing = groupedData.get(key);
        // Combine numeric values
        for (const [field, value] of Object.entries(item)) {
          if (typeof value === 'number' && !groupBy.includes(field)) {
            existing[field] = (existing[field] || 0) + value;
          }
        }
      }
    }

    return Array.from(groupedData.values());
  }

  async getJobStats(): Promise<IJob[]> {
    return this.jobModel.find().lean();
  }

  async getWorkerStats(): Promise<IWorker[]> {
    return this.workerModel.find().lean();
  }

  async getClientStats(): Promise<IClient[]> {
    return this.clientModel.find().lean();
  }

  // Add worker metrics method
  async getWorkerMetrics(options: MetricsOptions): Promise<any[]> {
    try {
      const query: any = {
        createdAt: {
          $gte: options.startDate,
          $lte: options.endDate
        }
      };
      
      if (options.workerId) {
        query._id = options.workerId;
      }
      
      if (options.clientId) {
        // Find applications for this client
        const applications = await this.applicationModel.find({
          clientId: options.clientId
        }).select('workerId');
        
        const workerIds = applications.map(app => app.workerId);
        query._id = { $in: workerIds };
      }
      
      const workers = await this.workerModel.find(query);
      
      return workers.map(worker => ({
        workerId: worker._id,
        name: `${worker.firstName} ${worker.lastName}`,
        email: worker.email,
        skills: worker.skills,
        experience: worker.experience,
        metrics: worker.metrics
      }));
    } catch (error) {
      logger.error('Error getting worker metrics:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.analyticsProcessingInterval) {
        clearInterval(this.analyticsProcessingInterval);
        this.analyticsProcessingInterval = null;
      }
      
      if (this.analyticsQueue) {
        await this.analyticsQueue.close();
      }
      
      logger.info('Analytics service resources cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up analytics service resources:', error);
    }
  }
}