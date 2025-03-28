import mongoose, { Schema, Document, model } from 'mongoose';

export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  QUERIED = 'queried',
  PAID = 'paid',
  DELETED = 'deleted'
}

export enum BreakType {
  LUNCH = 'lunch',
  REST = 'rest',
  UNPAID = 'unpaid'
}

export enum PayPeriodType {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

export enum ClockEventType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end'
}

export interface IClockEvent {
  type: ClockEventType;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  device?: {
    id: string;
    type: string;
    ipAddress?: string;
  };
  notes?: string;
  verified: boolean;
  verifiedBy?: Schema.Types.ObjectId | string;
  verifiedAt?: Date;
}

export interface ITimeEntry {
  date: Date;
  startTime: Date;
  endTime: Date;
  breaks: Array<{
    type: BreakType;
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
    paid: boolean;
  }>;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  notes?: string;
  clockEvents?: IClockEvent[];
  calculatedDuration?: number;
  manuallyAdjusted?: boolean;
  adjustmentReason?: string;
}

export interface IAuditLog {
  action: string;
  performedBy: Schema.Types.ObjectId | string;
  timestamp: Date;
  previousValue?: any;
  newValue?: any;
  notes?: string;
}

export interface ITimesheet extends Document {
  workerId: Schema.Types.ObjectId | string;
  jobId: Schema.Types.ObjectId | string;
  clientId: string;
  weekStarting: Date;
  weekEnding: Date;
  periodCode?: string;
  periodType?: PayPeriodType;
  status: TimesheetStatus;
  timeEntries: ITimeEntry[];
  totalHours: {
    regular: number;
    overtime: number;
    holiday: number;
    total: number;
  };
  expenses?: Array<{
    date: Date;
    type: string;
    amount: number;
    currency: string;
    receipt?: string;
    approved: boolean;
    notes?: string;
    approvedBy?: Schema.Types.ObjectId | string;
    approvedAt?: Date;
  }>;
  approvedBy?: Schema.Types.ObjectId | string;
  approvedAt?: Date;
  submittedBy?: Schema.Types.ObjectId | string;
  submittedAt?: Date;
  rejectedBy?: Schema.Types.ObjectId | string;
  rejectedAt?: Date;
  rejectionReason?: string;
  auditLogs?: IAuditLog[];
  createdBy: Schema.Types.ObjectId | string;
  updatedBy?: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Schema.Types.ObjectId | string;
  payrollProcessed?: boolean;
  payrollId?: Schema.Types.ObjectId | string;
}

