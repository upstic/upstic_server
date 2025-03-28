import { Schema, model, Document, Types } from 'mongoose';
import { IAddress } from './common/address.interface';

/**
 * Enum for recruiter location type
 */
export enum RecruiterLocationType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TEMPORARY = 'TEMPORARY',
  REMOTE = 'REMOTE',
  CLIENT_SITE = 'CLIENT_SITE',
  FIELD = 'FIELD'
}

/**
 * Interface for operating hours
 */
export interface IOperatingHours {
  monday: { start: string; end: string; closed: boolean };
  tuesday: { start: string; end: string; closed: boolean };
  wednesday: { start: string; end: string; closed: boolean };
  thursday: { start: string; end: string; closed: boolean };
  friday: { start: string; end: string; closed: boolean };
  saturday: { start: string; end: string; closed: boolean };
  sunday: { start: string; end: string; closed: boolean };
  holidayHours?: { date: Date; start: string; end: string; closed: boolean }[];
  timeZone: string;
}

/**
 * Interface for recruiter data location
 */
export interface IRecruiterDataLocation extends Document {
  // Relationships
  recruiterId: Types.ObjectId | string;
  agencyLocationId: Types.ObjectId | string;
  
  // Core data
  locationType: RecruiterLocationType;
  name: string;
  description?: string;
  address: IAddress;
  
  // Contact information
  phone?: string;
  email?: string;
  
  // Scheduling
  operatingHours?: IOperatingHours;
  appointmentBookingUrl?: string;
  
  // Specialization
  specializations?: string[];
  industries?: string[];
  
  // Availability
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  
  // Metrics
  clientMeetingsCount?: number;
  candidateInterviewsCount?: number;
  placementsCount?: number;
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for recruiter data location
 */
const recruiterDataLocationSchema = new Schema<IRecruiterDataLocation>(
  {
    // Relationships
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'RecruiterData',
      required: [true, 'Recruiter ID is required']
    },
    agencyLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'RecruitmentAgencyLocation',
      required: [true, 'Agency location ID is required']
    },
    
    // Core data
    locationType: {
      type: String,
      enum: Object.values(RecruiterLocationType),
      default: RecruiterLocationType.PRIMARY
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required']
      },
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: {
        type: String,
        required: [true, 'State/Province is required']
      },
      postalCode: {
        type: String,
        required: [true, 'Postal code is required']
      },
      country: {
        type: String,
        required: [true, 'Country is required']
      },
      coordinates: {
        latitude: {
          type: Number
        },
        longitude: {
          type: Number
        }
      }
    },
    
    // Contact information
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    
    // Scheduling
    operatingHours: {
      monday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: false }
      },
      tuesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: false }
      },
      wednesday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: false }
      },
      thursday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: false }
      },
      friday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: false }
      },
      saturday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: true }
      },
      sunday: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        closed: { type: Boolean, default: true }
      },
      holidayHours: [
        {
          date: { type: Date },
          start: { type: String },
          end: { type: String },
          closed: { type: Boolean, default: true }
        }
      ],
      timeZone: { type: String, default: 'UTC' }
    },
    appointmentBookingUrl: {
      type: String,
      trim: true
    },
    
    // Specialization
    specializations: [{
      type: String,
      trim: true
    }],
    industries: [{
      type: String,
      trim: true
    }],
    
    // Availability
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Metrics
    clientMeetingsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    candidateInterviewsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    placementsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
recruiterDataLocationSchema.index({ recruiterId: 1, isActive: 1 });
recruiterDataLocationSchema.index({ agencyLocationId: 1, isActive: 1 });
recruiterDataLocationSchema.index({ locationType: 1, isActive: 1 });
recruiterDataLocationSchema.index({ 'address.city': 1, 'address.country': 1 });
recruiterDataLocationSchema.index({ specializations: 1 });
recruiterDataLocationSchema.index({ industries: 1 });
recruiterDataLocationSchema.index({ 'address.coordinates.latitude': 1, 'address.coordinates.longitude': 1 });

// Compound indexes for optimized queries
recruiterDataLocationSchema.index({ recruiterId: 1, locationType: 1, isActive: 1 });
recruiterDataLocationSchema.index({ agencyLocationId: 1, specializations: 1, isActive: 1 });
recruiterDataLocationSchema.index({ recruiterId: 1, startDate: 1, endDate: 1 });

