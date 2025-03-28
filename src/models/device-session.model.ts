import { Document, Model } from 'mongoose';
import { Schema } from 'mongoose';

export interface IDeviceSession {
  sessionId: string;
  deviceId: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeviceSessionDocument extends Document, IDeviceSession {}

export interface DeviceSessionModel extends Model<DeviceSessionDocument> {
  findActiveSessionsByDeviceId(deviceId: string): Promise<DeviceSessionDocument[]>;
  findSessionsByUserId(userId: string): Promise<DeviceSessionDocument[]>;
}

export const DeviceSessionSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: String,
  location: String,
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
  collection: 'device_sessions',
});

// Indexes
DeviceSessionSchema.index({ deviceId: 1, isActive: 1 });
DeviceSessionSchema.index({ userId: 1, isActive: 1 });
DeviceSessionSchema.index({ startTime: -1 });

// Methods
DeviceSessionSchema.methods.endSession = function() {
  this.isActive = false;
  this.endTime = new Date();
  return this.save();
};

// Static methods
DeviceSessionSchema.statics.findActiveSessionsByDeviceId = function(deviceId: string) {
  return this.find({ deviceId, isActive: true }).sort({ startTime: -1 });
};

DeviceSessionSchema.statics.findSessionsByUserId = function(userId: string) {
  return this.find({ userId }).sort({ startTime: -1 });
};

export const DeviceSession = {
  name: 'DeviceSession',
  schema: DeviceSessionSchema,
}; 