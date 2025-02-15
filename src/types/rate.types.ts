import { Schema } from 'mongoose';

export type RateType = 
  | 'standard'
  | 'overtime'
  | 'holiday'
  | 'weekend'
  | 'night-shift'
  | 'emergency';

export type RateStatus = 
  | 'active'
  | 'inactive'
  | 'pending'
  | 'expired';

export type RatePeriod = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'project';

export interface RateStructure {
  base: number;
  currency: string;
  period: RatePeriod;
  modifiers: Array<{
    type: string;
    value: number;
    isPercentage: boolean;
    conditions?: string[];
  }>;
  minimumHours?: number;
  maximumHours?: number;
  overtimeThreshold?: number;
  overtimeMultiplier?: number;
}

export interface RateAllowance {
  type: string;
  amount: number;
  currency: string;
  frequency: 'per-shift' | 'daily' | 'weekly' | 'monthly';
  taxable: boolean;
  conditions?: string[];
}

export interface RateDeduction {
  type: string;
  amount: number;
  currency: string;
  frequency: 'per-shift' | 'daily' | 'weekly' | 'monthly';
  mandatory: boolean;
  taxRelated: boolean;
  conditions?: string[];
}

export interface RateTax {
  type: string;
  percentage: number;
  applicableTo: string[];
  exemptions?: string[];
  reference?: string;
}

export interface RateEscalation {
  frequency: 'monthly' | 'quarterly' | 'yearly';
  percentage: number;
  nextReviewDate: Date;
  history: Array<{
    date: Date;
    oldRate: number;
    newRate: number;
    reason: string;
  }>;
}

export interface RateApproval {
  requiredLevels: number;
  approvers: Array<{
    level: number;
    approverId: Schema.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    date?: Date;
    comments?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  validFrom?: Date;
  validUntil?: Date;
}

export interface RateSearchParams {
  type?: RateType[];
  status?: RateStatus[];
  period?: RatePeriod[];
  currency?: string;
  range?: {
    min?: number;
    max?: number;
  };
  effectiveDate?: Date;
  clientId?: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface RateStats {
  totalRates: number;
  activeRates: number;
  averageRates: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  distribution: {
    byType: Record<RateType, number>;
    byStatus: Record<RateStatus, number>;
    byPeriod: Record<RatePeriod, number>;
  };
  trends: Array<{
    period: string;
    averageRate: number;
    change: number;
  }>;
}

export interface RateComparison {
  marketAverage: number;
  percentile: number;
  competitiveness: 'below' | 'at' | 'above';
  recommendations?: string[];
} 