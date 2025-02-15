import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { ExportService } from '../../services/export.service';
import { NotificationService } from '../../services/notification.service';
import { StorageService } from '../../services/storage.service';

@Injectable()
export class ReportGenerator {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 1000;
  private readonly SUPPORTED_FORMATS = ['pdf', 'csv', 'xlsx', 'json'];

  constructor(
    @InjectModel('Report') private reportModel: Model<any>,
    @InjectModel('ReportTemplate') private templateModel: Model<any>,
    @InjectModel('DataSource') private dataSourceModel: Model<any>,
    private exportService: ExportService,
    private notificationService: NotificationService,
    private storageService: StorageService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async generateReport(
    input: ReportInput
  ): Promise<ReportResponse> {
    try {
      // Validate input
      await this.validateReportInput(input);

      // Create report record
      const report = await this.reportModel.create({
        ...input,
        status: 'processing',
        createdAt: new Date()
      });

      // Process report asynchronously
      this.processReport(report).catch(error => {
        this.logger.error('Error processing report:', error);
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

  async getReportStatus(
    reportId: string
  ): Promise<ReportStatus> {
    const report = await this.reportModel.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    return {
      status: report.status,
      progress: report.progress,
      message: report.statusMessage,
      url: report.url
    };
  }

  async createReportTemplate(
    input: TemplateInput
  ): Promise<TemplateResponse> {
    try {
      // Validate template
      await this.validateTemplate(input);

      // Create template record
      const template = await this.templateModel.create({
        ...input,
        status: 'active',
        createdAt: new Date()
      });

      return {
        success: true,
        templateId: template._id,
        message: 'Template created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating report template:', error);
      throw error;
    }
  }

  private async processReport(report: any): Promise<void> {
    try {
      // Get template
      const template = await this.templateModel.findById(report.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get data sources
      const dataSources = await this.getDataSources(report.dataSources);

      // Fetch and process data
      const data = await this.fetchData(dataSources, report.filters);

      // Apply transformations
      const transformedData = await this.applyTransformations(
        data,
        template.transformations
      );

      // Generate report content
      const content = await this.generateContent(
        transformedData,
        template,
        report.format
      );

      // Export report
      const exportedReport = await this.exportReport(
        content,
        report.format,
        template.styling
      );

      // Store report
      const url = await this.storageService.storeReport(
        exportedReport,
        report._id,
        report.format
      );

      // Update report status
      await this.updateReportStatus(report._id, 'completed', null, url);

      // Send notifications
      await this.notifyReportCompletion(report);

    } catch (error) {
      this.logger.error('Error processing report:', error);
      await this.updateReportStatus(report._id, 'failed', error.message);
      throw error;
    }
  }

  private async fetchData(
    dataSources: any[],
    filters: any
  ): Promise<any[]> {
    const data = await Promise.all(
      dataSources.map(async source => {
        const cacheKey = this.generateCacheKey(source, filters);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) return cached;

        const result = await this.queryDataSource(source, filters);
        await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
        return result;
      })
    );

    return this.mergeData(data);
  }

  private async applyTransformations(
    data: any[],
    transformations: any[]
  ): Promise<any[]> {
    let transformedData = [...data];

    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'filter':
          transformedData = this.applyFilter(
            transformedData,
            transformation.config
          );
          break;
        case 'aggregate':
          transformedData = this.applyAggregation(
            transformedData,
            transformation.config
          );
          break;
        case 'sort':
          transformedData = this.applySort(
            transformedData,
            transformation.config
          );
          break;
        case 'group':
          transformedData = this.applyGrouping(
            transformedData,
            transformation.config
          );
          break;
      }
    }

    return transformedData;
  }

  private async generateContent(
    data: any[],
    template: any,
    format: string
  ): Promise<any> {
    switch (format) {
      case 'pdf':
        return this.generatePDFContent(data, template);
      case 'csv':
        return this.generateCSVContent(data, template);
      case 'xlsx':
        return this.generateExcelContent(data, template);
      case 'json':
        return this.generateJSONContent(data, template);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async exportReport(
    content: any,
    format: string,
    styling: any
  ): Promise<Buffer> {
    return this.exportService.export(content, format, styling);
  }

  private async updateReportStatus(
    reportId: string,
    status: string,
    message?: string,
    url?: string
  ): Promise<void> {
    await this.reportModel.findByIdAndUpdate(
      reportId,
      {
        status,
        statusMessage: message,
        url,
        updatedAt: new Date()
      }
    );
  }

  private generateCacheKey(
    source: any,
    filters: any
  ): string {
    return `report:data:${source.id}:${JSON.stringify(filters)}`;
  }

  private async notifyReportCompletion(
    report: any
  ): Promise<void> {
    await this.notificationService.notify({
      type: 'REPORT_COMPLETED',
      userId: report.userId,
      data: {
        reportId: report._id,
        reportName: report.name,
        url: report.url
      }
    });
  }
}

interface ReportInput {
  name: string;
  templateId: string;
  dataSources: string[];
  filters?: Record<string, any>;
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
  };
  recipients?: string[];
}

interface TemplateInput {
  name: string;
  description?: string;
  type: string;
  content: any;
  transformations: Array<{
    type: 'filter' | 'aggregate' | 'sort' | 'group';
    config: any;
  }>;
  styling?: {
    theme?: string;
    fonts?: Record<string, string>;
    colors?: Record<string, string>;
    layout?: any;
  };
}

interface ReportResponse {
  success: boolean;
  reportId: string;
  message: string;
}

interface TemplateResponse {
  success: boolean;
  templateId: string;
  message: string;
}

interface ReportStatus {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  url?: string;
}

interface DataSourceConfig {
  id: string;
  type: string;
  config: Record<string, any>;
  mapping?: Record<string, string>;
}

interface TransformationConfig {
  type: string;
  config: Record<string, any>;
}

interface ExportConfig {
  format: string;
  styling?: Record<string, any>;
} 