import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  jobId: Schema.Types.ObjectId;
  workerId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  status: 'pending' | 'shortlisted' | 'interviewed' | 'offered' | 'placed' | 'rejected' | 'withdrawn';
  applicationDate: Date;
  resume: {
    url: string;
    version: number;
  };
  coverLetter?: string;
  screeningResults: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    overallScore: number;
  };
  interviews: Array<{
    scheduledDate: Date;
    interviewerId: Schema.Types.ObjectId;
    type: 'phone' | 'video' | 'in-person';
    status: 'scheduled' | 'completed' | 'cancelled';
    feedback?: {
      rating: number;
      strengths: string[];
      weaknesses: string[];
      notes: string;
    };
  }>;
  offer?: {
    date: Date;
    salary: number;
    currency: string;
    benefits: string[];
    startDate: Date;
    expiryDate: Date;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
  };
  placement?: {
    startDate: Date;
    endDate?: Date;
    rate: number;
    currency: string;
    type: 'full-time' | 'part-time' | 'contract';
    status: 'active' | 'completed' | 'terminated';
  };
  feedback?: {
    fromRecruiter?: {
      rating: number;
      comments: string;
      date: Date;
    };
    fromClient?: {
      rating: number;
      comments: string;
      date: Date;
    };
  };
  timeline: Array<{
    status: string;
    date: Date;
    updatedBy: Schema.Types.ObjectId;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'Worker', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'interviewed', 'offered', 'placed', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  applicationDate: { type: Date, default: Date.now },
  resume: {
    url: { type: String, required: true },
    version: { type: Number, default: 1 }
  },
  coverLetter: String,
  screeningResults: {
    skillMatch: { type: Number, required: true },
    experienceMatch: { type: Number, required: true },
    locationMatch: { type: Number, required: true },
    overallScore: { type: Number, required: true }
  },
  interviews: [{
    scheduledDate: { type: Date, required: true },
    interviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['phone', 'video', 'in-person'],
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      required: true
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      strengths: [String],
      weaknesses: [String],
      notes: String
    }
  }],
  offer: {
    date: Date,
    salary: Number,
    currency: String,
    benefits: [String],
    startDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired']
    }
  },
  placement: {
    startDate: Date,
    endDate: Date,
    rate: Number,
    currency: String,
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract']
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'terminated']
    }
  },
  feedback: {
    fromRecruiter: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      date: Date
    },
    fromClient: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      date: Date
    }
  },
  timeline: [{
    status: { type: String, required: true },
    date: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes
ApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ branchId: 1 });
ApplicationSchema.index({ 'screeningResults.overallScore': -1 });

// Methods
ApplicationSchema.methods.updateStatus = async function(
  newStatus: string,
  updatedBy: Schema.Types.ObjectId,
  notes?: string
) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    date: new Date(),
    updatedBy,
    notes
  });
  await this.save();
};

export enum ApplicationStatus {
  PENDING = 'pending',
  SHORTLISTED = 'shortlisted',
  INTERVIEWED = 'interviewed',
  OFFERED = 'offered',
  PLACED = 'placed',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export default mongoose.model<IApplication>('Application', ApplicationSchema); 