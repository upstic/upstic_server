import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for availability type
 */
export enum AvailabilityType {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  PREFERRED = 'PREFERRED',
  TENTATIVE = 'TENTATIVE'
}

/**
 * Enum for recurrence pattern
 */
export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for day of week
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

/**
 * Enum for availability status
 */
export enum AvailabilityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED'
}

/**
 * Interface for time slot
 */
export interface ITimeSlot {
  startTime: string; // Format: HH:MM in 24-hour format
  endTime: string; // Format: HH:MM in 24-hour format
}

/**
 * Interface for recurrence rule
 */
export interface IRecurrenceRule {
  pattern: RecurrencePattern;
  interval: number; // Every X days/weeks/months
  daysOfWeek?: DayOfWeek[]; // For weekly/biweekly patterns
  dayOfMonth?: number; // For monthly pattern
  startDate: Date;
  endDate?: Date; // Optional end date
  count?: number; // Optional occurrence count
  exceptions?: Date[]; // Dates to exclude
}

/**
 * Interface for location preference
 */
export interface ILocationPreference {
  type: 'ONSITE' | 'REMOTE' | 'HYBRID';
  locations?: Array<{
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    radius?: number; // In kilometers
  }>;
  remotePercentage?: number; // For hybrid, percentage of remote work (0-100)
  notes?: string;
}

/**
 * Interface for availability
 */
export interface IAvailability extends Document {
  // Core data
  userId: Types.ObjectId | string;
  type: AvailabilityType;
  status: AvailabilityStatus;
  title?: string;
  description?: string;
  
  // Time-related fields
  isAllDay: boolean;
  timeSlots?: ITimeSlot[];
  timezone: string;
  
  // Date-related fields
  startDate: Date;
  endDate?: Date;
  
  // Recurrence
  isRecurring: boolean;
  recurrence?: IRecurrenceRule;
  
  // Preferences
  priority: number; // 1-10, higher means more preferred
  locationPreference?: ILocationPreference;
  
  // Job-related preferences
  jobTypes?: string[];
  industries?: string[];
  roles?: string[];
  skills?: string[];
  minHourlyRate?: number;
  
  // Notification
  notifyBeforeHours?: number;
  notificationSent: boolean;
  notificationSentAt?: Date;
  
  // Metadata
  tags?: string[];
  color?: string;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  activate(): Promise<IAvailability>;
  deactivate(): Promise<IAvailability>;
  updateTimeSlots(timeSlots: ITimeSlot[]): Promise<IAvailability>;
  addException(date: Date): Promise<IAvailability>;
  removeException(date: Date): Promise<IAvailability>;
  checkOverlap(startDate: Date, endDate: Date): boolean;
  markNotificationSent(): Promise<IAvailability>;
}

/**
 * Schema for availability
 */
