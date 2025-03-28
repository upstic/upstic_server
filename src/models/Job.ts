import mongoose, { Document, Schema } from 'mongoose';

export enum JobStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum JobType {
  TEMPORARY = 'temporary',
  CONTRACT = 'contract',
  PERMANENT = 'permanent'
}

export enum ContractType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  ZERO_HOURS = 'zero_hours',
  FIXED_TERM = 'fixed_term',
  FREELANCE = 'freelance'
}

export enum BenefitType {
  HEALTH_INSURANCE = 'health_insurance',
  PENSION = 'pension',
  PAID_TIME_OFF = 'paid_time_off',
  FLEXIBLE_WORKING = 'flexible_working',
  TRAINING = 'training',
  BONUS = 'bonus',
  CHILDCARE = 'childcare',
  TRAVEL_ALLOWANCE = 'travel_allowance',
  MEAL_ALLOWANCE = 'meal_allowance',
  OTHER = 'other'
}

export interface IJobBenefit {
  type: BenefitType;
  description: string;
  value?: number;
  currency?: string;
}

export interface IJobRequirement {
  title: string;
  description: string;
  isRequired: boolean;
}

export interface IMatchingScore {
  overall: number;
  skills: number;
  location: number;
  availability: number;
  experience: number;
}

export interface IJob extends Document {
  title: string;
  clientId: Schema.Types.ObjectId;
  description: string;
  requirements: IJobRequirement[];
  skills: string[];
  location: {
    type: string;
    coordinates: number[];
    address: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  salary: {
    min: number;
    max: number;
    currency: string;
    rateType: 'hourly' | 'daily' | 'monthly';
    negotiable: boolean;
  };
  workingHours: {
    hoursPerWeek: number;
    flexibleHours: boolean;
    shiftPattern?: string;
    overtime?: boolean;
    overtimeRate?: number;
  };
  contractType: ContractType;
  benefits: IJobBenefit[];
  startDate: Date;
  endDate?: Date;
  shifts: {
    startTime: string;
    endTime: string;
    days: string[];
  }[];
  status: JobStatus;
  jobType: JobType;
  applicants: {
    workerId: Schema.Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    appliedAt: Date;
    matchingScore?: IMatchingScore;
  }[];
  assignedWorker?: Schema.Types.ObjectId;
  metadata: {
    views: number;
    applications: number;
    lastModified: Date;
    matchingCriteria?: {
      skillsWeight: number;
      locationWeight: number;
      availabilityWeight: number;
      experienceWeight: number;
    };
  };
  budget: number;
  deadline: Date;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    requirements: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      isRequired: { type: Boolean, default: true }
    }],
    skills: [{ type: String, index: true }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String, required: true },
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'GBP' },
      rateType: { type: String, enum: ['hourly', 'daily', 'monthly'] },
      negotiable: { type: Boolean, default: false }
    },
    workingHours: {
      hoursPerWeek: { type: Number, required: true },
      flexibleHours: { type: Boolean, default: false },
      shiftPattern: String,
      overtime: { type: Boolean, default: false },
      overtimeRate: Number
    },
    contractType: {
      type: String,
      enum: Object.values(ContractType),
      required: true
    },
    benefits: [{
      type: { type: String, enum: Object.values(BenefitType), required: true },
      description: { type: String, required: true },
      value: Number,
      currency: String
    }],
    startDate: { type: Date, required: true },
    endDate: Date,
    shifts: [{
      startTime: String,
      endTime: String,
      days: [String]
    }],
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.DRAFT
    },
    jobType: {
      type: String,
      enum: Object.values(JobType),
      required: true
    },
    applicants: [{
      workerId: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
      },
      appliedAt: { type: Date, default: Date.now },
      matchingScore: {
        overall: { type: Number, default: 0 },
        skills: { type: Number, default: 0 },
        location: { type: Number, default: 0 },
        availability: { type: Number, default: 0 },
        experience: { type: Number, default: 0 }
      }
    }],
    assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: {
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      lastModified: { type: Date, default: Date.now },
      matchingCriteria: {
        skillsWeight: { type: Number, default: 0.4 },
        locationWeight: { type: Number, default: 0.3 },
        availabilityWeight: { type: Number, default: 0.2 },
        experienceWeight: { type: Number, default: 0.1 }
      }
    },
    budget: { type: Number, required: true },
    deadline: { type: Date, required: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
jobSchema.index({ 'location.coordinates': '2dsphere' });
jobSchema.index({ status: 1, startDate: 1 });
jobSchema.index({ skills: 1, status: 1 });
jobSchema.index({ contractType: 1, jobType: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
jobSchema.index({ 'workingHours.hoursPerWeek': 1 });

// Method to calculate matching score for a worker
jobSchema.methods.calculateMatchingScore = function(workerId: Schema.Types.ObjectId) {
  // This would be implemented with actual matching logic
  // For now, we'll return a placeholder
  return {
    overall: 0,
    skills: 0,
    location: 0,
    availability: 0,
    experience: 0
  };
};

export const Job = mongoose.model<IJob>('Job', jobSchema); 