import { Report, ReportType, ReportFormat, ReportStatus, IReport } from '../models/Report';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Branch } from '../models/Branch';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './notification.service';
import { generateReport } from '../utils/report-generator';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../utils/s3';
import { Queue } from 'bullmq';
import { logger } from '../utils/logger';


export class ReportService {
  private static reportQueue: Queue;
  private static readonly URL_EXPIRY = 3600; // 1 hour
  private static readonly MAX_DATE_RANGE_DAYS = 365;
  private static readonly RETENTION_DAYS = 30;

  static initialize() {
    this.reportQueue = new Queue('reports', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true
      }
    });
  }

  static async requestReport(
    userId: string,
    reportData: Partial<IReport>
  ): Promise<IReport> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate date range
    this.validateDateRange(reportData.parameters?.startDate!, reportData.parameters?.endDate!);

    // Validate client/branch if specified
    if (reportData.parameters?.clientId) {
      const client = await Client.findById(reportData.parameters.clientId);
      if (!client) {
        throw new AppError(404, 'Client not found');
      }
    }

    if (reportData.parameters?.branchId) {
      const branch = await Branch.findById(reportData.parameters.branchId);
      if (!branch) {
        throw new AppError(404, 'Branch not found');
      }
    }

    const report = new Report({
      ...reportData,
      status: ReportStatus.QUEUED,
      metadata: {
        requestedBy: userId,
        requestedAt: new Date(),
        version: 1
      }
    });

    await report.save();

    // Queue report generation
    await this.queueReportGeneration(report);

    return report;
  }

  static async scheduleReport(
    userId: string,
    reportData: Partial<IReport>
  ): Promise<IReport> {
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

  static async getReport(
    reportId: string,
    userId: string
  ): Promise<IReport> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    // Generate signed URL if report is completed and has a file
    if (report.status === ReportStatus.COMPLETED && report.result?.fileKey) {
      report.result.fileUrl = await getSignedUrl(report.result.fileKey, this.URL_EXPIRY);
    }

    return report;
  }

  static async cancelReport(
    reportId: string,
    userId: string
  ): Promise<void> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError(404, 'Report not found');
    }

    if (report.status === ReportStatus.COMPLETED || report.status === ReportStatus.FAILED) {
      throw new AppError(400, 'Cannot cancel completed or failed reports');
    }

    // Remove from queue if scheduled
    if (report.schedule?.nextRun) {
      await this.reportQueue.remove(reportId);
    }

    await report.deleteOne();
  }

  static async processReportQueue(): Promise<void> {
    this.reportQueue.process(async job => {
      const report = await Report.findById(job.data.reportId);
      if (!report) return;

      try {
        report.status = ReportStatus.GENERATING;
        await report.save();

        // Generate report
        const result = await generateReport(report);

        // Upload to S3 if file generated
        if (result.file) {
          const fileKey = `reports/${report._id}/${Date.now()}-report.${report.parameters.format.toLowerCase()}`;
          await uploadToS3(fileKey, result.file, `application/${report.parameters.format.toLowerCase()}`);
          result.fileKey = fileKey;
          delete result.file;
        }

        report.status = ReportStatus.COMPLETED;
        report.result = result;
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

      } catch (error) {
        report.status = ReportStatus.FAILED;
        report.result = { error: error.message };
        await report.save();

        // Notify requestor of failure
        await this.notifyReportFailure(report);

        throw error;
      }
    });
  }

  private static validateDateRange(startDate: Date, endDate: Date): void {
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      throw new AppError(400, 'End date must be after start date');
    }

    if (daysDiff > this.MAX_DATE_RANGE_DAYS) {
      throw new AppError(400, `Date range cannot exceed ${this.MAX_DATE_RANGE_DAYS} days`);
    }
  }

  private static validateScheduleParameters(schedule: NonNullable<IReport['schedule']>): void {
    if (schedule.frequency === 'weekly' && (schedule.dayOfWeek === undefined || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6)) {
      throw new AppError(400, 'Invalid day of week for weekly schedule');
    }

    if (schedule.frequency === 'monthly' && (schedule.dayOfMonth === undefined || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
      throw new AppError(400, 'Invalid day of month for monthly schedule');
    }

    if (!schedule.recipients?.length) {
      throw new AppError(400, 'At least one recipient is required');
    }
  }

  private static calculateNextRunTime(schedule: NonNullable<IReport['schedule']>): Date {
    // Implementation of next run time calculation based on frequency
    // This would handle daily, weekly, and monthly schedules
    // Returns a Date object for the next scheduled run
    return new Date(); // Placeholder
  }

  private static async queueReportGeneration(report: IReport): Promise<void> {
    await this.reportQueue.add(report._id.toString(), {
      reportId: report._id
    }, {
      delay: report.schedule ? this.calculateDelayToNextRun(report.schedule) : 0
    });
  }

  private static calculateDelayToNextRun(schedule: NonNullable<IReport['schedule']>): number {
    if (!schedule.nextRun) return 0;
    return Math.max(0, schedule.nextRun.getTime() - Date.now());
  }

  private static async notifyReportCompletion(report: IReport): Promise<void> {
    const recipients = report.schedule?.recipients || [report.metadata.requestedBy];

    await Promise.all(
      recipients.map(userId =>
        notificationService.send({
          userId,
          title: 'Report Ready',
          body: `Your ${report.name} report is now available`,
          type: 'REPORT_COMPLETED',
          data: { reportId: report._id }
        })
      )
    );
  }

  private static async notifyReportFailure(report: IReport): Promise<void> {
    await notificationService.send({
      userId: report.metadata.requestedBy,
      title: 'Report Generation Failed',
      body: `Failed to generate ${report.name} report`,
      type: 'REPORT_FAILED',
      data: { reportId: report._id, error: report.result?.error }
    });
  }

  static async generateReport(data: {
    type: string;
    startDate: Date;
    endDate: Date;
    generatedBy: string;
    format?: string;
    filters?: Record<string, any>;
  }): Promise<IReport> {
    try {
      // Implementation details for report generation
      const report = new Report({
        ...data,
        data: {} // Generated report data
      });
      
      await report.save();
      logger.info(`Report generated: ${report._id}`);
      
      return report;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw new AppError(500, 'Failed to generate report');
    }
  }

  static async getReport(reportId: string): Promise<IReport> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError(404, 'Report not found');
    }
    return report;
  }
}

// Initialize the service
ReportService.initialize(); 