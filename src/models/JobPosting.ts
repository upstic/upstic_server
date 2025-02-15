import mongoose, { Schema } from 'mongoose';

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum JobType {
  TEMPORARY = 'temporary',
  CONTRACT = 'contract',
  PERMANENT = 'permanent',
  PART_TIME = 'part_time'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  INTERMEDIATE = 'intermediate',
  SENIOR = 'senior',
  EXPERT = 'expert'
}

export interface IJobPosting {
  clientId: string;
  branchId?: string;
  title: string;
  status: JobStatus;
  type: JobType;
  description: string;
  requirements: {
    skills: Array<{
      name: string;
      level: number;
      required: boolean;
    }>;
    experience: {
      level: ExperienceLevel;
      yearsRequired: number;
    };
    qualifications: string[];
    certifications: string[];
    languages: Array<{
      name: string;
      level: 'basic' | 'intermediate' | 'fluent' | 'native';
      required: boolean;
    }>;
  };
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    remote?: boolean;
    travelRequired?: boolean;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
    shiftPattern: string;
    hoursPerWeek: number;
    flexibleHours: boolean;
    shifts?: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  };
  compensation: {
    type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual';
    currency: string;
    min: number;
    max: number;
    benefits?: string[];
    overtime?: {
      rate: number;
      conditions: string;
    };
  };
  applicationProcess: {
    deadline?: Date;
    screeningQuestions?: string[];
    requiredDocuments?: string[];
    interviewRounds?: number;
    assessmentRequired?: boolean;
  };
  preferences: {
    urgency: 'low' | 'medium' | 'high';
    preferredCandidates?: string[];
    blacklistedCandidates?: string[];
    maxApplications?: number;
    autoClose?: boolean;
  };
  statistics: {
    views: number;
    applications: number;
    shortlisted: number;
    interviews: number;
    offers: number;
    filled: boolean;
    timeToFill?: number;
  };
  metadata: {
    createdBy: string;
    publishedAt?: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    expiresAt?: Date;
    filledAt?: Date;
    filledBy?: string;
  };
}

const jobPostingSchema = new Schema<IJobPosting>({
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  branchId: {
    type: String,
    ref: 'Branch'
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(JobStatus),
    default: JobStatus.DRAFT
  },
  type: {
    type: String,
    enum: Object.values(JobType),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    skills: [{
      name: String,
      level: {
        type: Number,
        min: 1,
        max: 5
      },
      required: Boolean
    }],
    experience: {
      level: {
        type: String,
        enum: Object.values(ExperienceLevel)
      },
      yearsRequired: Number
    },
    qualifications: [String],
    certifications: [String],
    languages: [{
      name: String,
      level: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native']
      },
      required: Boolean
    }]
  },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    remote: Boolean,
    travelRequired: Boolean
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    shiftPattern: String,
    hoursPerWeek: Number,
    flexibleHours: Boolean,
    shifts: [{
      day: String,
      startTime: String,
      endTime: String
    }]
  },
  compensation: {
    type: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'annual']
    },
    currency: String,
    min: Number,
    max: Number,
    benefits: [String],
    overtime: {
      rate: Number,
      conditions: String
    }
  },
  applicationProcess: {
    deadline: Date,
    screeningQuestions: [String],
    requiredDocuments: [String],
    interviewRounds: Number,
    assessmentRequired: Boolean
  },
  preferences: {
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    preferredCandidates: [{
      type: String,
      ref: 'User'
    }],
    blacklistedCandidates: [{
      type: String,
      ref: 'User'
    }],
    maxApplications: Number,
    autoClose: Boolean
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shortlisted: {
      type: Number,
      default: 0
    },
    interviews: {
      type: Number,
      default: 0
    },
    offers: {
      type: Number,
      default: 0
    },
    filled: {
      type: Boolean,
      default: false
    },
    timeToFill: Number
  },
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    publishedAt: Date,
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      required: true
    },
    expiresAt: Date,
    filledAt: Date,
    filledBy: {
      type: String,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes
jobPostingSchema.index({ status: 1, 'location.city': 1 });
jobPostingSchema.index({ clientId: 1, status: 1 });
jobPostingSchema.index({ 'requirements.skills.name': 1 });
jobPostingSchema.index({ 'metadata.expiresAt': 1 });
jobPostingSchema.index({
  title: 'text',
  description: 'text',
  'requirements.skills.name': 'text'
});

export const JobPosting = mongoose.model<IJobPosting>('JobPosting', jobPostingSchema); 