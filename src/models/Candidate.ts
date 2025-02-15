import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate extends Document {
  userId: Schema.Types.ObjectId;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    dateOfBirth?: Date;
    nationality?: string;
    visaStatus?: string;
  };
  professionalInfo: {
    currentTitle?: string;
    totalExperience: number;
    currentSalary?: {
      amount: number;
      currency: string;
    };
    expectedSalary?: {
      amount: number;
      currency: string;
    };
    skills: Array<{
      name: string;
      level: 'beginner' | 'intermediate' | 'expert';
      yearsOfExperience: number;
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      verificationUrl?: string;
    }>;
  };
  workHistory: Array<{
    company: string;
    title: string;
    location: string;
    startDate: Date;
    endDate?: Date;
    isCurrent: boolean;
    responsibilities: string[];
    achievements: string[];
    skills: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: Date;
    endDate?: Date;
    grade?: string;
    achievements?: string[];
  }>;
  documents: {
    resume: {
      url: string;
      lastUpdated: Date;
      version: number;
    };
    coverLetter?: {
      url: string;
      lastUpdated: Date;
    };
    certificates: Array<{
      name: string;
      url: string;
      uploadDate: Date;
    }>;
  };
  preferences: {
    jobTypes: Array<'full-time' | 'part-time' | 'contract' | 'temporary'>;
    locations: string[];
    remoteWork: boolean;
    industries: string[];
    minSalary: {
      amount: number;
      currency: string;
    };
    noticePeriod?: number;
    willingToRelocate: boolean;
  };
  atsMetrics: {
    applicationCount: number;
    interviewCount: number;
    offerCount: number;
    placementCount: number;
    averageInterviewScore: number;
    lastActivityDate: Date;
    sourcingChannel?: string;
  };
  status: 'active' | 'placed' | 'inactive' | 'blacklisted';
  tags: string[];
  notes: Array<{
    content: string;
    author: Schema.Types.ObjectId;
    date: Date;
    type: 'general' | 'interview' | 'background-check' | 'offer';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zipCode: { type: String, required: true }
    },
    dateOfBirth: Date,
    nationality: String,
    visaStatus: String
  },
  professionalInfo: {
    currentTitle: String,
    totalExperience: { type: Number, required: true },
    currentSalary: {
      amount: Number,
      currency: String
    },
    expectedSalary: {
      amount: Number,
      currency: String
    },
    skills: [{
      name: { type: String, required: true },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert'],
        required: true
      },
      yearsOfExperience: { type: Number, required: true }
    }],
    certifications: [{
      name: { type: String, required: true },
      issuer: { type: String, required: true },
      issueDate: { type: Date, required: true },
      expiryDate: Date,
      verificationUrl: String
    }]
  },
  workHistory: [{
    company: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    isCurrent: { type: Boolean, default: false },
    responsibilities: [String],
    achievements: [String],
    skills: [String]
  }],
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    grade: String,
    achievements: [String]
  }],
  documents: {
    resume: {
      url: { type: String, required: true },
      lastUpdated: { type: Date, required: true },
      version: { type: Number, default: 1 }
    },
    coverLetter: {
      url: String,
      lastUpdated: Date
    },
    certificates: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      uploadDate: { type: Date, required: true }
    }]
  },
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'temporary']
    }],
    locations: [String],
    remoteWork: { type: Boolean, default: false },
    industries: [String],
    minSalary: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true }
    },
    noticePeriod: Number,
    willingToRelocate: { type: Boolean, default: false }
  },
  atsMetrics: {
    applicationCount: { type: Number, default: 0 },
    interviewCount: { type: Number, default: 0 },
    offerCount: { type: Number, default: 0 },
    placementCount: { type: Number, default: 0 },
    averageInterviewScore: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: Date.now },
    sourcingChannel: String
  },
  status: {
    type: String,
    enum: ['active', 'placed', 'inactive', 'blacklisted'],
    default: 'active'
  },
  tags: [String],
  notes: [{
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['general', 'interview', 'background-check', 'offer'],
      default: 'general'
    }
  }]
}, {
  timestamps: true
});

// Indexes
CandidateSchema.index({ 'personalInfo.email': 1 }, { unique: true });
CandidateSchema.index({ 'professionalInfo.skills.name': 1 });
CandidateSchema.index({ status: 1 });
CandidateSchema.index({ tags: 1 });
CandidateSchema.index({ 'atsMetrics.lastActivityDate': -1 });

// Methods
CandidateSchema.methods.updateATSMetrics = async function() {
  const applications = await mongoose.model('Application').find({ workerId: this.userId });
  
  this.atsMetrics = {
    applicationCount: applications.length,
    interviewCount: applications.filter(app => app.status === 'interviewed').length,
    offerCount: applications.filter(app => app.status === 'offered').length,
    placementCount: applications.filter(app => app.status === 'placed').length,
    averageInterviewScore: this.calculateAverageInterviewScore(applications),
    lastActivityDate: new Date(),
    sourcingChannel: this.atsMetrics.sourcingChannel
  };

  await this.save();
};

CandidateSchema.methods.calculateAverageInterviewScore = function(applications: any[]): number {
  const interviewScores = applications
    .filter(app => app.interviews && app.interviews.length > 0)
    .flatMap(app => app.interviews)
    .filter(interview => interview.feedback && interview.feedback.rating)
    .map(interview => interview.feedback.rating);

  if (interviewScores.length === 0) return 0;
  return interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length;
};

export default mongoose.model<ICandidate>('Candidate', CandidateSchema); 