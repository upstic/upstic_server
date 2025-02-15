import mongoose, { Schema } from 'mongoose';

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

export interface IReport {
  type: ReportType;
  name: string;
  description?: string;
  parameters: {
    startDate: Date;
    endDate: Date;
    clientId?: string;
    branchId?: string;
    workerId?: string;
    filters?: Record<string, any>;
    groupBy?: string[];
    sortBy?: string;
    format: ReportFormat;
  };
  status: ReportStatus;
  progress?: number;
  result?: {
    fileUrl?: string;
    fileKey?: string;
    summary?: Record<string, any>;
    error?: string;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
    recipients: string[];
    lastRun?: Date;
    nextRun?: Date;
  };
  metadata: {
    requestedBy: string;
    requestedAt: Date;
    completedAt?: Date;
    duration?: number;
    version: number;
  };
}

const reportSchema = new Schema<IReport>({
  type: {
    type: String,
    enum: Object.values(ReportType),
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  parameters: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    clientId: String,
    branchId: String,
    workerId: String,
    filters: {
      type: Map,
      of: Schema.Types.Mixed
    },
    groupBy: [String],
    sortBy: String,
    format: {
      type: String,
      enum: Object.values(ReportFormat),
      required: true
    }
  },
  status: {
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.QUEUED
  },
  progress: {
    type: Number,
    min: 0,
    max: 100
  },
  result: {
    fileUrl: String,
    fileKey: String,
    summary: {
      type: Map,
      of: Schema.Types.Mixed
    },
    error: String
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    time: String,
    timezone: String,
    recipients: [String],
    lastRun: Date,
    nextRun: Date
  },
  metadata: {
    requestedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    duration: Number,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ 'metadata.requestedBy': 1 });
reportSchema.index({ 'schedule.nextRun': 1 });
reportSchema.index({ 'parameters.startDate': 1, 'parameters.endDate': 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);