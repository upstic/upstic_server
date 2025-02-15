import mongoose, { Schema } from 'mongoose';

export enum RequirementType {
  DOCUMENT = 'document',
  CERTIFICATION = 'certification',
  TRAINING = 'training',
  BACKGROUND_CHECK = 'background_check',
  MEDICAL_CHECK = 'medical_check',
  ASSESSMENT = 'assessment'
}

export enum RenewalFrequency {
  NEVER = 'never',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  BIENNIAL = 'biennial'
}

export interface IComplianceRequirement {
  name: string;
  type: RequirementType;
  description: string;
  isRequired: boolean;
  validityPeriod?: number; // in days
  renewalFrequency: RenewalFrequency;
  notificationDays: number[]; // days before expiry to notify
  verificationProcess?: {
    steps: string[];
    requiredFields: string[];
    autoVerify: boolean;
  };
  applicableJobTypes: string[];
  documentFormat?: string[];
  maxFileSize?: number;
}

const complianceRequirementSchema = new Schema<IComplianceRequirement>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(RequirementType),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  validityPeriod: Number,
  renewalFrequency: {
    type: String,
    enum: Object.values(RenewalFrequency),
    required: true
  },
  notificationDays: {
    type: [Number],
    default: [30, 14, 7, 1]
  },
  verificationProcess: {
    steps: [String],
    requiredFields: [String],
    autoVerify: {
      type: Boolean,
      default: false
    }
  },
  applicableJobTypes: [String],
  documentFormat: [String],
  maxFileSize: Number
}, {
  timestamps: true
});

complianceRequirementSchema.index({ type: 1, isRequired: 1 });
complianceRequirementSchema.index({ 'applicableJobTypes': 1 });

export const ComplianceRequirement = mongoose.model<IComplianceRequirement>(
  'ComplianceRequirement',
  complianceRequirementSchema
); 