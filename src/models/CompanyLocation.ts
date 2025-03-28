import { Schema, model, Document, Types } from 'mongoose';
import { IAddress } from './common/address.interface';

/**
 * Enum for company location type
 */
export enum CompanyLocationType {
  HEADQUARTERS = 'HEADQUARTERS',
  BRANCH = 'BRANCH',
  SATELLITE = 'SATELLITE',
  COWORKING = 'COWORKING',
  VIRTUAL = 'VIRTUAL',
  MANUFACTURING = 'MANUFACTURING',
  WAREHOUSE = 'WAREHOUSE',
  RETAIL = 'RETAIL',
  DISTRIBUTION = 'DISTRIBUTION',
  RESEARCH = 'RESEARCH'
}

/**
 * Enum for company location status
 */
export enum CompanyLocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED',
  PERMANENTLY_CLOSED = 'PERMANENTLY_CLOSED',
  PLANNED = 'PLANNED'
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
 * Interface for facility
 */
export interface IFacility {
  name: string;
  description?: string;
  capacity?: number;
  isAvailable: boolean;
  bookingRequired: boolean;
  bookingUrl?: string;
}

/**
 * Interface for contact person
 */
export interface IContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isMainContact: boolean;
}

/**
 * Interface for company location
 */
export interface ICompanyLocation extends Document {
  // Relationships
  companyId: Types.ObjectId | string;
  parentLocationId?: Types.ObjectId | string;
  
  // Core data
  name: string;
  description?: string;
  locationType: CompanyLocationType;
  status: CompanyLocationStatus;
  address: IAddress;
  
  // Contact information
  phone?: string;
  email?: string;
  website?: string;
  contactPersons: IContactPerson[];
  
  // Scheduling
  operatingHours?: IOperatingHours;
  
  // Facilities
  facilities?: IFacility[];
  
  // Specialization
  departments?: string[];
  services?: string[];
  
  // Capacity
  employeeCount?: number;
  maxCapacity?: number;
  squareFootage?: number;
  
  // Metadata
  openingDate?: Date;
  closingDate?: Date;
  renovationDates?: { startDate: Date; endDate?: Date; description: string }[];
  photos?: { url: string; caption?: string; isPrimary: boolean }[];
  socialMedia?: { platform: string; url: string }[];
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for company location
 */
const companyLocationSchema = new Schema<ICompanyLocation>(
  {
    // Relationships
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required']
    },
    parentLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyLocation'
    },
    
