import { ReportType } from './report-type.enum';

export interface ReportParameters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  clientId?: string;
  format?: 'pdf' | 'csv' | 'excel';
  [key: string]: any;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  parameters: ReportParameters;
  format: 'pdf' | 'csv' | 'excel';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