const availabilitySchema = new Schema<IAvailability>(
  {
    // Core data
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(AvailabilityType),
      required: [true, 'Availability type is required'],
      default: AvailabilityType.AVAILABLE,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AvailabilityStatus),
      default: AvailabilityStatus.ACTIVE,
      index: true
    },
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    
    // Time-related fields
    isAllDay: {
      type: Boolean,
      default: false
    },
    timeSlots: [{
      startTime: {
        type: String,
        validate: {
          validator: function(v: string) {
            return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
          },
          message: 'Start time must be in 24-hour format (HH:MM)'
        }
      },
      endTime: {
        type: String,
        validate: {
          validator: function(v: string) {
            return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
          },
          message: 'End time must be in 24-hour format (HH:MM)'
        }
      }
    }],
    timezone: {
      type: String,
      default: 'UTC'
    },
    
    // Date-related fields
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },
    endDate: {
      type: Date,
      index: true
    },
    
    // Recurrence
    isRecurring: {
      type: Boolean,
      default: false,
      index: true
    },
    recurrence: {
      pattern: {
        type: String,
        enum: Object.values(RecurrencePattern)
      },
      interval: {
        type: Number,
        min: 1,
        default: 1
      },
      daysOfWeek: [{
        type: Number,
        enum: Object.values(DayOfWeek)
      }],
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31
      },
      startDate: {
        type: Date
      },
      endDate: {
        type: Date
      },
      count: {
        type: Number,
        min: 1
      },
      exceptions: [{
        type: Date
      }]
    },
    
    // Preferences
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    locationPreference: {
      type: {
        type: String,
        enum: ['ONSITE', 'REMOTE', 'HYBRID'],
        default: 'ONSITE'
      },
      locations: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        address: {
          type: String,
          trim: true
        },
        coordinates: {
          latitude: {
            type: Number,
            min: -90,
            max: 90
          },
          longitude: {
            type: Number,
            min: -180,
            max: 180
          }
        },
        radius: {
          type: Number,
          min: 0
        }
      }],
      remotePercentage: {
        type: Number,
        min: 0,
        max: 100
      },
      notes: {
        type: String,
        trim: true
      }
    },
    
    // Job-related preferences
    jobTypes: [{
      type: String,
      trim: true,
      index: true
    }],
    industries: [{
      type: String,
      trim: true,
      index: true
    }],
    roles: [{
      type: String,
      trim: true,
      index: true
    }],
    skills: [{
      type: String,
      trim: true,
      index: true
    }],
    minHourlyRate: {
      type: Number,
      min: 0
    },
    
    // Notification
    notifyBeforeHours: {
      type: Number,
      min: 0
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: {
      type: Date
    },
    
    // Metadata
    tags: [{
      type: String,
      trim: true,
      index: true
    }],
    color: {
      type: String,
      trim: true
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
availabilitySchema.index({ userId: 1, startDate: 1, endDate: 1 });
availabilitySchema.index({ userId: 1, type: 1, status: 1 });
availabilitySchema.index({ userId: 1, isRecurring: 1 });

// Compound indexes for optimized queries
availabilitySchema.index({ 
  userId: 1, 
  status: 1, 
  startDate: 1, 
  type: 1 
});

// Validate time slots
availabilitySchema.pre('validate', function(next) {
  if (!this.isAllDay && (!this.timeSlots || this.timeSlots.length === 0)) {
    const error = new Error('Time slots are required when not all day');
    return next(error);
  }
  
  if (this.timeSlots && this.timeSlots.length > 0) {
    for (const slot of this.timeSlots) {
      if (slot.startTime >= slot.endTime) {
        const error = new Error('End time must be after start time');
        return next(error);
      }
    }
  }
  
  next();
});

// Validate recurrence
availabilitySchema.pre('validate', function(next) {
  if (this.isRecurring && !this.recurrence) {
    const error = new Error('Recurrence details are required for recurring availability');
    return next(error);
  }
  
  if (this.recurrence) {
    // Validate recurrence pattern specific fields
    if (this.recurrence.pattern === RecurrencePattern.WEEKLY || this.recurrence.pattern === RecurrencePattern.BIWEEKLY) {
      if (!this.recurrence.daysOfWeek || this.recurrence.daysOfWeek.length === 0) {
        const error = new Error('Days of week are required for weekly recurrence');
        return next(error);
      }
    } else if (this.recurrence.pattern === RecurrencePattern.MONTHLY) {
      if (!this.recurrence.dayOfMonth) {
        const error = new Error('Day of month is required for monthly recurrence');
        return next(error);
      }
    }
    
    // Validate end condition
    if (!this.recurrence.endDate && !this.recurrence.count) {
      const error = new Error('Either end date or count is required for recurring availability');
      return next(error);
    }
  }
  
  next();
});

// Validate dates
availabilitySchema.pre('validate', function(next) {
  if (this.endDate && this.startDate > this.endDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  
  next();
});

// Check for expired availability
availabilitySchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.endDate && this.endDate < now && this.status !== AvailabilityStatus.EXPIRED) {
    this.status = AvailabilityStatus.EXPIRED;
  }
  
  next();
});

/**
 * Activate availability
 */
availabilitySchema.methods.activate = async function(): Promise<IAvailability> {
  this.status = AvailabilityStatus.ACTIVE;
  return this.save();
};

/**
 * Deactivate availability
 */
availabilitySchema.methods.deactivate = async function(): Promise<IAvailability> {
  this.status = AvailabilityStatus.INACTIVE;
  return this.save();
};

/**
 * Update time slots
 */
availabilitySchema.methods.updateTimeSlots = async function(
  timeSlots: ITimeSlot[]
): Promise<IAvailability> {
  if (timeSlots.length === 0) {
    throw new Error('At least one time slot is required');
  }
  
  // Validate time slots
  for (const slot of timeSlots) {
    if (slot.startTime >= slot.endTime) {
      throw new Error('End time must be after start time');
    }
  }
  
  this.timeSlots = timeSlots;
  this.isAllDay = false;
  
  return this.save();
};

