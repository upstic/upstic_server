import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export interface ILocation {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactPerson?: string;
  contactPhone?: string;
  isMainBranch: boolean;
}

export interface IRateCard {
  jobType: string;
  baseRate: number;
  overtimeRate: number;
  holidayRate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface IClient extends Document {
  userId: IUser['_id'];
  company?: string;
  industry?: string;
  description?: string;
  website?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  company: String,
  industry: String,
  description: String,
  website: String,
  location: String
}, {
  timestamps: true
});

// Indexes
clientSchema.index({ company: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ 'locations.city': 1 });
clientSchema.index({ 'primaryContact.email': 1 });

export const Client = mongoose.model<IClient>('Client', clientSchema); 