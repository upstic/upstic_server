import mongoose, { Document, Schema } from 'mongoose';

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday'
}

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
  FLEXIBLE = 'flexible'
}

export interface IAvailability extends Document {
  workerId: Schema.Types.ObjectId;
  regularSchedule: {
    dayOfWeek: DayOfWeek;
    shifts: {
      type: ShiftType;
      startTime: string;
      endTime: string;
    }[];
  }[];
  exceptions: {
    date: Date;
    available: boolean;
    shifts?: {
      type: ShiftType;
      startTime: string;
      endTime: string;
    }[];
    note?: string;
  }[];
  preferences: {
    maxHoursPerWeek?: number;
    maxHoursPerDay?: number;
    preferredShiftTypes: ShiftType[];
    minimumHourlyRate: number;
    travelDistance?: number;
    locations: string[];
  };
  lastUpdated: Date;
}

const availabilitySchema = new Schema<IAvailability>({
  workerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  regularSchedule: [{
    dayOfWeek: {
      type: String,
      enum: Object.values(DayOfWeek),
      required: true
    },
    shifts: [{
      type: {
        type: String,
        enum: Object.values(ShiftType),
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      }
    }]
  }],
  exceptions: [{
    date: {
      type: Date,
      required: true
    },
    available: {
      type: Boolean,
      required: true
    },
    shifts: [{
      type: {
        type: String,
        enum: Object.values(ShiftType)
      },
      startTime: String,
      endTime: String
    }],
    note: String
  }],
  preferences: {
    maxHoursPerWeek: Number,
    maxHoursPerDay: Number,
    preferredShiftTypes: [{
      type: String,
      enum: Object.values(ShiftType)
    }],
    minimumHourlyRate: {
      type: Number,
      required: true
    },
    travelDistance: Number,
    locations: [String]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
availabilitySchema.index({ workerId: 1 });
availabilitySchema.index({ 'exceptions.date': 1 });
availabilitySchema.index({ 'preferences.locations': 1 });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema); 