/**
 * Add exception date
 */
availabilitySchema.methods.addException = async function(
  date: Date
): Promise<IAvailability> {
  if (!this.isRecurring || !this.recurrence) {
    throw new Error('Cannot add exception to non-recurring availability');
  }
  
  if (!this.recurrence.exceptions) {
    this.recurrence.exceptions = [];
  }
  
  // Check if exception already exists
  const dateString = date.toDateString();
  const exists = this.recurrence.exceptions.some(
    exception => exception.toDateString() === dateString
  );
  
  if (!exists) {
    this.recurrence.exceptions.push(date);
  }
  
  return this.save();
};

/**
 * Remove exception date
 */
availabilitySchema.methods.removeException = async function(
  date: Date
): Promise<IAvailability> {
  if (!this.isRecurring || !this.recurrence || !this.recurrence.exceptions) {
    throw new Error('No exceptions to remove');
  }
  
  const dateString = date.toDateString();
  this.recurrence.exceptions = this.recurrence.exceptions.filter(
    exception => exception.toDateString() !== dateString
  );
  
  return this.save();
};

/**
 * Check if availability overlaps with given date range
 */
availabilitySchema.methods.checkOverlap = function(
  startDate: Date,
  endDate: Date
): boolean {
  // Simple case: non-recurring availability
  if (!this.isRecurring) {
    const availabilityEnd = this.endDate || new Date(8640000000000000); // Max date if no end date
    return this.startDate <= endDate && availabilityEnd >= startDate;
  }
  
  // Complex case: recurring availability
  if (!this.recurrence) {
    return false;
  }
  
  // Check if recurrence has ended before the start date
  if (this.recurrence.endDate && this.recurrence.endDate < startDate) {
    return false;
  }
  
  // Check if the recurrence starts after the end date
  if (this.recurrence.startDate > endDate) {
    return false;
  }
  
  // For daily recurrence, there's always an overlap if the dates overlap
  if (this.recurrence.pattern === RecurrencePattern.DAILY) {
    return true;
  }
  
  // For weekly/biweekly recurrence, check if any of the days of week fall within the date range
  if ((this.recurrence.pattern === RecurrencePattern.WEEKLY || 
       this.recurrence.pattern === RecurrencePattern.BIWEEKLY) && 
      this.recurrence.daysOfWeek && 
      this.recurrence.daysOfWeek.length > 0) {
    
    // Calculate the number of days in the range
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check each day in the range
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      // Check if this date is in the exceptions list
      const isException = this.recurrence.exceptions?.some(
        exception => exception.toDateString() === currentDate.toDateString()
      );
      
      if (isException) {
        continue;
      }
      
      // Check if the day of week matches
      const dayOfWeek = currentDate.getDay();
      if (this.recurrence.daysOfWeek.includes(dayOfWeek)) {
        // For biweekly, check if the week number is correct
        if (this.recurrence.pattern === RecurrencePattern.BIWEEKLY) {
          const recurrenceStart = this.recurrence.startDate || this.startDate;
          const weeksDiff = Math.floor((currentDate.getTime() - recurrenceStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
          if (weeksDiff % (this.recurrence.interval * 2) === 0) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // For monthly recurrence, check if the day of month falls within the date range
  if (this.recurrence.pattern === RecurrencePattern.MONTHLY && this.recurrence.dayOfMonth) {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    // Calculate the number of months in the range
    const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
    
    // Check each month in the range
    for (let i = 0; i <= monthsDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + i);
      currentDate.setDate(this.recurrence.dayOfMonth);
      
      // Check if this date is in the exceptions list
      const isException = this.recurrence.exceptions?.some(
        exception => exception.toDateString() === currentDate.toDateString()
      );
      
      if (isException) {
        continue;
      }
      
      // Check if the date falls within the range
      if (currentDate >= startDate && currentDate <= endDate) {
        return true;
      }
    }
    
    return false;
  }
  
  // Default case
  return false;
};

/**
 * Mark notification as sent
 */
availabilitySchema.methods.markNotificationSent = async function(): Promise<IAvailability> {
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  return this.save();
};

/**
 * Find availability by user
 */
availabilitySchema.statics.findByUser = async function(
  userId: Types.ObjectId | string,
  status: AvailabilityStatus = AvailabilityStatus.ACTIVE
): Promise<IAvailability[]> {
  return this.find({
    userId,
    status
  }).sort({ startDate: 1 });
};

/**
 * Find availability by date range
 */
availabilitySchema.statics.findByDateRange = async function(
  userId: Types.ObjectId | string,
  startDate: Date,
  endDate: Date,
  type?: AvailabilityType
): Promise<IAvailability[]> {
  const query: any = {
    userId,
    status: AvailabilityStatus.ACTIVE,
    $or: [
      // Non-recurring availability that overlaps with the date range
      {
        isRecurring: false,
        $or: [
          // Availability that starts within the range
          {
            startDate: { $gte: startDate, $lte: endDate }
          },
          // Availability that ends within the range
          {
            endDate: { $gte: startDate, $lte: endDate }
          },
          // Availability that spans the entire range
          {
            startDate: { $lte: startDate },
            endDate: { $gte: endDate }
          },
          // Availability with no end date that starts before the end of the range
          {
            startDate: { $lte: endDate },
            endDate: null
          }
        ]
      },
      // Recurring availability that might overlap with the date range
      {
        isRecurring: true,
        $or: [
          // Recurring availability with no end date
          {
            'recurrence.endDate': null
          },
          // Recurring availability that ends after the start of the range
          {
            'recurrence.endDate': { $gte: startDate }
          }
        ],
        // Recurring availability that starts before the end of the range
        startDate: { $lte: endDate }
      }
    ]
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ startDate: 1 });
};

/**
 * Find availability by job preferences
 */
availabilitySchema.statics.findByJobPreferences = async function(
  jobType?: string,
  industry?: string,
  role?: string,
  skill?: string,
  minHourlyRate?: number
): Promise<IAvailability[]> {
  const query: any = {
    status: AvailabilityStatus.ACTIVE,
    type: AvailabilityType.AVAILABLE
  };
  
  if (jobType) {
    query.jobTypes = jobType;
  }
  
  if (industry) {
    query.industries = industry;
  }
  
  if (role) {
    query.roles = role;
  }
  
  if (skill) {
    query.skills = skill;
  }
  
  if (minHourlyRate !== undefined) {
    query.minHourlyRate = { $lte: minHourlyRate };
  }
  
  return this.find(query).sort({ priority: -1 });
};

/**
 * Find availability by location
 */
availabilitySchema.statics.findByLocation = async function(
  latitude: number,
  longitude: number,
  maxDistance: number = 50, // Default 50km
  locationType?: 'ONSITE' | 'REMOTE' | 'HYBRID'
): Promise<IAvailability[]> {
  const query: any = {
    status: AvailabilityStatus.ACTIVE,
    type: AvailabilityType.AVAILABLE
  };
  
  if (locationType) {
    query['locationPreference.type'] = locationType;
  }
  
  // Find availabilities with location preferences
  const availabilities = await this.find(query);
  
  // Filter availabilities by location
  return availabilities.filter(availability => {
    // If remote, always include
    if (availability.locationPreference?.type === 'REMOTE') {
      return true;
    }
    
    // If no locations defined, skip
    if (!availability.locationPreference?.locations || 
        availability.locationPreference.locations.length === 0) {
      return false;
    }
    
    // Check if any location is within the max distance
    return availability.locationPreference.locations.some(location => {
      if (!location.coordinates) {
        return false;
      }
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        latitude,
        longitude,
        location.coordinates.latitude,
        location.coordinates.longitude
      );
      
      // Check if within max distance or location's radius (if specified)
      return distance <= (location.radius || maxDistance);
    });
  });
};

/**
 * Find upcoming availability with pending notifications
 */
availabilitySchema.statics.findWithPendingNotifications = async function(): Promise<IAvailability[]> {
  const now = new Date();
  
  return this.find({
    status: AvailabilityStatus.ACTIVE,
    notificationSent: false,
    notifyBeforeHours: { $exists: true, $gt: 0 },
    $or: [
      // Non-recurring availability
      {
        isRecurring: false,
        startDate: {
          $gt: now,
          $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Within next 24 hours
        }
      },
      // Recurring availability (simplified check - would need more complex logic in application code)
      {
        isRecurring: true,
        'recurrence.startDate': { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) }
      }
    ]
  });
};

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Export the model
export const Availability = model<IAvailability>('Availability', availabilitySchema); 