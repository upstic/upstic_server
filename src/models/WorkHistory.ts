import mongoose, { Schema } from 'mongoose';

export enum EmploymentType {
  TEMPORARY = 'temporary',
  CONTRACT = 'contract',
  PERMANENT = 'permanent',
  PART_TIME = 'part_time'
}

export enum CompletionStatus {
  COMPLETED = 'completed',
  TERMINATED_EARLY = 'terminated_early',
  NO_SHOW = 'no_show',
  ONGOING = 'ongoing'
}

export interface IWorkHistory {
  workerId: string;
  jobId: string;
  clientId: string;
  startDate: Date;
  endDate?: Date;
  employmentType: EmploymentType;
  position: string;
  status: CompletionStatus;
  salary: {
    amount: number;
    currency: string;
    rate: string; // hourly, daily, weekly, monthly
  };
  totalHours: number;
  totalEarnings: number;
  performance: {
    rating: number;
    attendance: number;
    reliability: number;
    qualityOfWork: number;
    teamwork: number;
    punctuality: number;
    reviews: Array<{
      reviewerId: string;
      rating: number;
      comment: string;
      date: Date;
    }>;
  };
  skills: Array<{
    name: string;
    level: number;
    endorsed: boolean;
    endorsedBy?: string;
  }>;
  achievements: Array<{
    title: string;
    description: string;
    date: Date;
    verifiedBy?: string;
  }>;
  incidents: Array<{
    type: string;
    date: Date;
    description: string;
    severity: 'low' | 'medium' | 'high';
    resolution?: string;
    reportedBy: string;
  }>;
  feedback: Array<{
    type: 'client' | 'supervisor' | 'coworker';
    fromId: string;
    rating: number;
    comment: string;
    date: Date;
    category: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadDate: Date;
    expiryDate?: Date;
  }>;
  metrics: {
    overtimeHours: number;
    sickDays: number;
    lateDays: number;
    completedShifts: number;
    missedShifts: number;
    averageHoursPerWeek: number;
  };
  notes: Array<{
    authorId: string;
    content: string;
    date: Date;
    type: 'general' | 'performance' | 'incident' | 'achievement';
    visibility: 'private' | 'internal' | 'public';
  }>;
}

const workHistorySchema = new Schema<IWorkHistory>({
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
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  employmentType: {
    type: String,
    enum: Object.values(EmploymentType),
    required: true
  },
  position: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CompletionStatus),
    default: CompletionStatus.ONGOING
  },
  salary: {
    amount: Number,
    currency: String,
    rate: String
  },
  totalHours: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  performance: {
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    attendance: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reliability: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    qualityOfWork: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    teamwork: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    punctuality: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviews: [{
      reviewerId: {
        type: String,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 0,
        max: 5
      },
      comment: String,
      date: Date
    }]
  },
  skills: [{
    name: String,
    level: {
      type: Number,
      min: 1,
      max: 5
    },
    endorsed: {
      type: Boolean,
      default: false
    },
    endorsedBy: {
      type: String,
      ref: 'User'
    }
  }],
  achievements: [{
    title: String,
    description: String,
    date: Date,
    verifiedBy: {
      type: String,
      ref: 'User'
    }
  }],
  incidents: [{
    type: String,
    date: Date,
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    resolution: String,
    reportedBy: {
      type: String,
      ref: 'User'
    }
  }],
  feedback: [{
    type: {
      type: String,
      enum: ['client', 'supervisor', 'coworker']
    },
    fromId: {
      type: String,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    comment: String,
    date: Date,
    category: String
  }],
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date,
    expiryDate: Date
  }],
  metrics: {
    overtimeHours: {
      type: Number,
      default: 0
    },
    sickDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    },
    completedShifts: {
      type: Number,
      default: 0
    },
    missedShifts: {
      type: Number,
      default: 0
    },
    averageHoursPerWeek: {
      type: Number,
      default: 0
    }
  },
  notes: [{
    authorId: {
      type: String,
      ref: 'User'
    },
    content: String,
    date: Date,
    type: {
      type: String,
      enum: ['general', 'performance', 'incident', 'achievement']
    },
    visibility: {
      type: String,
      enum: ['private', 'internal', 'public']
    }
  }]
}, {
  timestamps: true
});

// Indexes
workHistorySchema.index({ workerId: 1, startDate: -1 });
workHistorySchema.index({ clientId: 1, status: 1 });
workHistorySchema.index({ 'performance.rating': 1 });
workHistorySchema.index({ 'metrics.completedShifts': 1 });

export const WorkHistory = mongoose.model<IWorkHistory>('WorkHistory', workHistorySchema); 