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

export interface IJob extends Document {
  title: string;
  clientId: Schema.Types.ObjectId;
  description: string;
  requirements: string[];
  skills: string[];
  location: {
    type: string;
    coordinates: number[];
    address: string;
  };
  salary: {
    min: number;
    max: number;
    currency: string;
    rateType: 'hourly' | 'daily' | 'monthly';
  };
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
  }[];
  assignedWorker?: Schema.Types.ObjectId;
  metadata: {
    views: number;
    applications: number;
    lastModified: Date;
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
    requirements: [String],
    skills: [{ type: String, index: true }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String, required: true }
    },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
      rateType: { type: String, enum: ['hourly', 'daily', 'monthly'] }
    },
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
      appliedAt: { type: Date, default: Date.now }
    }],
    assignedWorker: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: {
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      lastModified: { type: Date, default: Date.now }
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

export const Job = mongoose.model<IJob>('Job', jobSchema); 