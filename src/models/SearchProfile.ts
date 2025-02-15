import mongoose, { Schema } from 'mongoose';

export enum MatchPriority {
  REQUIRED = 'required',
  PREFERRED = 'preferred',
  OPTIONAL = 'optional'
}

export interface ISearchProfile {
  userId: string;
  clientId?: string;
  isActive: boolean;
  jobTypes: string[];
  skills: Array<{
    name: string;
    level: number;
    priority: MatchPriority;
    yearsOfExperience?: number;
  }>;
  certifications: Array<{
    name: string;
    priority: MatchPriority;
    expiryRequired?: boolean;
  }>;
  availability: {
    daysOfWeek: number[];
    timeRanges: Array<{
      start: string;
      end: string;
    }>;
    timezone: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    maxDistance?: number;
    remoteOnly?: boolean;
  };
  compensation: {
    minRate: number;
    maxRate: number;
    currency: string;
    rateType: 'hourly' | 'daily' | 'monthly';
  };
  preferences: {
    industries?: string[];
    companyTypes?: string[];
    teamSize?: string[];
    workEnvironment?: string[];
    benefits?: string[];
  };
  restrictions: {
    excludedClients?: string[];
    excludedLocations?: string[];
    noNightShifts?: boolean;
    noWeekends?: boolean;
    maxHoursPerWeek?: number;
    minRestHours?: number;
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    version: number;
    lastMatchAt?: Date;
    matchScore?: number;
  };
}

const searchProfileSchema = new Schema<ISearchProfile>({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  clientId: {
    type: String,
    ref: 'Client'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  jobTypes: [{
    type: String,
    required: true
  }],
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    priority: {
      type: String,
      enum: Object.values(MatchPriority),
      required: true
    },
    yearsOfExperience: Number
  }],
  certifications: [{
    name: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: Object.values(MatchPriority),
      required: true
    },
    expiryRequired: {
      type: Boolean,
      default: true
    }
  }],
  availability: {
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    timeRanges: [{
      start: String,
      end: String
    }],
    timezone: {
      type: String,
      required: true
    }
  },
  location: {
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    maxDistance: Number,
    remoteOnly: {
      type: Boolean,
      default: false
    }
  },
  compensation: {
    minRate: {
      type: Number,
      required: true
    },
    maxRate: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    rateType: {
      type: String,
      enum: ['hourly', 'daily', 'monthly'],
      required: true
    }
  },
  preferences: {
    industries: [String],
    companyTypes: [String],
    teamSize: [String],
    workEnvironment: [String],
    benefits: [String]
  },
  restrictions: {
    excludedClients: [String],
    excludedLocations: [String],
    noNightShifts: Boolean,
    noWeekends: Boolean,
    maxHoursPerWeek: Number,
    minRestHours: Number
  },
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    },
    lastMatchAt: Date,
    matchScore: Number
  }
}, {
  timestamps: true
});

// Indexes
searchProfileSchema.index({ userId: 1, isActive: 1 });
searchProfileSchema.index({ clientId: 1 });
searchProfileSchema.index({ jobTypes: 1 });
searchProfileSchema.index({ 'location.coordinates': '2dsphere' });
searchProfileSchema.index({ 'skills.name': 1, 'skills.level': 1 });
searchProfileSchema.index({ 'metadata.lastMatchAt': 1 });

export const SearchProfile = mongoose.model<ISearchProfile>('SearchProfile', searchProfileSchema); 