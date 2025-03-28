import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginHistory extends Document {
  user: Schema.Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  os?: string;
  status: 'success' | 'failed';
  failureReason?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  sessionId?: string;
  loginAt: Date;
  logoutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      required: true
    },
    device: String,
    browser: String,
    os: String,
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
      index: true
    },
    failureReason: String,
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    sessionId: {
      type: String,
      index: true
    },
    loginAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    logoutAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common query patterns
loginHistorySchema.index({ user: 1, loginAt: -1 });
loginHistorySchema.index({ status: 1, loginAt: -1 });
loginHistorySchema.index({ ipAddress: 1, loginAt: -1 });

// Static methods
loginHistorySchema.statics.recordLogin = function(
  userId: Schema.Types.ObjectId | string,
  ipAddress: string,
  userAgent: string,
  status: 'success' | 'failed',
  options: {
    device?: string;
    browser?: string;
    os?: string;
    failureReason?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    sessionId?: string;
  } = {}
) {
  return this.create({
    user: userId,
    ipAddress,
    userAgent,
    status,
    ...options,
    loginAt: new Date()
  });
};

loginHistorySchema.statics.recordLogout = function(sessionId: string) {
  return this.findOneAndUpdate(
    { sessionId, logoutAt: { $exists: false } },
    { logoutAt: new Date() },
    { new: true }
  );
};

loginHistorySchema.statics.getRecentLogins = function(
  userId: Schema.Types.ObjectId | string,
  limit = 10
) {
  return this.find({ user: userId, status: 'success' })
    .sort({ loginAt: -1 })
    .limit(limit);
};

loginHistorySchema.statics.getFailedLoginAttempts = function(
  userId: Schema.Types.ObjectId | string,
  since: Date
) {
  return this.countDocuments({
    user: userId,
    status: 'failed',
    loginAt: { $gte: since }
  });
};

export const LoginHistory = mongoose.model<ILoginHistory>('LoginHistory', loginHistorySchema); 