import mongoose, { Schema } from 'mongoose';

export enum TwoFactorMethod {
  APP = 'authenticator_app',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum BackupCodeStatus {
  UNUSED = 'unused',
  USED = 'used'
}

export interface ITwoFactorAuth {
  userId: string;
  isEnabled: boolean;
  preferredMethod: TwoFactorMethod;
  secret?: string;
  backupCodes: Array<{
    code: string;
    status: BackupCodeStatus;
    usedAt?: Date;
  }>;
  recoveryEmail?: string;
  phoneNumber?: string;
  lastVerified?: Date;
  attempts: Array<{
    timestamp: Date;
    success: boolean;
    method: TwoFactorMethod;
    ipAddress: string;
    userAgent: string;
  }>;
  temporarySecrets: Array<{
    secret: string;
    expiresAt: Date;
  }>;
}

const twoFactorAuthSchema = new Schema<ITwoFactorAuth>({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  preferredMethod: {
    type: String,
    enum: Object.values(TwoFactorMethod),
    required: true
  },
  secret: {
    type: String,
    select: false // Hide by default for security
  },
  backupCodes: [{
    code: {
      type: String,
      select: false
    },
    status: {
      type: String,
      enum: Object.values(BackupCodeStatus),
      default: BackupCodeStatus.UNUSED
    },
    usedAt: Date
  }],
  recoveryEmail: String,
  phoneNumber: String,
  lastVerified: Date,
  attempts: [{
    timestamp: Date,
    success: Boolean,
    method: {
      type: String,
      enum: Object.values(TwoFactorMethod)
    },
    ipAddress: String,
    userAgent: String
  }],
  temporarySecrets: [{
    secret: String,
    expiresAt: Date
  }]
}, {
  timestamps: true
});

// Indexes
twoFactorAuthSchema.index({ userId: 1 });
twoFactorAuthSchema.index({ 'attempts.timestamp': 1 });
twoFactorAuthSchema.index({ 'temporarySecrets.expiresAt': 1 }, { expireAfterSeconds: 0 });

export const TwoFactorAuth = mongoose.model<ITwoFactorAuth>('TwoFactorAuth', twoFactorAuthSchema); 