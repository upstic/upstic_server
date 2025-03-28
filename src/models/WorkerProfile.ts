import mongoose, { Schema } from 'mongoose';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary'
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  INDUSTRY_SPECIFIC = 'industry_specific',
  CERTIFICATION = 'certification',
  TOOL = 'tool',
  OTHER = 'other'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum BackgroundCheckType {
  CRIMINAL = 'criminal',
  EMPLOYMENT = 'employment',
  EDUCATION = 'education',
  IDENTITY = 'identity',
  CREDIT = 'credit',
  PROFESSIONAL_LICENSE = 'professional_license',
  DRIVING_RECORD = 'driving_record',
  DRUG_TEST = 'drug_test',
  REFERENCE = 'reference',
  RIGHT_TO_WORK = 'right_to_work'
}

export enum BackgroundCheckStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum AvailabilityType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  WEEKDAYS = 'weekdays',
  WEEKENDS = 'weekends',
  EVENINGS = 'evenings',
  NIGHTS = 'nights',
  FLEXIBLE = 'flexible',
  CUSTOM = 'custom'
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
  responsibilities?: string[];
  achievements?: string[];
  employmentType?: EmploymentType;
  references?: Array<{
    name: string;
    position: string;
    contact: string;
    email?: string;
    verified?: boolean;
    verificationDate?: Date;
  }>;
  verificationStatus?: VerificationStatus;
  verifiedBy?: string; // User ID of the verifier
  verificationDate?: Date;
  verificationNotes?: string;
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
  verificationStatus?: VerificationStatus;
  verifiedBy?: string; // User ID of the verifier
  verificationDate?: Date;
  verificationNotes?: string;
  certificateUrl?: string;
}

export interface IPerformanceMetric {
  category: string;
  score: number; // 1-100
  evaluationDate: Date;
  evaluatedBy?: string; // User ID of the evaluator
  notes?: string;
}

export interface IReliabilityMetric {
  category: string; // e.g., 'attendance', 'punctuality', 'task_completion'
  score: number; // 1-100
  incidents?: number; // Number of incidents (e.g., late arrivals)
  lastUpdated: Date;
}

