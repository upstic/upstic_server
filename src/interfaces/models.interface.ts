import { Document, Types } from 'mongoose';
import { UserRole } from '../models/User';
import { DayOfWeek, ShiftType } from '../dtos/availability.dto';
import { ReportType } from '../types/report.types';

export interface IContact {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary?: boolean;
}

export interface IClient extends Document {
  _id: Types.ObjectId;
  companyName: string;
  description?: string;
  industry?: string;
  status: string;
  contacts?: IContact[];
  workers?: any[];
  contracts?: any[];
  billing?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkerAvailability {
  status: string;
  schedule: Array<{
    day: string;
    isAvailable: boolean;
    shifts?: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
}

export interface IWorker extends Document {
  _id: Types.ObjectId;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  skills: string[];
  experience: number;
  preferredLocation: string;
  status: string;
  availability: IWorkerAvailability;
  salary: {
    expected: number;
    currency: string;
  };
  languages: string[];
  documents: Array<{
    type: string;
    name: string;
    url: string;
    verified: boolean;
  }>;
  metrics: {
    reliabilityScore: number;
    profileCompleteness: number;
    totalPlacements: number;
    averageRating: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IJob extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  clientId: string;
  skills: string[];
  experience: number;
  location: {
    coordinates: [number, number];
    address: string;
  };
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  status: JobStatus;
  publishedAt: Date | null;
  startDate: Date;
  endDate?: Date;
  jobType: string;
  languages?: string[];
  requirements?: {
    certifications?: string[];
    education?: string;
    experience?: number;
  };
  urgency?: 'low' | 'normal' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  workerId: Types.ObjectId;
  jobId: Types.ObjectId;
  status: string;
  startDate: Date;
  endDate: Date;
  rate: number;
  timeline: Array<{
    action: string;
    status: string;
    note?: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShift {
  _id: Types.ObjectId;
  workerId: Types.ObjectId;
  clientId: Types.ObjectId;
  jobId: Types.ObjectId;
  date: Date;
  hours: number;
  rate: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument extends Document {
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  url: string;
  workerId: Types.ObjectId;
  status: string;
  expiryDate?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReport extends Document {
  _id: Types.ObjectId;
  type: ReportType;
  format: string;
  status: string;
  parameters?: any;
  generatedFileUrl?: string;
  error?: string;
  recipients?: string[];
  lastGenerated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMatch extends Document {
  _id: Types.ObjectId;
  jobId: string;
  workerId: string;
  score: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  day: string;
  startTime: string;
  endTime: string;
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum WorkerStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  WORKING = 'WORKING',
  SUSPENDED = 'SUSPENDED'
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED'
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum ShiftStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum DocumentType {
  ID = 'ID',
  RESUME = 'RESUME',
  CERTIFICATION = 'CERTIFICATION',
  BACKGROUND_CHECK = 'BACKGROUND_CHECK',
  OTHER = 'OTHER'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV'
}

export enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IWorkerProfile {
  userId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    photoUrl?: string;
    thumbnailUrl?: string;
    summary?: string;
    skills?: string[];
    salary?: {
      expected: number;
      currency: string;
    };
    location?: {
      coordinates: [number, number];
      address: string;
    };
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    dateOfBirth?: Date;
    nationality?: string;
    languages?: Array<{
      name: string;
      level: string;
    }>;
  };
  workExperience?: Array<{
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
  }>;
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadDate: Date;
    verified: boolean;
  }>;
  metrics: {
    profileCompleteness: number;
    totalPlacements: number;
    averageRating: number;
    reliabilityScore: number;
    lastActive: Date;
  };
}

export interface JobSearchParams {
  query?: string;
  location?: {
    coordinates: [number, number];
    maxDistance?: number;
  };
  skills?: string[];
  salary?: {
    min?: number;
    max?: number;
  };
  jobType?: string;
  page?: number;
  limit?: number;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date;
  loginCount: number;
  tokenVersion?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidatePassword: string): Promise<boolean>;
}

export interface IUserTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IUserWithTokens {
  user: IUser;
  tokens: IUserTokens;
}

export interface IUserDocument extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  loginCount: number;
  preferences: {
    availability: Array<{
      startDate: Date;
      endDate: Date;
      isAvailable: boolean;
    }>;
    locations: string[];
  };
  permissions: string[];
  tokenVersion: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IWorkerService {
  createProfile(userId: string, userData?: Partial<IUser>): Promise<IWorker>;
  // ... other methods
}

export interface IClientService {
  createProfile(userId: string, userData?: Partial<IUser>): Promise<IClient>;
  // ... other methods
}

// Availability interfaces
export interface IAvailability extends Document {
  workerId: string;
  regularSchedule: Array<{
    dayOfWeek: DayOfWeek;
    shifts: Array<{
      type: ShiftType;
      startTime: string;
      endTime: string;
    }>;
    isAvailable: boolean;
  }>;
  exceptions?: Array<{
    date: Date;
    isAvailable: boolean;
    shifts?: Array<{
      type: ShiftType;
      startTime: string;
      endTime: string;
    }>;
    reason?: string;
  }>;
  preferences?: {
    maxWeeklyHours: number;
    maxDailyHours?: number;
    preferredShiftTypes?: ShiftType[];
  };
  lastUpdated: Date;
}

export interface IInterview extends Document {
  _id: Types.ObjectId;
  candidateId: string;
  candidateName: string;
  interviewers: string[];
  hiringManagerId: string;
  recruiterId?: string;
  scheduledAt: Date;
  duration: number;
  type: 'online' | 'in-person' | 'phone';
  location?: string;
  status: 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
  reschedulingReason?: string;
  feedback?: {
    rating: number;
    feedback: string;
    skills: string[];
    submittedAt: Date;
  };
}
