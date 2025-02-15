import mongoose, { Schema } from 'mongoose';

export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  QUERIED = 'queried',
  PAID = 'paid'
}

export enum BreakType {
  LUNCH = 'lunch',
  REST = 'rest',
  UNPAID = 'unpaid'
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
}

export interface ITimesheet {
  workerId: string;
  jobId: string;
  clientId: string;
  weekStarting: Date;
  weekEnding: Date;
  status: TimesheetStatus;
  timeEntries: ITimeEntry[];
  totalHours: {
    regular: number;
    overtime: number;
    holiday: number;
  };
  expenses?: Array<{
    date: Date;
    type: string;
    amount: number;
    currency: string;
    receipt?: string;
    approved: boolean;
    notes?: string;
  }>;
  approvals: Array<{
    type: 'client' | 'manager';
    approvedBy: string;
    approvedAt: Date;
    notes?: string;
  }>;
  queries?: Array<{
    raisedBy: string;
    raisedAt: Date;
    resolvedAt?: Date;
    message: string;
    response?: string;
  }>;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;
  submittedAt?: Date;
  submittedBy?: string;
  lastModifiedAt?: Date;
  lastModifiedBy?: string;
}

const timesheetSchema = new Schema<ITimesheet>({
  workerId: {
    type: String,
    ref: 'User',
    required: true
  },
  jobId: {
    type: String,
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
    notes: String
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
    notes: String
  }],
  approvals: [{
    type: {
      type: String,
      enum: ['client', 'manager']
    },
    approvedBy: {
      type: String,
      ref: 'User'
    },
    approvedAt: Date,
    notes: String
  }],
  queries: [{
    raisedBy: {
      type: String,
      ref: 'User'
    },
    raisedAt: Date,
    resolvedAt: Date,
    message: String,
    response: String
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  submittedAt: Date,
  submittedBy: {
    type: String,
    ref: 'User'
  },
  lastModifiedAt: Date,
  lastModifiedBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
timesheetSchema.index({ workerId: 1, weekStarting: 1 });
timesheetSchema.index({ clientId: 1, status: 1 });
timesheetSchema.index({ jobId: 1, status: 1 });
timesheetSchema.index({ status: 1, submittedAt: 1 });

export const Timesheet = mongoose.model<ITimesheet>('Timesheet', timesheetSchema); 