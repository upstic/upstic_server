import { Schema } from 'mongoose';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'shortlisted'
  | 'interview-scheduled'
  | 'interviewed'
  | 'offer-pending'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type ApplicationSource =
  | 'direct'
  | 'referral'
  | 'job-board'
  | 'company-website'
  | 'social-media'
  | 'recruitment-agency'
  | 'other';

export interface ApplicationDetails {
  coverLetter?: string;
  expectedSalary?: {
    amount: number;
    currency: string;
    period: 'hour' | 'day' | 'week' | 'month' | 'year';
  };
  availableFrom: Date;
  noticePeriod?: number;
  references?: Array<{
    name: string;
    position: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  attachments?: Array<{
    type: 'resume' | 'cover-letter' | 'certificate' | 'other';
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  customFields?: Record<string, any>;
}

export interface ApplicationReview {
  reviewerId: Schema.Types.ObjectId;
  stage: string;
  status: 'pending' | 'approved' | 'rejected';
  rating?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
  reviewedAt: Date;
}

export interface ApplicationInterview {
  type: 'phone' | 'video' | 'in-person' | 'technical' | 'group';
  scheduledAt: Date;
  duration: number;
  location?: string;
  interviewers: Schema.Types.ObjectId[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  feedback?: {
    rating: number;
    comments: string;
    recommendations: string;
    submittedBy: Schema.Types.ObjectId;
    submittedAt: Date;
  };
}

export interface ApplicationOffer {
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  details: {
    position: string;
    salary: {
      base: number;
      bonus?: number;
      currency: string;
      period: string;
    };
    benefits: string[];
    startDate: Date;
    expiryDate: Date;
  };
  history: Array<{
    status: string;
    updatedBy: Schema.Types.ObjectId;
    updatedAt: Date;
    comments?: string;
  }>;
}

export interface ApplicationTimeline {
  stage: string;
  status: string;
  updatedBy: Schema.Types.ObjectId;
  updatedAt: Date;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface ApplicationMetrics {
  timeInStage: number;
  totalProcessingTime: number;
  interviewsCompleted: number;
  reviewsCompleted: number;
  communicationCount: number;
}

export interface ApplicationSearchParams {
  jobId?: Schema.Types.ObjectId;
  workerId?: Schema.Types.ObjectId;
  status?: ApplicationStatus[];
  source?: ApplicationSource[];
  submittedAfter?: Date;
  submittedBefore?: Date;
  stage?: string;
  rating?: number;
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface ApplicationStats {
  totalApplications: number;
  statusDistribution: Record<ApplicationStatus, number>;
  averageProcessingTime: number;
  conversionRates: {
    submitToShortlist: number;
    shortlistToInterview: number;
    interviewToOffer: number;
    offerToAccept: number;
  };
  sourceDistribution: Record<ApplicationSource, number>;
} 