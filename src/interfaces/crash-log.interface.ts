import { Types } from 'mongoose';

export type CrashLogSeverity = 'critical' | 'error' | 'warning' | 'info';
export type CrashLogStatus = 'new' | 'investigating' | 'resolved' | 'closed';

export interface ICrashLog {
  error: {
    message: string;
    stack?: string;
    type: string;
  };
  systemState: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuLoad: number;
    processUptime: number;
  };
  userContext: {
    userId?: string | Types.ObjectId;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  environment: {
    os: string;
    browser: string;
    appVersion?: string;
    nodeVersion: string;
    timestamp: Date;
  };
  severity: CrashLogSeverity;
  status: CrashLogStatus;
  resolution?: {
    resolvedBy: string | Types.ObjectId;
    resolvedAt: Date;
    notes: string;
    solution: string;
  };
  metadata?: {
    route?: string;
    method?: string;
    requestBody?: any;
    requestHeaders?: any;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
} 