import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  user: Schema.Types.ObjectId;
  sessionId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  os?: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema = new Schema<IUserSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    refreshToken: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    device: String,
    browser: String,
    os: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common query patterns
userSessionSchema.index({ user: 1, isActive: 1 });
userSessionSchema.index({ expiresAt: 1, isActive: 1 });

// Static methods
userSessionSchema.statics.createSession = function(
  userId: Schema.Types.ObjectId | string,
  sessionId: string,
  refreshToken: string,
  ipAddress: string,
  userAgent: string,
  expiresAt: Date,
  options: {
    device?: string;
    browser?: string;
    os?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  } = {}
) {
  return this.create({
    user: userId,
    sessionId,
    refreshToken,
    ipAddress,
    userAgent,
    expiresAt,
    lastActivityAt: new Date(),
    ...options
  });
};

userSessionSchema.statics.findBySessionId = function(sessionId: string) {
  return this.findOne({ sessionId, isActive: true });
};

userSessionSchema.statics.findByRefreshToken = function(refreshToken: string) {
  return this.findOne({ refreshToken, isActive: true });
};

userSessionSchema.statics.updateActivity = function(sessionId: string) {
  return this.findOneAndUpdate(
    { sessionId, isActive: true },
    { lastActivityAt: new Date() },
    { new: true }
  );
};

userSessionSchema.statics.invalidateSession = function(sessionId: string) {
  return this.findOneAndUpdate(
    { sessionId },
    { isActive: false },
    { new: true }
  );
};

userSessionSchema.statics.invalidateAllUserSessions = function(userId: Schema.Types.ObjectId | string) {
  return this.updateMany(
    { user: userId, isActive: true },
    { isActive: false }
  );
};

userSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    { expiresAt: { $lt: new Date() }, isActive: true },
    { isActive: false }
  );
};

userSessionSchema.statics.getActiveSessions = function(userId: Schema.Types.ObjectId | string) {
  return this.find({ user: userId, isActive: true }).sort({ lastActivityAt: -1 });
};

export const UserSession = mongoose.model<IUserSession>('UserSession', userSessionSchema); 