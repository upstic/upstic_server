import { Schema } from 'mongoose';
import { types } from 'mongoose';

export type ShiftStatus = 
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'missed'
  | 'modified';

export type ShiftType = 
  | 'regular'
  | 'overtime'
  | 'holiday'
  | 'emergency'
  | 'on-call';

export interface ShiftSchedule {
  startTime: Date;
  endTime: Date;
  breakDuration: number;
  timezone: string;
  isFlexible?: boolean;
  flexibilityRules?: {
    earliestStart?: Date;
    latestEnd?: Date;
    minHours?: number;
    maxHours?: number;
  };
}

export interface ShiftLocation {
  siteId: Schema.Types.ObjectId;
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface ShiftAttendance {
  clockIn?: {
    time: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
    verificationMethod?: string;
    verifiedBy?: Schema.Types.ObjectId;
  };
  clockOut?: {
    time: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
    verificationMethod?: string;
    verifiedBy?: Schema.Types.ObjectId;
  };
  breaks: Array<{
    startTime: Date;
    endTime?: Date;
    duration: number;
    type: string;
  }>;
  totalHours: number;
  overtime: number;
  status: 'present' | 'absent' | 'late' | 'left-early';
}

export interface ShiftBilling {
  rateType: 'hourly' | 'fixed' | 'overtime';
  rate: number;
  currency: string;
  minimumHours?: number;
  overtimeMultiplier?: number;
  allowances?: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  deductions?: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  totalAmount: number;
}

export interface ShiftRequirement {
  skills: string[];
  certifications: string[];
  equipment: string[];
  uniform?: string;
  notes?: string;
}

export interface ShiftIncident {
  type: string;
  description: string;
  reportedBy: Schema.Types.ObjectId;
  reportedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  resolution?: {
    description: string;
    resolvedBy: Schema.Types.ObjectId;
    resolvedAt: Date;
    actions: string[];
  };
}

export interface ShiftSearchParams {
  workerId?: Schema.Types.ObjectId;
  jobId?: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  status?: ShiftStatus[];
  type?: ShiftType[];
  startDate?: Date;
  endDate?: Date;
  location?: {
    siteId?: Schema.Types.ObjectId;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface ShiftStats {
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  missedShifts: number;
  averageHours: number;
  totalBilled: number;
  attendanceMetrics: {
    onTime: number;
    late: number;
    absent: number;
    leftEarly: number;
  };
  incidentStats: {
    total: number;
    bySeverity: Record<string, number>;
    averageResolutionTime: number;
  };
}

export interface ShiftSwapRequest {
  requesterId: Schema.Types.ObjectId;
  shiftId: Schema.Types.ObjectId;
  targetShiftId?: Schema.Types.ObjectId;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: Schema.Types.ObjectId;
  comments?: string;
}

export interface IShift {
  _id: types.ObjectId;
  workerId: types.ObjectId | string;
  clientId: types.ObjectId | string;
  jobId: types.ObjectId | string;
  date: Date;
  hours: number;
  rate: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
} 