export interface IBackgroundCheck {
  type: BackgroundCheckType;
  status: BackgroundCheckStatus;
  requestDate: Date;
  completionDate?: Date;
  expiryDate?: Date;
  provider?: string;
  referenceNumber?: string;
  documentUrl?: string;
  notes?: string;
  result?: string;
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
      coordinates?: [number, number]; // [longitude, latitude]
    };
    dateOfBirth: Date;
    nationality: string;
    languages: Array<{
      name: string;
      proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
      certified?: boolean;
      certificationDetails?: string;
    }>;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    };
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
      negotiable?: boolean;
    };
    willingToTravel?: boolean;
    travelDistance?: number; // in miles/kilometers
    canWorkRemotely?: boolean;
    noticePeriod?: number; // in days
    currentlyEmployed?: boolean;
    availableFrom?: Date;
  };
  skills: Array<{
    name: string;
    category: SkillCategory;
    level: number; // 1-5
    yearsOfExperience: number;
    lastUsed?: Date;
    certifications?: string[];
    endorsements?: number;
    projects?: string[]; // References to projects where this skill was used
    selfAssessed: boolean; // Whether the skill level was self-assessed or verified
    verificationStatus?: VerificationStatus;
    verifiedBy?: string; // User ID of the verifier
    verificationDate?: Date;
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
    skills?: string[]; // Skills related to this certification
    verificationStatus: VerificationStatus;
    verifiedBy?: string; // User ID of the verifier
    verificationDate?: Date;
    documentUrl?: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadDate: Date;
    expiryDate?: Date;
    verified: boolean;
    verificationStatus: VerificationStatus;
    verificationDate?: Date;
    verifiedBy?: string; // User ID of the verifier
    rejectionReason?: string;
    notes?: string;
  }>;
  preferences: {
    jobTypes: string[];
    industries: string[];
    locations: string[];
    shiftPreferences: string[];
    minimumRate: number;
    noticePeriod?: number;
    workEnvironment?: string[]; // e.g., 'office', 'remote', 'hybrid'
    companySize?: string[]; // e.g., 'startup', 'small', 'medium', 'large'
    benefits?: string[]; // e.g., 'health insurance', 'pension', 'flexible hours'
    dealBreakers?: string[]; // Factors that would make a job unacceptable
    availability: {
      type: AvailabilityType;
      customSchedule?: Array<{
        day: string; // 'monday', 'tuesday', etc.
        startTime: string; // '09:00'
        endTime: string; // '17:00'
      }>;
      availableFrom: Date;
      availableTo?: Date;
      notes?: string;
    };
    travelPreferences?: {
      maxDistance: number; // in miles/kilometers
      transportModes: string[]; // e.g., 'car', 'public transport'
      relocate: boolean;
      relocateLocations?: string[];
    };
  };
  metrics: {
    profileCompleteness: number;
    totalPlacements: number;
    averageRating: number;
    reliabilityScore: number;
    lastActive: Date;
    performance: IPerformanceMetric[];
    reliability: IReliabilityMetric[];
    attendanceRate?: number; // Percentage of shifts attended
    punctualityRate?: number; // Percentage of shifts where worker was on time
    completionRate?: number; // Percentage of assignments completed successfully
    clientSatisfaction?: number; // Average client satisfaction score (1-5)
    rehireRate?: number; // Percentage of clients who would rehire
    cancellationRate?: number; // Percentage of shifts cancelled by worker
    responseTime?: number; // Average time to respond to job offers (in hours)
  };
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    rightToWork: boolean;
    qualifications: boolean;
    references: boolean;
    address: boolean;
    bankDetails?: boolean;
    taxInformation?: boolean;
  };
  backgroundChecks: IBackgroundCheck[];
  workHistory: {
    totalJobs: number;
    totalHours: number;
    averageHoursPerWeek: number;
    longestPlacement: number; // in days
    mostFrequentJobType: string;
    mostFrequentIndustry: string;
    mostFrequentLocation: string;
    employmentGaps: Array<{
      startDate: Date;
      endDate: Date;
      durationDays: number;
      reason?: string;
    }>;
    jobSuccessRate: number; // Percentage of successful job completions
  };
  createdAt: Date;
  updatedAt: Date;
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
      country: String,
      coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
    },
    dateOfBirth: Date,
    nationality: String,
    languages: [{
      name: String,
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native']
      },
      certified: Boolean,
      certificationDetails: String
    }],
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    }
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
      },
      negotiable: Boolean
    },
    willingToTravel: Boolean,
    travelDistance: Number,
    canWorkRemotely: Boolean,
    noticePeriod: Number,
    currentlyEmployed: Boolean,
    availableFrom: Date
  },
  skills: [{
    name: String,
    category: {
      type: String,
      enum: Object.values(SkillCategory),
      default: SkillCategory.OTHER
    },
    level: {
      type: Number,
      min: 1,
      max: 5
    },
    yearsOfExperience: Number,
    lastUsed: Date,
    certifications: [String],
    endorsements: Number,
    projects: [String],
    selfAssessed: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING
    },
    verifiedBy: String,
    verificationDate: Date
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
    responsibilities: [String],
    achievements: [String],
    employmentType: {
      type: String,
      enum: Object.values(EmploymentType)
    },
    references: [{
      name: String,
      position: String,
      contact: String,
      email: String,
      verified: Boolean,
      verificationDate: Date
    }],
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING
    },
    verifiedBy: String,
    verificationDate: Date,
    verificationNotes: String
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startDate: Date,
    endDate: Date,
    current: Boolean,
    grade: String,
    achievements: [String],
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING
    },
    verifiedBy: String,
    verificationDate: Date,
    verificationNotes: String,
    certificateUrl: String
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String,
    credentialUrl: String,
    skills: [String],
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING
    },
    verifiedBy: String,
    verificationDate: Date,
    documentUrl: String
  }],
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date,
    expiryDate: Date,
    verified: Boolean,
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING
    },
    verificationDate: Date,
    verifiedBy: String,
    rejectionReason: String,
    notes: String
  }],
  preferences: {
    jobTypes: [String],
    industries: [String],
    locations: [String],
    shiftPreferences: [String],
    minimumRate: Number,
    noticePeriod: Number,
    workEnvironment: [String],
    companySize: [String],
    benefits: [String],
    dealBreakers: [String],
    availability: {
      type: {
        type: String,
        enum: Object.values(AvailabilityType),
        default: AvailabilityType.FLEXIBLE
      },
      customSchedule: [{
        day: String,
        startTime: String,
        endTime: String
      }],
      availableFrom: Date,
      availableTo: Date,
      notes: String
    },
    travelPreferences: {
      maxDistance: Number,
      transportModes: [String],
      relocate: Boolean,
      relocateLocations: [String]
    }
  },
  metrics: {
    profileCompleteness: Number,
    totalPlacements: Number,
    averageRating: Number,
    reliabilityScore: Number,
    lastActive: Date,
    performance: [{
      category: String,
      score: Number,
      evaluationDate: Date,
      evaluatedBy: String,
      notes: String
    }],
    reliability: [{
      category: String,
      score: Number,
      incidents: Number,
      lastUpdated: Date
    }],
    attendanceRate: Number,
    punctualityRate: Number,
    completionRate: Number,
    clientSatisfaction: Number,
    rehireRate: Number,
    cancellationRate: Number,
    responseTime: Number
  },
  verificationStatus: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    identity: { type: Boolean, default: false },
    rightToWork: { type: Boolean, default: false },
    qualifications: { type: Boolean, default: false },
    references: { type: Boolean, default: false },
    address: { type: Boolean, default: false },
    bankDetails: { type: Boolean, default: false },
    taxInformation: { type: Boolean, default: false }
  },
  backgroundChecks: [{
    type: {
      type: String,
      enum: Object.values(BackgroundCheckType)
    },
    status: {
      type: String,
      enum: Object.values(BackgroundCheckStatus),
      default: BackgroundCheckStatus.NOT_STARTED
    },
    requestDate: Date,
    completionDate: Date,
    expiryDate: Date,
    provider: String,
    referenceNumber: String,
    documentUrl: String,
    notes: String,
    result: String
  }],
  workHistory: {
    totalJobs: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    averageHoursPerWeek: { type: Number, default: 0 },
    longestPlacement: { type: Number, default: 0 },
    mostFrequentJobType: String,
    mostFrequentIndustry: String,
    mostFrequentLocation: String,
    employmentGaps: [{
      startDate: Date,
      endDate: Date,
      durationDays: Number,
      reason: String
    }],
    jobSuccessRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
workerProfileSchema.index({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });
workerProfileSchema.index({ 'skills.name': 1, 'skills.level': 1 });
workerProfileSchema.index({ 'skills.category': 1 });
workerProfileSchema.index({ 'preferences.jobTypes': 1 });
workerProfileSchema.index({ 'preferences.locations': 1 });
workerProfileSchema.index({ 'preferences.industries': 1 });
workerProfileSchema.index({ 'metrics.profileCompleteness': 1 });
workerProfileSchema.index({ 'metrics.reliabilityScore': 1 });
workerProfileSchema.index({ 'metrics.averageRating': 1 });
workerProfileSchema.index({ 'workHistory.totalJobs': 1 });
workerProfileSchema.index({ 'backgroundChecks.status': 1 });
workerProfileSchema.index({ 'backgroundChecks.expiryDate': 1 });
workerProfileSchema.index({ 'certifications.expiryDate': 1 });
workerProfileSchema.index({ 'documents.expiryDate': 1 });
workerProfileSchema.index({ 'preferences.availability.availableFrom': 1 });

// Methods
workerProfileSchema.methods.calculateReliabilityScore = function() {
  // Implementation would calculate a reliability score based on various metrics
  // For now, this is a placeholder
  return 0;
};

workerProfileSchema.methods.calculateProfileCompleteness = function() {
  // Implementation would calculate profile completeness percentage
  // For now, this is a placeholder
  return 0;
};

workerProfileSchema.methods.updateWorkHistory = function() {
  // Implementation would update work history metrics based on completed jobs
  // For now, this is a placeholder
};

export const WorkerProfile = mongoose.model<IWorkerProfile>('WorkerProfile', workerProfileSchema);