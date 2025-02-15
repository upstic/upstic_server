import mongoose, { Schema } from 'mongoose';

export enum VerificationType {
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  RESIDENCE_PERMIT = 'residence_permit'
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface IIdentityVerification {
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  documentNumber: string;
  issuingCountry: string;
  expiryDate: Date;
  documentImages: {
    front: string;
    back?: string;
    selfie?: string;
  };
  verificationDetails: {
    provider: string;
    checkId: string;
    score?: number;
    verifiedAt?: Date;
    verifiedBy?: string;
    notes?: string;
  };
  checks: Array<{
    type: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    timestamp: Date;
  }>;
  metadata?: Record<string, any>;
}

const identityVerificationSchema = new Schema<IIdentityVerification>({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(VerificationType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.PENDING
  },
  documentNumber: {
    type: String,
    required: true
  },
  issuingCountry: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  documentImages: {
    front: {
      type: String,
      required: true
    },
    back: String,
    selfie: String
  },
  verificationDetails: {
    provider: String,
    checkId: String,
    score: Number,
    verifiedAt: Date,
    verifiedBy: String,
    notes: String
  },
  checks: [{
    type: String,
    status: {
      type: String,
      enum: ['pass', 'fail', 'warning']
    },
    details: String,
    timestamp: Date
  }],
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

identityVerificationSchema.index({ userId: 1, status: 1 });
identityVerificationSchema.index({ documentNumber: 1 });
identityVerificationSchema.index({ 'verificationDetails.checkId': 1 });

export const IdentityVerification = mongoose.model<IIdentityVerification>(
  'IdentityVerification',
  identityVerificationSchema
); 