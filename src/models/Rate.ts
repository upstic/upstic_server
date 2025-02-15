import mongoose, { Schema, Document } from 'mongoose';

export interface IRate extends Document {
  branchId: Schema.Types.ObjectId;
  clientId: Schema.Types.ObjectId;
  name: string;
  type: 'standard' | 'premium' | 'custom';
  category: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'project';
  rates: {
    regular: number;
    overtime?: number;
    holiday?: number;
    weekend?: number;
    emergency?: number;
  };
  currency: string;
  markupPercentage: number;
  minimumHours?: number;
  minimumDays?: number;
  terms: {
    paymentTerms: number; // in days
    invoicingFrequency: 'weekly' | 'bi-weekly' | 'monthly';
    latePaymentFee?: number;
    earlyPaymentDiscount?: number;
  };
  applicableTaxes: Array<{
    name: string;
    percentage: number;
    isCompounded: boolean;
  }>;
  specialConditions?: Array<{
    condition: string;
    rate: number;
    description: string;
  }>;
  effectiveDate: Date;
  expiryDate?: Date;
  status: 'active' | 'inactive' | 'expired';
  approvals: Array<{
    userId: Schema.Types.ObjectId;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    date: Date;
    comments?: string;
  }>;
}

const RateSchema: Schema = new Schema({
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['standard', 'premium', 'custom'],
    required: true
  },
  category: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'project'],
    required: true
  },
  rates: {
    regular: { type: Number, required: true },
    overtime: Number,
    holiday: Number,
    weekend: Number,
    emergency: Number
  },
  currency: { type: String, required: true },
  markupPercentage: { type: Number, required: true },
  minimumHours: Number,
  minimumDays: Number,
  terms: {
    paymentTerms: { type: Number, required: true },
    invoicingFrequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      required: true
    },
    latePaymentFee: Number,
    earlyPaymentDiscount: Number
  },
  applicableTaxes: [{
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
    isCompounded: { type: Boolean, default: false }
  }],
  specialConditions: [{
    condition: { type: String, required: true },
    rate: { type: Number, required: true },
    description: String
  }],
  effectiveDate: { type: Date, required: true },
  expiryDate: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  approvals: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true
    },
    date: { type: Date, default: Date.now },
    comments: String
  }]
}, {
  timestamps: true
});

// Indexes
RateSchema.index({ branchId: 1, clientId: 1 });
RateSchema.index({ status: 1 });
RateSchema.index({ effectiveDate: 1, expiryDate: 1 });

// Methods
RateSchema.methods.calculateRate = function(hours: number, type: string = 'regular'): number {
  let baseRate = this.rates[type] || this.rates.regular;
  let total = baseRate * hours;

  // Apply markup
  total *= (1 + this.markupPercentage / 100);

  // Apply taxes
  this.applicableTaxes.forEach(tax => {
    const taxAmount = tax.isCompounded ? 
      total * (tax.percentage / 100) :
      (baseRate * hours) * (tax.percentage / 100);
    total += taxAmount;
  });

  return Math.round(total * 100) / 100;
};

RateSchema.methods.isValid = function(): boolean {
  return this.status === 'active' && 
    (!this.expiryDate || this.expiryDate > new Date());
};

export default mongoose.model<IRate>('Rate', RateSchema); 