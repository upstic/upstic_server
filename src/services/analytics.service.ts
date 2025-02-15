import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IJob, IWorker, IApplication, IShift, IReport, ReportType, ReportStatus, ReportFormat, IClient } from '../interfaces/models.interface';
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
  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>,
    @InjectModel('Shift') private readonly shiftModel: Model<IShift>,
    @InjectModel('Report') private readonly reportModel: Model<IReport>,
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
    private readonly notificationService: NotificationService,
    @InjectModel('Client') private readonly clientModel: Model<IClient>
  ) {}

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
  }): Promise<IReport> {
    let createdReport: IReport;
    
    try {
      createdReport = await this.reportModel.create({
        status: ReportStatus.GENERATING,
        format: options.format,
        type: options.type,
        createdAt: new Date()
      });

      const metrics = await this.getMetrics(options);
      const buffer = await this.formatReport(metrics, options.format);

      // Update report with generated file
      const updatedReport = await this.reportModel.findByIdAndUpdate(
        createdReport._id,
        {
          status: ReportStatus.COMPLETED,
          generatedFileUrl: await this.uploadFile(buffer, options.format),
          lastGenerated: new Date()
        },
        { new: true }
      );

      // Notify recipients
      if (updatedReport.recipients?.length) {
        for (const recipient of updatedReport.recipients) {
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

        case ReportType.PLACEMENT:
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
      switch (format) {
        case ReportFormat.PDF:
          return generatePDF(data, columns);
        case ReportFormat.EXCEL:
          return generateExcel(data, columns);
        case ReportFormat.CSV:
          return Buffer.from(this.generateCSV(data, columns));
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error formatting report:', { error, format });
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
}