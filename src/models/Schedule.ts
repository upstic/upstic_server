import mongoose, { Schema } from 'mongoose';

export enum ScheduleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export interface ISchedule {
  workerId: string;
  clientId: string;
  branchId: string;
  jobId: string;
  status: ScheduleStatus;
  shifts: Array<{
    date: Date;
    startTime: Date;
    endTime: Date;
    duration: number;
    confirmed: boolean;
    checkedIn?: Date;
    checkedOut?: Date;
    notes?: string;
  }>;
  recurrence: {
    type: RecurrenceType;
    interval?: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
  preferences: {
    minHoursPerWeek?: number;
    maxHoursPerWeek?: number;
    preferredDays?: number[];
    preferredHours?: {
      start: string;
      end: string;
    };
    breakDuration?: number;
  };
  constraints: {
    requiresBreak: boolean;
    minimumRestBetweenShifts: number;
    maximumConsecutiveDays: number;
    overtimeAllowed: boolean;
  };
  conflicts: Array<{
    date: Date;
    reason: string;
    resolved: boolean;
    resolvedBy?: string;
    resolution?: string;
  }>;
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    publishedBy?: string;
    publishedAt?: Date;
    version: number;
  };
}

const scheduleSchema = new Schema<ISchedule>({
  workerId: {
    type: String,
    ref: 'User',
    required: true
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  branchId: {
    type: String,
    ref: 'Branch',
    required: true
  },
  jobId: {
    type: String,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ScheduleStatus),
    default: ScheduleStatus.DRAFT
  },
  shifts: [{
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    confirmed: {
      type: Boolean,
      default: false
    },
    checkedIn: Date,
    checkedOut: Date,
    notes: String
  }],
  recurrence: {
    type: {
      type: String,
      enum: Object.values(RecurrenceType),
      default: RecurrenceType.NONE
    },
    interval: Number,
    endDate: Date,
    daysOfWeek: [Number]
  },
  preferences: {
    minHoursPerWeek: Number,
    maxHoursPerWeek: Number,
    preferredDays: [Number],
    preferredHours: {
      start: String,
      end: String
    },
    breakDuration: Number
  },
  constraints: {
    requiresBreak: {
      type: Boolean,
      default: true
    },
    minimumRestBetweenShifts: {
      type: Number,
      default: 8
    },
    maximumConsecutiveDays: {
      type: Number,
      default: 5
    },
    overtimeAllowed: {
      type: Boolean,
      default: false
    }
  },
  conflicts: [{
    date: Date,
    reason: String,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: String,
      ref: 'User'
    },
    resolution: String
  }],
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    publishedBy: {
      type: String,
      ref: 'User'
    },
    publishedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes
scheduleSchema.index({ workerId: 1, status: 1 });
scheduleSchema.index({ clientId: 1, branchId: 1 });
scheduleSchema.index({ 'shifts.date': 1, status: 1 });
scheduleSchema.index({ 'shifts.startTime': 1, 'shifts.endTime': 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema); 