/**
 * Find active locations for a specific recruiter
 */
recruiterDataLocationSchema.statics.findByRecruiter = async function(
  recruiterId: string | Types.ObjectId,
  includeInactive = false
): Promise<IRecruiterDataLocation[]> {
  const query: any = { recruiterId };
  
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ locationType: 1, startDate: -1 });
};

/**
 * Find primary location for a specific recruiter
 */
recruiterDataLocationSchema.statics.findPrimaryLocation = async function(
  recruiterId: string | Types.ObjectId
): Promise<IRecruiterDataLocation | null> {
  return this.findOne({
    recruiterId,
    locationType: RecruiterLocationType.PRIMARY,
    isActive: true
  });
};

/**
 * Find locations by agency location
 */
recruiterDataLocationSchema.statics.findByAgencyLocation = async function(
  agencyLocationId: string | Types.ObjectId,
  includeInactive = false
): Promise<IRecruiterDataLocation[]> {
  const query: any = { agencyLocationId };
  
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ startDate: -1 });
};

/**
 * Find locations by specialization
 */
recruiterDataLocationSchema.statics.findBySpecialization = async function(
  specialization: string,
  recruiterId?: string | Types.ObjectId
): Promise<IRecruiterDataLocation[]> {
  const query: any = {
    specializations: specialization,
    isActive: true
  };
  
  if (recruiterId) {
    query.recruiterId = recruiterId;
  }
  
  return this.find(query).sort({ startDate: -1 });
};

/**
 * Find locations by industry
 */
recruiterDataLocationSchema.statics.findByIndustry = async function(
  industry: string,
  recruiterId?: string | Types.ObjectId
): Promise<IRecruiterDataLocation[]> {
  const query: any = {
    industries: industry,
    isActive: true
  };
  
  if (recruiterId) {
    query.recruiterId = recruiterId;
  }
  
  return this.find(query).sort({ startDate: -1 });
};

/**
 * Find nearby locations based on coordinates
 */
recruiterDataLocationSchema.statics.findNearby = async function(
  latitude: number,
  longitude: number,
  maxDistanceInKm = 10,
  recruiterId?: string | Types.ObjectId
): Promise<IRecruiterDataLocation[]> {
  const query: any = {
    isActive: true,
    'address.coordinates.latitude': { $exists: true },
    'address.coordinates.longitude': { $exists: true }
  };
  
  if (recruiterId) {
    query.recruiterId = recruiterId;
  }
  
  // Find locations and calculate distance
  const locations = await this.find(query);
  
  // Calculate distance for each location
  const locationsWithDistance = locations.map(location => {
    const locationLat = location.address.coordinates.latitude;
    const locationLng = location.address.coordinates.longitude;
    
    // Calculate distance using Haversine formula
    const R = 6371; // Radius of the Earth in km
    const dLat = (locationLat - latitude) * Math.PI / 180;
    const dLon = (locationLng - longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(locationLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return { location, distance };
  });
  
  // Filter by max distance and sort by distance
  return locationsWithDistance
    .filter(item => item.distance <= maxDistanceInKm)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.location);
};

/**
 * Update metrics for a specific location
 */
recruiterDataLocationSchema.statics.updateMetrics = async function(
  locationId: string | Types.ObjectId,
  metrics: {
    clientMeetingsCount?: number;
    candidateInterviewsCount?: number;
    placementsCount?: number;
  }
): Promise<IRecruiterDataLocation | null> {
  const updateData: any = {};
  
  if (metrics.clientMeetingsCount !== undefined) {
    updateData.clientMeetingsCount = metrics.clientMeetingsCount;
  }
  
  if (metrics.candidateInterviewsCount !== undefined) {
    updateData.candidateInterviewsCount = metrics.candidateInterviewsCount;
  }
  
  if (metrics.placementsCount !== undefined) {
    updateData.placementsCount = metrics.placementsCount;
  }
  
  return this.findByIdAndUpdate(
    locationId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

// Export the model
export const RecruiterDataLocation = model<IRecruiterDataLocation>(
  'RecruiterDataLocation',
  recruiterDataLocationSchema
); 