const timesheetSchema = new Schema<ITimesheet>({
  workerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  weekStarting: {
    type: Date,
    required: true
  },
  weekEnding: {
    type: Date,
    required: true
  },
  periodCode: {
    type: String,
    validate: {
      validator: function(v: string) {
        return /^\d{4}-W\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid period code! Format should be YYYY-WXX (e.g., 2024-W48)`
    }
  },
  periodType: {
    type: String,
    enum: Object.values(PayPeriodType),
    default: PayPeriodType.WEEKLY
  },
  status: {
    type: String,
    enum: Object.values(TimesheetStatus),
    default: TimesheetStatus.DRAFT
  },
  timeEntries: [{
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
    breaks: [{
      type: {
        type: String,
        enum: Object.values(BreakType)
      },
      startTime: Date,
      endTime: Date,
      duration: Number,
      paid: Boolean
    }],
    regularHours: Number,
    overtimeHours: Number,
    holidayHours: Number,
    notes: String,
    clockEvents: [{
      type: {
        type: String,
        enum: Object.values(ClockEventType),
        required: true
      },
      timestamp: {
        type: Date,
        required: true
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      device: {
        id: String,
        type: String,
        ipAddress: String
      },
      notes: String,
      verified: {
        type: Boolean,
        default: false
      },
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      verifiedAt: Date
    }],
    calculatedDuration: Number,
    manuallyAdjusted: {
      type: Boolean,
      default: false
    },
    adjustmentReason: String
  }],
  totalHours: {
    regular: {
      type: Number,
      default: 0
    },
    overtime: {
      type: Number,
      default: 0
    },
    holiday: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  expenses: [{
    date: Date,
    type: String,
    amount: Number,
    currency: String,
    receipt: String,
    approved: {
      type: Boolean,
      default: false
    },
    notes: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  }],
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: Date,
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String,
  auditLogs: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    notes: String
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  payrollProcessed: {
    type: Boolean,
    default: false
  },
  payrollId: {
    type: Schema.Types.ObjectId,
    ref: 'Payroll'
  }
}, {
  timestamps: true
});

timesheetSchema.pre('save', function(next) {
  if (this.timeEntries && this.timeEntries.length > 0) {
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalHoliday = 0;

    this.timeEntries.forEach(entry => {
      totalRegular += entry.regularHours || 0;
      totalOvertime += entry.overtimeHours || 0;
      totalHoliday += entry.holidayHours || 0;
    });

    this.totalHours.regular = totalRegular;
    this.totalHours.overtime = totalOvertime;
    this.totalHours.holiday = totalHoliday;
    this.totalHours.total = totalRegular + totalOvertime + totalHoliday;
  }

  if (!this.periodCode && this.weekStarting) {
    const date = new Date(this.weekStarting);
    const year = date.getFullYear();
    const weekNumber = Math.ceil((((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    const formattedWeek = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`;
    this.periodCode = `${year}-W${formattedWeek}`;
  }

  next();
});

timesheetSchema.methods.addAuditLog = function(
  action: string,
  performedBy: Schema.Types.ObjectId,
  previousValue?: any,
  newValue?: any,
  notes?: string
) {
  if (!this.auditLogs) {
    this.auditLogs = [];
  }

  this.auditLogs.push({
    action,
    performedBy,
    performedAt: new Date(),
    previousValue,
    newValue,
    notes
  });
};

timesheetSchema.methods.calculateDurationFromClockEvents = function(entryIndex: number) {
  const entry = this.timeEntries[entryIndex];
  if (!entry || !entry.clockEvents || entry.clockEvents.length < 2) {
    return 0;
  }

  const sortedEvents = [...entry.clockEvents].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  let totalDuration = 0;
  let clockInTime: Date | null = null;
  let breakStartTime: Date | null = null;
  let breakDuration = 0;

  for (const event of sortedEvents) {
    if (event.type === ClockEventType.CLOCK_IN) {
      clockInTime = event.timestamp;
    } else if (event.type === ClockEventType.CLOCK_OUT && clockInTime) {
      const duration = (event.timestamp.getTime() - clockInTime.getTime()) / (1000 * 60);
      totalDuration += duration - breakDuration;
      clockInTime = null;
      breakDuration = 0;
    } else if (event.type === ClockEventType.BREAK_START && clockInTime) {
      breakStartTime = event.timestamp;
    } else if (event.type === ClockEventType.BREAK_END && breakStartTime) {
      const breakTime = (event.timestamp.getTime() - breakStartTime.getTime()) / (1000 * 60);
      breakDuration += breakTime;
      breakStartTime = null;
    }
  }

  this.timeEntries[entryIndex].calculatedDuration = totalDuration;
  return totalDuration;
};

timesheetSchema.index({ workerId: 1, weekStarting: 1 });
timesheetSchema.index({ clientId: 1, status: 1 });
timesheetSchema.index({ jobId: 1, status: 1 });
timesheetSchema.index({ status: 1, approvedAt: 1 });
timesheetSchema.index({ periodCode: 1 });
timesheetSchema.index({ payrollProcessed: 1 });
timesheetSchema.index({ isDeleted: 1 });
timesheetSchema.index({ workerId: 1, isDeleted: 1 });

export const Timesheet = model<ITimesheet>('Timesheet', timesheetSchema); 