import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { IReport } from '../interfaces/report.interface';
import { IJob, IUser, IClient } from '../interfaces/models.interface';
import { IWorker } from '../interfaces/models.interface';
import { IApplication } from '../interfaces/models.interface';
import { ReportType, ReportFormat } from '../types/report.types';
import { ReportStatus } from '../models/Report';
import { NotificationService } from './notification.service';
import { generateReport } from '../utils/report-generator';
import { uploadToS3, getSignedUrl } from '../utils/s3';
import { Queue, QueueEvents } from 'bullmq';
import { Logger } from '../utils/logger';
import { DateRangeDto } from '../dtos/date-range.dto';
import { AppError } from '../middleware/errorHandler';
import { NotificationType } from '../types/notification.types';

const logger = new Logger('ReportService');

// Modify the generateReport function to accept our IReport interface
const generateReportWrapper = async (report: any): Promise<any> => {
  return generateReport(report);
};

@Injectable()
export class ReportService implements OnModuleInit {
  private reportQueue: Queue | null = null;
  private queueEvents: QueueEvents | null = null;
  private useQueueFallback = false;
  private pendingReports: Map<string, IReport> = new Map();
  private static readonly URL_EXPIRY = 3600; // 1 hour
  private static readonly MAX_DATE_RANGE_DAYS = 365;
  private static readonly RETENTION_DAYS = 30;
  private reportProcessingInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel('Job') private jobModel: Model<IJob>,
    @InjectModel('Worker') private workerModel: Model<IWorker>,
    @InjectModel('Application') private applicationModel: Model<IApplication>,
    @InjectModel('Report') private reportModel: Model<IReport>,
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel('Client') private clientModel: Model<IClient>,
    private readonly notificationService: NotificationService
  ) {}

  async onModuleInit() {
    try {
      // Check if Redis is compatible before initializing the queue
      if (!(global as any).REDIS_COMPATIBLE) {
        logger.warn('Redis is not compatible with BullMQ, using fallback mechanism');
        this.useQueueFallback = true;
        this.setupFallbackProcessing();
        return;
      }

      // Initialize the queue in constructor instead of static method
      this.reportQueue = new Queue('reports', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: true
        }
      });
      
      this.queueEvents = new QueueEvents('reports', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      });
      
      this.setupQueueProcessing();
      logger.info('Report queue initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize BullMQ queue, using fallback mechanism', error);
      this.useQueueFallback = true;
      this.setupFallbackProcessing();
    }
  }

  private setupFallbackProcessing() {
    // Process reports every minute as a fallback when Redis is not available
    this.reportProcessingInterval = setInterval(async () => {
      try {
        // Only log if there are pending reports to process
        if (this.pendingReports.size > 0) {
          logger.info(`Processing ${this.pendingReports.size} pending reports using fallback mechanism`);
        } else {
          // Use debug level for empty queue checks to reduce log noise
          logger.debug(`Checking for pending reports (0 found)`);
        }
        
        for (const [reportId, report] of this.pendingReports.entries()) {
          try {
            await this.processReport(report);
            this.pendingReports.delete(reportId);
          } catch (error) {
            logger.error(`Error processing report ${reportId} in fallback mode:`, error);
            
            // Update report status to failed after 3 attempts
            const reportDoc = await this.reportModel.findById(reportId);
            if (reportDoc) {
              // Ensure metadata exists and has attempts property
              if (!reportDoc.metadata) {
                reportDoc.metadata = {
                  requestedBy: reportDoc.metadata?.requestedBy || 'system',
                  requestedAt: reportDoc.metadata?.requestedAt || new Date(),
                  version: reportDoc.metadata?.version || 1,
                  attempts: 0
                };
              }
              
              // Safely access and increment attempts
              const attempts = ((reportDoc.metadata as any).attempts || 0) + 1;
              (reportDoc.metadata as any).attempts = attempts;
              
              if (attempts >= 3) {
                reportDoc.status = ReportStatus.FAILED;
                reportDoc.result = { error: error.message };
                await reportDoc.save();
                this.pendingReports.delete(reportId);
                
                // Notify user of failure
                await this.notifyReportFailure(reportDoc as unknown as IReport);
              } else {
                // Update attempts count
                await this.reportModel.updateOne(
                  { _id: reportId },
                  { $set: { 'metadata.attempts': attempts } }
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error in fallback processing interval:', error);
      }
    }, 60000); // Process every minute
  }

  private setupQueueProcessing(): void {
    try {
      // Use QueueEvents instead of Queue for event listening
      this.queueEvents?.on('completed', async ({ jobId }) => {
        try {
          const report = await this.reportModel.findOne({ 
            'metadata.jobId': jobId 
          });
          
          if (!report) {
            logger.warn(`Report not found for job ID: ${jobId}`);
            return;
          }

          await this.processReport(report);
        } catch (error) {
          logger.error('Error handling completed job:', error);
        }
      });
      
      logger.info('Report queue processing setup complete');
    } catch (error) {
      logger.error('Error setting up queue processing:', error);
      this.useQueueFallback = true;
      this.setupFallbackProcessing();
    }
  }

  private async processReport(report: Document & IReport): Promise<void> {
    try {
      report.status = ReportStatus.GENERATING;
      await report.save();

      // Generate report using our wrapper
      const result = await generateReportWrapper(report);

      // Upload to S3 if file generated
      if (result.file) {
        const fileKey = `reports/${report._id}/${Date.now()}-report.${report.parameters.format.toLowerCase()}`;
        // Use the Buffer directly
        await uploadToS3(result.file, fileKey, `application/${report.parameters.format.toLowerCase()}`);
        
        // Add fileKey to result
        const updatedResult = {
          ...result,
          fileKey,
          fileUrl: undefined,
          summary: {},
          error: undefined
        };
        delete updatedResult.file;
        delete updatedResult.metadata;

        report.status = ReportStatus.COMPLETED;
        report.result = updatedResult;
        report.metadata.completedAt = new Date();
        report.metadata.duration = Date.now() - report.metadata.requestedAt.getTime();

        await report.save();

        // Schedule next run if recurring
        if (report.schedule) {
          const nextRun = this.calculateNextRunTime(report.schedule);
          report.schedule.lastRun = new Date();
          report.schedule.nextRun = nextRun;
          await report.save();
        }

        // Notify requestor
        await this.notifyReportCompletion(report);
      }
    } catch (error) {
      logger.error('Error processing report:', error);
      report.status = ReportStatus.FAILED;
      report.result = { error: error.message };
      await report.save();

      // Notify requestor of failure
      await this.notifyReportFailure(report);
    }
  }

  async requestReport(userId: string, reportData: Partial<IReport>): Promise<IReport> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate date range
    this.validateDateRange(reportData.parameters?.startDate!, reportData.parameters?.endDate!);

    // Validate client if specified
    if (reportData.parameters?.clientId) {
      const client = await this.clientModel.findById(reportData.parameters.clientId);
      if (!client) {
        throw new AppError(404, 'Client not found');
      }
    }

    // Validate branch if specified - check within client model
    if (reportData.parameters?.branchId) {
      const branchExists = await this.clientModel.exists({ 
        'branches._id': reportData.parameters.branchId 
      });
      
      if (!branchExists) {
        throw new AppError(404, 'Branch not found');
      }
    }

    const report = await this.reportModel.create({
      ...reportData,
      status: ReportStatus.QUEUED,
      metadata: {
        requestedBy: userId,
        requestedAt: new Date(),
        version: 1,
        attempts: 0
      }
    });

    // Queue report generation
    await this.queueReportGeneration(report);

    return report;
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (!startDate || !endDate) {
      throw new AppError(400, 'Start date and end date are required');
    }

    if (startDate > endDate) {
      throw new AppError(400, 'Start date must be before end date');
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > ReportService.MAX_DATE_RANGE_DAYS) {
      throw new AppError(400, `Date range cannot exceed ${ReportService.MAX_DATE_RANGE_DAYS} days`);
    }
  }

  private validateScheduleParameters(schedule: NonNullable<IReport['schedule']>): void {
    if (!schedule.frequency) {
      throw new AppError(400, 'Schedule frequency is required');
    }

    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      throw new AppError(400, 'Invalid schedule frequency');
    }

    if (schedule.frequency === 'weekly' && !schedule.dayOfWeek) {
      throw new AppError(400, 'Day of week is required for weekly schedules');
    }

    if (schedule.frequency === 'monthly' && !schedule.dayOfMonth) {
      throw new AppError(400, 'Day of month is required for monthly schedules');
    }
  }

  async scheduleReport(userId: string, reportData: Partial<IReport>): Promise<IReport> {
    if (!reportData.schedule) {
      throw new AppError(400, 'Schedule parameters are required');
    }

    // Validate schedule parameters
    this.validateScheduleParameters(reportData.schedule);

    // Calculate next run time
    const nextRun = this.calculateNextRunTime(reportData.schedule);

    const report = await this.requestReport(userId, {
      ...reportData,
      schedule: {
        ...reportData.schedule,
        nextRun
      }
    });

    return report;
  }

  async getReport(reportId: string, userId: string): Promise<IReport> {
    const report = await this.reportModel.findOne({ 
      _id: reportId, 
      'metadata.requestedBy': userId 
    });
    
    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    // Generate signed URL if report is completed and has a file
    if (report.status === ReportStatus.COMPLETED && report.result?.fileKey) {
      report.result.fileUrl = await getSignedUrl(report.result.fileKey, ReportService.URL_EXPIRY);
    }

    return report;
  }

  async cancelReport(reportId: string, userId: string): Promise<void> {
    const report = await this.reportModel.findOne({ 
      _id: reportId, 
      'metadata.requestedBy': userId 
    });
    
    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    if (report.status === ReportStatus.COMPLETED || report.status === ReportStatus.FAILED) {
      throw new AppError(400, 'Cannot cancel completed or failed reports');
    }

    // Remove from queue if scheduled
    if (this.reportQueue && !this.useQueueFallback) {
      await this.reportQueue.remove(reportId);
    } else if (this.useQueueFallback) {
      this.pendingReports.delete(reportId.toString());
    }

    await report.deleteOne();
  }

  private calculateNextRunTime(schedule: NonNullable<IReport['schedule']>): Date {
    const now = new Date();
    let nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilNextDay = (schedule.dayOfWeek! - now.getDay() + 7) % 7;
        nextRun.setDate(now.getDate() + (daysUntilNextDay === 0 ? 7 : daysUntilNextDay));
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(Math.min(schedule.dayOfMonth!, new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate()));
        break;
    }

    // Set time if specified
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    } else {
      // Default to midnight
      nextRun.setHours(0, 0, 0, 0);
    }

    return nextRun;
  }

  private async queueReportGeneration(report: Document & IReport): Promise<void> {
    const reportId = report._id.toString();
    
    if (this.reportQueue && !this.useQueueFallback) {
      try {
        const jobId = reportId;
        await this.reportQueue.add(jobId, {
          reportId: report._id
        }, {
          delay: report.schedule ? this.calculateDelayToNextRun(report.schedule) : 0,
          jobId
        });
        
        // Store job ID in report metadata for later retrieval
        await this.reportModel.updateOne(
          { _id: report._id },
          { $set: { 'metadata.jobId': jobId } }
        );
        
        logger.info(`Report ${reportId} queued successfully using BullMQ`);
      } catch (error) {
        logger.error(`Error queueing report ${reportId} with BullMQ, falling back to manual processing:`, error);
        this.useQueueFallback = true;
        this.setupFallbackProcessing();
        this.pendingReports.set(reportId, report);
      }
    } else {
      // Use fallback mechanism
      logger.info(`Report ${reportId} queued using fallback mechanism`);
      this.pendingReports.set(reportId, report);
    }
  }

  private calculateDelayToNextRun(schedule: NonNullable<IReport['schedule']>): number {
    if (!schedule.nextRun) return 0;
    return Math.max(0, schedule.nextRun.getTime() - Date.now());
  }

  private async notifyReportCompletion(report: IReport): Promise<void> {
    const recipients = report.schedule?.recipients || [report.metadata.requestedBy];

    await Promise.all(
      recipients.map(userId =>
        this.notificationService.send({
          userId,
          title: 'Report Ready',
          body: `Your ${report.name} report is now available`,
          type: NotificationType.SYSTEM_ALERT,
          data: { reportId: report._id }
        })
      )
    );
  }

  private async notifyReportFailure(report: IReport): Promise<void> {
    await this.notificationService.send({
      userId: report.metadata.requestedBy,
      title: 'Report Generation Failed',
      body: `Failed to generate ${report.name} report`,
      type: NotificationType.SYSTEM_ALERT,
      data: { reportId: report._id, error: report.result?.error }
    });
  }

  async generateJobAnalytics(dateRange: DateRangeDto): Promise<any> {
    const { startDate, endDate } = dateRange;
    
    const [jobs, applications] = await Promise.all([
      this.jobModel.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      this.applicationModel.find({
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    return {
      totalJobs: jobs.length,
      totalApplications: applications.length,
      averageApplicationsPerJob: applications.length / (jobs.length || 1),
      // Add more metrics as needed
    };
  }

  async generateWorkerAnalytics(dateRange: DateRangeDto): Promise<any> {
    // Implementation
    return {};
  }

  async generateApplicationAnalytics(query: DateRangeDto): Promise<any> {
    // Implementation
    return {};
  }

  async generatePlacementAnalytics(query: DateRangeDto): Promise<any> {
    // Implementation
    return {};
  }

  async createReport(userId: string, data: Partial<IReport>): Promise<IReport> {
    return this.requestReport(userId, data);
  }
  
  // Clean up resources when the module is destroyed
  async onModuleDestroy() {
    try {
      if (this.reportProcessingInterval) {
        clearInterval(this.reportProcessingInterval);
        this.reportProcessingInterval = null;
      }
      
      if (this.reportQueue) {
        await this.reportQueue.close();
        this.reportQueue = null;
      }
      
      if (this.queueEvents) {
        await this.queueEvents.close();
        this.queueEvents = null;
      }
      
      logger.info('Report service resources cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up report service resources:', error);
    }
  }
} 