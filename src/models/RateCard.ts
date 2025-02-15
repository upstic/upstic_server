import mongoose, { Schema } from 'mongoose';

export interface IRateCard {
  clientId: string;
  jobType: string;
  baseRate: number;
  overtimeRate: number;
  holidayRate: number;
  weekendRate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  minimumHours: number;
  breakDeductions: boolean;
  allowances?: {
    travel?: number;
    meal?: number;
    other?: number;
  };
  markup: {
    percentage: number;
    type: 'flat' | 'tiered';
    tiers?: Array<{
      hours: number;
      percentage: number;
    }>;
  };
  taxes: {
    applicable: boolean;
    rate?: number;
  };
  notes?: string;
}

const rateCardSchema = new Schema<IRateCard>({
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  jobType: {
    type: String,
    required: true
  },
  baseRate: {
    type: Number,
    required: true
  },
  overtimeRate: {
    type: Number,
    required: true
  },
  holidayRate: {
    type: Number,
    required: true
  },
  weekendRate: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  effectiveTo: Date,
  minimumHours: {
    type: Number,
    default: 4
  },
  breakDeductions: {
    type: Boolean,
    default: true
  },
  allowances: {
    travel: Number,
    meal: Number,
    other: Number
  },
  markup: {
    percentage: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['flat', 'tiered'],
      default: 'flat'
    },
    tiers: [{
      hours: Number,
      percentage: Number
    }]
  },
  taxes: {
    applicable: {
      type: Boolean,
      default: true
    },
    rate: Number
  },
  notes: String
}, {
  timestamps: true
});

rateCardSchema.index({ clientId: 1, jobType: 1, effectiveFrom: 1 });

export const RateCard = mongoose.model<IRateCard>('RateCard', rateCardSchema); 