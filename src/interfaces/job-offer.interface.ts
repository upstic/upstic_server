import { Document, Types } from 'mongoose';

export enum JobOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

export interface IJobOffer extends Document {
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  status: JobOfferStatus;
  offerDate: Date;
  responseDate?: Date;
  expiryDate: Date;
  hourlyRate: number;
  offerType: 'permanent' | 'temporary' | 'contract';
  startDate: Date;
  endDate?: Date;
  contractType: string;
  location: {
    name: string;
    address: string;
    coordinates?: [number, number];
  };
  probationPeriod?: {
    duration: number; // in days
    endDate: Date;
  };
  rejectionReason?: string;
  notes?: string;
  documents?: Array<{
    type: string;
    url: string;
    uploadDate: Date;
  }>;
  history: Array<{
    status: JobOfferStatus;
    date: Date;
    updatedBy: Types.ObjectId;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
} 