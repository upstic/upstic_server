import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from '../interfaces/models.interface';

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
  contactEmail?: string;
  purchaseOrderNumber?: string;
  siteReference?: string;
  isMainBranch: boolean;
}

export interface IBillingContact {
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
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

export interface IServiceAgreement {
  name: string;
  startDate: Date;
  endDate?: Date;
  terms: string;
  attachmentUrl?: string;
  status: 'active' | 'pending' | 'expired' | 'terminated';
  signedBy?: string;
  signedDate?: Date;
}

export interface IClient extends Document {
  userId: IUser['_id'];
  // Basic company information
  company: string;
  companyRegistrationNumber?: string;
  industry?: string;
  description?: string;
  website?: string;
  
  // Contact information
  headOfficeAddress?: string;
  contactNumber?: string;
  contactEmail?: string;
  
  // Billing information
  purchaseOrderNumber?: string;
  billingContact?: IBillingContact;
  
  // Locations
  locations?: ILocation[];
  
  // Financial and agreements
  rateCards?: IRateCard[];
  serviceAgreements?: IServiceAgreement[];
  
  // Preferences
  preferredCommunicationMethod?: 'email' | 'phone' | 'portal';
  invoiceFrequency?: 'weekly' | 'biweekly' | 'monthly';
  paymentTerms?: number; // Days to pay
  
  // Metadata
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: IUser['_id'];
  updatedBy?: IUser['_id'];
  notes?: string;
}

const clientSchema = new Schema<IClient>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Basic company information
  company: {
    type: String,
    required: true
  },
  companyRegistrationNumber: String,
  industry: String,
  description: String,
  website: String,
  
  // Contact information
  headOfficeAddress: String,
  contactNumber: String,
  contactEmail: String,
  
  // Billing information
  purchaseOrderNumber: String,
  billingContact: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Locations
  locations: [{
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: String,
    country: {
      type: String,
      default: 'United Kingdom'
    },
    postalCode: {
      type: String,
      required: true
    },
    contactPerson: String,
    contactPhone: String,
    contactEmail: String,
    purchaseOrderNumber: String,
    siteReference: String,
    isMainBranch: {
      type: Boolean,
      default: false
    }
  }],
  
  // Financial and agreements
  rateCards: [{
    jobType: {
      type: String,
      required: true
    },
    baseRate: {
      type: Number,
      required: true
    },
    overtimeRate: Number,
    holidayRate: Number,
    currency: {
      type: String,
      default: 'GBP'
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    effectiveTo: Date
  }],
  
  serviceAgreements: [{
    name: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    terms: {
      type: String,
      required: true
    },
    attachmentUrl: String,
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'terminated'],
      default: 'pending'
    },
    signedBy: String,
    signedDate: Date
  }],
  
  // Preferences
  preferredCommunicationMethod: {
    type: String,
    enum: ['email', 'phone', 'portal'],
    default: 'email'
  },
  invoiceFrequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    default: 'monthly'
  },
  paymentTerms: {
    type: Number,
    default: 30
  },
  
  // Metadata
  status: {
    type: String,
    enum: Object.values(ClientStatus),
    default: ClientStatus.PENDING
  },
  notes: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
clientSchema.index({ company: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ 'locations.city': 1 });
clientSchema.index({ 'billingContact.email': 1 });
clientSchema.index({ companyRegistrationNumber: 1 });
clientSchema.index({ contactEmail: 1 });
clientSchema.index({ 'serviceAgreements.status': 1 });
clientSchema.index({ 'serviceAgreements.endDate': 1 });

// Virtual for active service agreements
clientSchema.virtual('activeServiceAgreements').get(function() {
  if (!this.serviceAgreements) return [];
  const now = new Date();
  return this.serviceAgreements.filter(agreement => 
    agreement.status === 'active' && 
    agreement.startDate <= now && 
    (!agreement.endDate || agreement.endDate >= now)
  );
});

// Method to check if client has active service agreement
clientSchema.methods.hasActiveServiceAgreement = function(): boolean {
  return this.activeServiceAgreements.length > 0;
};

// Method to add a location
clientSchema.methods.addLocation = function(location: ILocation): void {
  if (!this.locations) {
    this.locations = [];
  }
  
  // If this is the first location or marked as main branch, ensure it's the only main branch
  if (location.isMainBranch || this.locations.length === 0) {
    this.locations.forEach(loc => {
      loc.isMainBranch = false;
    });
    location.isMainBranch = true;
  }
  
  this.locations.push(location);
};

// Method to get main branch
clientSchema.methods.getMainBranch = function(): ILocation | null {
  if (!this.locations || this.locations.length === 0) {
    return null;
  }
  
  return this.locations.find(location => location.isMainBranch) || this.locations[0];
};

export const Client = mongoose.model<IClient>('Client', clientSchema); 