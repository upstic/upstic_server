export enum ReportType {
  // Analytics Reports
  JOB_ANALYTICS = 'JOB_ANALYTICS',
  WORKER_ANALYTICS = 'WORKER_ANALYTICS',
  APPLICATION_ANALYTICS = 'APPLICATION_ANALYTICS',
  PLACEMENT_ANALYTICS = 'PLACEMENT_ANALYTICS',
  
  // Staffing Reports
  WORKER_UTILIZATION = 'WORKER_UTILIZATION',
  SHIFT_COVERAGE = 'SHIFT_COVERAGE',
  ATTENDANCE = 'ATTENDANCE',
  TIME_AND_ATTENDANCE = 'TIME_AND_ATTENDANCE',
  
  // Financial Reports
  FINANCIAL = 'FINANCIAL',
  PAYROLL_SUMMARY = 'PAYROLL_SUMMARY',
  BILLING_SUMMARY = 'BILLING_SUMMARY',
  REVENUE_BY_CLIENT = 'REVENUE_BY_CLIENT',
  
  // Performance Reports
  PERFORMANCE = 'PERFORMANCE',
  WORKER_PERFORMANCE = 'WORKER_PERFORMANCE',
  BRANCH_PERFORMANCE = 'BRANCH_PERFORMANCE',
  
  // Compliance Reports
  COMPLIANCE = 'COMPLIANCE',
  CERTIFICATION_STATUS = 'CERTIFICATION_STATUS',
  DOCUMENT_COMPLIANCE = 'DOCUMENT_COMPLIANCE'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv'
}

export interface IReport {
  _id: string;
  type: ReportType;
  format: ReportFormat;
  parameters: {
    startDate: Date;
    endDate: Date;
    format: ReportFormat;
    [key: string]: any;
  };
  status: 'queued' | 'generating' | 'completed' | 'failed';
  result?: {
    fileKey?: string;
    error?: string;
    [key: string]: any;
  };
  metadata: {
    requestedBy: string;
    requestedAt: Date;
    completedAt?: Date;
    duration?: number;
    version: number;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    nextRun?: Date;
    lastRun?: Date;
    recipients: string[];
  };
} 