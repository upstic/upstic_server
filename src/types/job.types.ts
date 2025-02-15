import { Schema } from 'mongoose';

export type JobStatus = 
  | 'draft'
  | 'published'
  | 'filled'
  | 'cancelled'
  | 'expired'
  | 'on-hold';

export type JobType = 
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'temporary'
  | 'internship'
  | 'freelance';

export type ExperienceLevel = 
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive';

export interface JobLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type: 'remote' | 'on-site' | 'hybrid';
  remoteDetails?: {
    type: 'fully-remote' | 'partial-remote';
    allowedRegions?: string[];
    requiredTimeZones?: string[];
  };
}

export interface JobSalary {
  minimum: number;
  maximum: number;
  currency: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  isNegotiable: boolean;
  benefits?: string[];
}

export interface JobRequirement {
  type: 'skill' | 'education' | 'certification' | 'experience';
  name: string;
  level?: string;
  isRequired: boolean;
  description?: string;
}

export interface JobSchedule {
  type: 'fixed' | 'flexible' | 'shifts';
  workDays: string[];
  hoursPerWeek: number;
  startTime?: string;
  endTime?: string;
  timeZone: string;
  shiftPatterns?: {
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
  }[];
}

export interface JobMetrics {
  views: number;
  applications: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  filled: number;
  conversionRate: number;
  averageResponseTime: number;
}

export interface JobVisibility {
  isPublic: boolean;
  isPromoted: boolean;
  isUrgent: boolean;
  isConfidential: boolean;
  restrictedTo?: {
    companies?: Schema.Types.ObjectId[];
    workers?: Schema.Types.ObjectId[];
    groups?: string[];
  };
}

export interface JobAudit {
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedBy?: Schema.Types.ObjectId;
  updatedAt?: Date;
  publishedBy?: Schema.Types.ObjectId;
  publishedAt?: Date;
  closedBy?: Schema.Types.ObjectId;
  closedAt?: Date;
  reason?: string;
}

export interface JobSearchParams {
  keyword?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  type?: JobType[];
  status?: JobStatus[];
  experienceLevel?: ExperienceLevel[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  skills?: string[];
  company?: Schema.Types.ObjectId;
  postedAfter?: Date;
  postedBefore?: Date;
  isRemote?: boolean;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface JobMatchingCriteria {
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceLevel: ExperienceLevel;
  location: JobLocation;
  salary: JobSalary;
  type: JobType;
  schedule?: JobSchedule;
  customCriteria?: Record<string, any>;
}

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  filledJobs: number;
  expiringJobs: number;
  averageFillTime: number;
  popularSkills: Array<{
    skill: string;
    count: number;
  }>;
  locationDistribution: Array<{
    location: string;
    count: number;
  }>;
  salaryRanges: Array<{
    range: string;
    count: number;
  }>;
} 