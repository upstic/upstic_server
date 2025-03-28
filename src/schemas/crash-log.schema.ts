import { Schema } from 'mongoose';
import { CrashLogSeverity, CrashLogStatus } from '../interfaces/crash-log.interface';

export const CrashLogSchema = new Schema({
  error: {
    message: {
      type: String,
      required: true,
    },
    stack: String,
    type: {
      type: String,
      required: true,
    },
  },
  systemState: {
    memoryUsage: {
      heapUsed: Number,
      heapTotal: Number,
      external: Number,
      rss: Number,
      arrayBuffers: Number,
    },
    cpuLoad: Number,
    processUptime: Number,
  },
  userContext: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: String,
    userAgent: String,
    ipAddress: String,
  },
  environment: {
    os: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      required: true,
    },
    appVersion: String,
    nodeVersion: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  severity: {
    type: String,
    enum: ['critical', 'error', 'warning', 'info'],
    default: 'error',
  },
  status: {
    type: String,
    enum: ['new', 'investigating', 'resolved', 'closed'],
    default: 'new',
  },
  resolution: {
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    notes: String,
    solution: String,
  },
  metadata: Schema.Types.Mixed,
}, {
  timestamps: true,
  collection: 'crash_logs',
});

// Indexes for better query performance
CrashLogSchema.index({ 'environment.timestamp': -1 });
CrashLogSchema.index({ severity: 1 });
CrashLogSchema.index({ status: 1 });
CrashLogSchema.index({ 'userContext.userId': 1 });

// Methods
CrashLogSchema.methods.markAsResolved = async function(userId: string, notes: string, solution: string) {
  this.status = 'resolved';
  this.resolution = {
    resolvedBy: userId,
    resolvedAt: new Date(),
    notes,
    solution
  };
  return this.save();
};

// Static methods
CrashLogSchema.statics.findBySeverity = function(severity: string) {
  return this.find({ severity }).sort({ 'environment.timestamp': -1 });
};

CrashLogSchema.statics.findUnresolved = function() {
  return this.find({ status: { $ne: 'resolved' } }).sort({ 'environment.timestamp': -1 });
};

CrashLogSchema.statics.findByTimeRange = function(startDate: Date, endDate: Date) {
  return this.find({
    'environment.timestamp': {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ 'environment.timestamp': -1 });
}; 