import { Document } from 'mongoose';
import { ReportType, ReportFormat } from '../types/report.types';
import { ReportStatus } from '../models/Report';

export interface IReport extends Document {
  type: ReportType;
  name: string;
  description?: string;
  format: ReportFormat;
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
  metadata: {
    requestedBy: string;
    requestedAt: Date;
    completedAt?: Date;
    duration?: number;
    version: number;
    attempts?: number;
    jobId?: string;
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
}
