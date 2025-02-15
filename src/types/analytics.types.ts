import { Schema } from 'mongoose';

export type AnalyticsMetricType = 
  | 'count'
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'rate'
  | 'ratio';

export type AnalyticsPeriod = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type AnalyticsChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'heatmap';

export interface AnalyticsQuery {
  metrics: AnalyticsMetric[];
  dimensions?: string[];
  filters?: AnalyticsFilter[];
  timeRange: {
    start: Date;
    end: Date;
    period: AnalyticsPeriod;
  };
  sort?: {
    metric: string;
    order: 'asc' | 'desc';
  };
  limit?: number;
}

export interface AnalyticsMetric {
  name: string;
  type: AnalyticsMetricType;
  field: string;
  formula?: string;
  filters?: AnalyticsFilter[];
}

export interface AnalyticsFilter {
  field: string;
  operator: string;
  value: any;
  condition?: 'and' | 'or';
}

export interface AnalyticsResult {
  data: Array<{
    dimensions?: Record<string, any>;
    metrics: Record<string, number>;
    timestamp?: Date;
  }>;
  totals: Record<string, number>;
  metadata: {
    timeRange: {
      start: Date;
      end: Date;
      period: AnalyticsPeriod;
    };
    lastUpdated: Date;
  };
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description?: string;
  widgets: AnalyticsWidget[];
  layout: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  filters?: AnalyticsFilter[];
  refreshInterval?: number;
}

export interface AnalyticsWidget {
  id: string;
  type: AnalyticsChartType;
  title: string;
  query: AnalyticsQuery;
  options?: {
    colors?: string[];
    legend?: boolean;
    stacked?: boolean;
    percentage?: boolean;
    [key: string]: any;
  };
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  schedule?: {
    frequency: string;
    nextRun: Date;
    recipients: string[];
  };
  queries: AnalyticsQuery[];
  format: 'pdf' | 'excel' | 'csv';
  delivery: {
    type: 'email' | 'api' | 'storage';
    config: Record<string, any>;
  };
}

export interface AnalyticsEvent {
  type: string;
  userId?: Schema.Types.ObjectId;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: {
    userAgent?: string;
    ip?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      type?: string;
      brand?: string;
      model?: string;
    };
  };
}

export interface AnalyticsSegment {
  id: string;
  name: string;
  description?: string;
  filters: AnalyticsFilter[];
  metadata?: {
    size: number;
    lastUpdated: Date;
    updateFrequency: string;
  };
}

export interface AnalyticsFunnel {
  id: string;
  name: string;
  steps: Array<{
    name: string;
    event: string;
    filters?: AnalyticsFilter[];
  }>;
  window: {
    size: number;
    unit: string;
  };
  results?: Array<{
    step: string;
    count: number;
    conversionRate: number;
  }>;
} 