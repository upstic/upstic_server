import mongoose, { Schema } from 'mongoose';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary'
}

export interface IWorkExperience {
  title: string;
  company: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  skills: string[];
  references?: Array<{
    name: string;
    position: string;
    contact: string;
    email?: string;
  }>;
}

export interface IEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  grade?: string;
  achievements?: string[];
}

export interface IWorkerProfile {
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    dateOfBirth: Date;
    nationality: string;
    languages: Array<{
      name: string;
      proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
    }>;
  };
  professionalInfo: {
    title: string;
    summary: string;
    yearsOfExperience: number;
    preferredEmploymentTypes: EmploymentType[];
    desiredSalary?: {
      min: number;
      max: number;
      currency: string;
      rate: 'hourly' | 'daily' | 'monthly' | 'annual';
    };
    willingToTravel?: boolean;
    canWorkRemotely?: boolean;
  };
  skills: Array<{
    name: string;
    level: number; // 1-5
    yearsOfExperience: number;
    certifications?: string[];
  }>;
  workExperience: IWorkExperience[];
  education: IEducation[];
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadDate: Date;
    verified: boolean;
    verificationDate?: Date;
  }>;
  preferences: {
    jobTypes: string[];
    industries: string[];
    locations: string[];
    shiftPreferences: string[];
    minimumRate: number;
    noticePeriod?: number;
  };
  metrics: {
    profileCompleteness: number;
    totalPlacements: number;
    averageRating: number;
    reliabilityScore: number;
    lastActive: Date;
  };
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    rightToWork: boolean;
    qualifications: boolean;
    references: boolean;
  };
}

const workerProfileSchema = new Schema<IWorkerProfile>({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true
  },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    dateOfBirth: Date,
    nationality: String,
    languages: [{
      name: String,
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native']
      }
    }]
  },
  professionalInfo: {
    title: String,
    summary: String,
    yearsOfExperience: Number,
    preferredEmploymentTypes: [{
      type: String,
      enum: Object.values(EmploymentType)
    }],
    desiredSalary: {
      min: Number,
      max: Number,
      currency: String,
      rate: {
        type: String,
        enum: ['hourly', 'daily', 'monthly', 'annual']
      }
    },
    willingToTravel: Boolean,
    canWorkRemotely: Boolean
  },
  skills: [{
    name: String,
    level: {
      type: Number,
      min: 1,
      max: 5
    },
    yearsOfExperience: Number,
    certifications: [String]
  }],
  workExperience: [{
    title: String,
    company: String,
    location: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    description: String,
    skills: [String],
    references: [{
      name: String,
      position: String,
      contact: String,
      email: String
    }]
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    grade: String,
    achievements: [String]
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String,
    credentialUrl: String
  }],
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date,
    verified: Boolean,
    verificationDate: Date
  }],
  preferences: {
    jobTypes: [String],
    industries: [String],
    locations: [String],
    shiftPreferences: [String],
    minimumRate: Number,
    noticePeriod: Number
  },
  metrics: {
    profileCompleteness: Number,
    totalPlacements: Number,
    averageRating: Number,
    reliabilityScore: Number,
    lastActive: Date
  },
  verificationStatus: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    identity: { type: Boolean, default: false },
    rightToWork: { type: Boolean, default: false },
    qualifications: { type: Boolean, default: false },
    references: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes
workerProfileSchema.index({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });
workerProfileSchema.index({ 'skills.name': 1 });
workerProfileSchema.index({ 'preferences.jobTypes': 1 });
workerProfileSchema.index({ 'preferences.locations': 1 });
workerProfileSchema.index({ 'metrics.profileCompleteness': 1 });

export const WorkerProfile = mongoose.model<IWorkerProfile>('WorkerProfile', workerProfileSchema);