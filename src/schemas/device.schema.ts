import { Schema } from 'mongoose';
import { DeviceType, DeviceStatus, DeviceOS } from '../interfaces/device.interface';

export const DeviceSchema = new Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true,
  },
  os: {
    type: String,
    enum: Object.values(DeviceOS),
    required: true,
  },
  osVersion: String,
  model: String,
  manufacturer: String,
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(DeviceStatus),
    default: DeviceStatus.ACTIVE,
  },
  lastActive: Date,
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  fcmToken: String,
  appVersion: String,
  ipAddress: String,
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    lastUpdated: Date,
  },
  security: {
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    hasPasscode: {
      type: Boolean,
      default: false,
    },
    hasBiometrics: {
      type: Boolean,
      default: false,
    },
    isTrusted: {
      type: Boolean,
      default: true,
    },
    isJailbroken: Boolean,
    isRooted: Boolean,
  },
  usage: {
    sessionCount: {
      type: Number,
      default: 0,
    },
    totalUsageTime: {
      type: Number,
      default: 0,
    },
    lastSessionDuration: Number,
  },
  permissions: {
    notifications: {
      type: Boolean,
      default: false,
    },
    location: {
      type: Boolean,
      default: false,
    },
    camera: {
      type: Boolean,
      default: false,
    },
    microphone: {
      type: Boolean,
      default: false,
    },
    contacts: {
      type: Boolean,
      default: false,
    },
    storage: {
      type: Boolean,
      default: false,
    },
  },
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
  collection: 'devices',
});

// Indexes for better query performance
DeviceSchema.index({ deviceId: 1 }, { unique: true });
DeviceSchema.index({ userId: 1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ lastActive: -1 });
DeviceSchema.index({ type: 1 });
DeviceSchema.index({ os: 1 });

// Methods
DeviceSchema.methods.updateStatus = function(status: DeviceStatus) {
  this.status = status;
  return this.save();
};

DeviceSchema.methods.recordSession = function(duration: number) {
  this.lastActive = new Date();
  this.usage.sessionCount += 1;
  this.usage.totalUsageTime += duration;
  this.usage.lastSessionDuration = duration;
  return this.save();
};

DeviceSchema.methods.updateLocation = function(latitude: number, longitude: number, accuracy?: number) {
  this.location = {
    latitude,
    longitude,
    accuracy: accuracy || 0,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Static methods
DeviceSchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId }).sort({ lastActive: -1 });
};

DeviceSchema.statics.findActiveDevices = function() {
  return this.find({ status: DeviceStatus.ACTIVE }).sort({ lastActive: -1 });
};

DeviceSchema.statics.findByDeviceId = function(deviceId: string) {
  return this.findOne({ deviceId });
}; 