    // Core data
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    locationType: {
      type: String,
      enum: Object.values(CompanyLocationType),
      required: [true, 'Location type is required']
    },
    status: {
      type: String,
      enum: Object.values(CompanyLocationStatus),
      default: CompanyLocationStatus.ACTIVE
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
    website: {
      type: String,
      trim: true
    },
    contactPersons: [
      {
        name: {
          type: String,
          required: [true, 'Contact person name is required']
        },
        title: {
          type: String
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
          match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        phone: {
          type: String,
          trim: true
        },
        isMainContact: {
          type: Boolean,
          default: false
        }
      }
    ],
    
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
    
    // Facilities
    facilities: [
      {
        name: {
          type: String,
          required: [true, 'Facility name is required']
        },
        description: {
          type: String
        },
        capacity: {
          type: Number,
          min: 0
        },
        isAvailable: {
          type: Boolean,
          default: true
        },
        bookingRequired: {
          type: Boolean,
          default: false
        },
        bookingUrl: {
          type: String
        }
      }
    ],
    
    // Specialization
    departments: [
      {
        type: String,
        trim: true
      }
    ],
    services: [
      {
        type: String,
        trim: true
      }
    ],
    
    // Capacity
    employeeCount: {
      type: Number,
      min: 0
    },
    maxCapacity: {
      type: Number,
      min: 0
    },
    squareFootage: {
      type: Number,
      min: 0
    },
    
    // Metadata
    openingDate: {
      type: Date
    },
    closingDate: {
      type: Date
    },
    renovationDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        description: { type: String, required: true }
      }
    ],
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        isPrimary: { type: Boolean, default: false }
      }
    ],
    socialMedia: [
      {
        platform: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    
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
companyLocationSchema.index({ companyId: 1, status: 1 });
companyLocationSchema.index({ locationType: 1, status: 1 });
companyLocationSchema.index({ 'address.city': 1, 'address.country': 1 });
companyLocationSchema.index({ departments: 1 });
companyLocationSchema.index({ services: 1 });
companyLocationSchema.index({ 'address.coordinates.latitude': 1, 'address.coordinates.longitude': 1 });

// Compound indexes for optimized queries
companyLocationSchema.index({ companyId: 1, locationType: 1, status: 1 });
companyLocationSchema.index({ companyId: 1, 'address.city': 1, status: 1 });
companyLocationSchema.index({ parentLocationId: 1, status: 1 });

// Ensure only one main contact person per location
companyLocationSchema.pre('save', function(next) {
  const mainContacts = this.contactPersons.filter(contact => contact.isMainContact);
  
  if (mainContacts.length > 1) {
    const error = new Error('Only one main contact person is allowed per location');
    return next(error);
  }
  
  next();
});

/**
 * Find active locations for a specific company
 */
companyLocationSchema.statics.findByCompany = async function(
  companyId: string | Types.ObjectId,
  includeInactive = false
): Promise<ICompanyLocation[]> {
  const query: any = { companyId };
  
  if (!includeInactive) {
    query.status = CompanyLocationStatus.ACTIVE;
  }
  
  return this.find(query).sort({ locationType: 1, name: 1 });
};

/**
 * Find headquarters for a specific company
 */
companyLocationSchema.statics.findHeadquarters = async function(
  companyId: string | Types.ObjectId
): Promise<ICompanyLocation | null> {
  return this.findOne({
    companyId,
    locationType: CompanyLocationType.HEADQUARTERS,
    status: CompanyLocationStatus.ACTIVE
  });
};

/**
 * Find child locations for a parent location
 */
companyLocationSchema.statics.findChildLocations = async function(
  parentLocationId: string | Types.ObjectId,
  includeInactive = false
): Promise<ICompanyLocation[]> {
  const query: any = { parentLocationId };
  
  if (!includeInactive) {
    query.status = CompanyLocationStatus.ACTIVE;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find locations by department
 */
companyLocationSchema.statics.findByDepartment = async function(
  department: string,
  companyId?: string | Types.ObjectId
): Promise<ICompanyLocation[]> {
  const query: any = {
    departments: department,
    status: CompanyLocationStatus.ACTIVE
  };
  
  if (companyId) {
    query.companyId = companyId;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find locations by service
 */
companyLocationSchema.statics.findByService = async function(
  service: string,
  companyId?: string | Types.ObjectId
): Promise<ICompanyLocation[]> {
  const query: any = {
    services: service,
    status: CompanyLocationStatus.ACTIVE
  };
  
  if (companyId) {
    query.companyId = companyId;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find nearby locations based on coordinates
 */
companyLocationSchema.statics.findNearby = async function(
  latitude: number,
  longitude: number,
  maxDistanceInKm = 10,
  companyId?: string | Types.ObjectId
): Promise<ICompanyLocation[]> {
  const query: any = {
    status: CompanyLocationStatus.ACTIVE,
    'address.coordinates.latitude': { $exists: true },
    'address.coordinates.longitude': { $exists: true }
  };
  
  if (companyId) {
    query.companyId = companyId;
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
 * Find locations by capacity
 */
companyLocationSchema.statics.findByCapacity = async function(
  minCapacity: number,
  companyId?: string | Types.ObjectId
): Promise<ICompanyLocation[]> {
  const query: any = {
    maxCapacity: { $gte: minCapacity },
    status: CompanyLocationStatus.ACTIVE
  };
  
  if (companyId) {
    query.companyId = companyId;
  }
  
  return this.find(query).sort({ maxCapacity: -1 });
};

/**
 * Find locations with specific facilities
 */
companyLocationSchema.statics.findByFacility = async function(
  facilityName: string,
  companyId?: string | Types.ObjectId
): Promise<ICompanyLocation[]> {
  const query: any = {
    'facilities.name': facilityName,
    'facilities.isAvailable': true,
    status: CompanyLocationStatus.ACTIVE
  };
  
  if (companyId) {
    query.companyId = companyId;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Update location status
 */
companyLocationSchema.statics.updateStatus = async function(
  locationId: string | Types.ObjectId,
  status: CompanyLocationStatus,
  updatedBy?: string | Types.ObjectId
): Promise<ICompanyLocation | null> {
  const updateData: any = { status };
  
  if (updatedBy) {
    updateData.updatedBy = updatedBy;
  }
  
  return this.findByIdAndUpdate(
    locationId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

// Export the model
export const CompanyLocation = model<ICompanyLocation>(
  'CompanyLocation',
  companyLocationSchema
); 