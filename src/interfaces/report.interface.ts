export enum ReportType {
  // Staffing Reports
  WORKER_UTILIZATION = 'worker_utilization',
  SHIFT_COVERAGE = 'shift_coverage',
  ATTENDANCE = 'attendance',
  TIME_AND_ATTENDANCE = 'time_and_attendance',
  
  // Financial Reports
  PAYROLL_SUMMARY = 'payroll_summary',
  BILLING_SUMMARY = 'billing_summary',
  REVENUE_BY_CLIENT = 'revenue_by_client',
  
  // Client Reports
  CLIENT_SATISFACTION = 'client_satisfaction',
  CLIENT_USAGE = 'client_usage',
  
  // Compliance Reports
  CERTIFICATION_STATUS = 'certification_status',
  DOCUMENT_COMPLIANCE = 'document_compliance',
  
  // Performance Reports
  WORKER_PERFORMANCE = 'worker_performance',
  BRANCH_PERFORMANCE = 'branch_performance'
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json'
}

export enum ReportStatus {
  QUEUED = 'queued',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ReportSchedule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  nextRun: Date;
  recipients: string[];
}

export interface ReportParameters {
  startDate: Date;
  endDate: Date;
  clientId?: string;
  branchId?: string;
  workerId?: string;
  filters?: Record<string, any>;
}

export interface ReportResult {
  fileKey?: string;
  fileUrl?: string;
  generatedAt?: Date;
  error?: string;
}

export interface IReport {
  _id?: string;
  type: ReportType;
  name: string;
  description?: string;
  format: ReportFormat;
  status: ReportStatus;
  parameters: ReportParameters;
  schedule?: ReportSchedule;
  result?: ReportResult;
  metadata: {
    requestedBy: string;
    requestedAt: Date;
    version: number;
  };
}
