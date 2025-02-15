import { Injectable } from '@nestjs/common';
import { Report, ReportParameters } from './interfaces/report.interface';
import { ReportType } from './interfaces/report-type.enum';

@Injectable()
export class ReportingService {
  private reports: Report[] = [];

  async generatePayrollSummary(params: ReportParameters): Promise<Report> {
    const report: Report = {
      id: this.generateReportId(),
      type: ReportType.PAYROLL_SUMMARY,
      title: 'Payroll Summary Report',
      description: 'Summary of payroll data for the specified period',
      parameters: params,
      format: params.format || 'pdf',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.userId || 'system'
    };

    this.reports.push(report);
    return report;
  }

  async generateWorkerPerformance(params: ReportParameters): Promise<Report> {
    const report: Report = {
      id: this.generateReportId(),
      type: ReportType.WORKER_PERFORMANCE,
      title: 'Worker Performance Report',
      description: 'Detailed performance metrics for workers',
      parameters: params,
      format: params.format || 'pdf',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.userId || 'system'
    };

    this.reports.push(report);
    return report;
  }

  async generateDocumentCompliance(params: ReportParameters): Promise<Report> {
    const report: Report = {
      id: this.generateReportId(),
      type: ReportType.DOCUMENT_COMPLIANCE,
      title: 'Document Compliance Report',
      description: 'Status of worker document compliance',
      parameters: params,
      format: params.format || 'pdf',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.userId || 'system'
    };

    this.reports.push(report);
    return report;
  }

  async generateWorkerUtilization(params: ReportParameters): Promise<Report> {
    const report: Report = {
      id: this.generateReportId(),
      type: ReportType.WORKER_UTILIZATION,
      title: 'Worker Utilization Report',
      description: 'Analysis of worker utilization rates',
      parameters: params,
      format: params.format || 'pdf',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.userId || 'system'
    };

    this.reports.push(report);
    return report;
  }

  async getReport(reportId: string): Promise<Report | undefined> {
    return this.reports.find(report => report.id === reportId);
  }

  private generateReportId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
