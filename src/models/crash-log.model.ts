import { Document, Model } from 'mongoose';
import { ICrashLog, CrashLogSeverity, CrashLogStatus } from '../interfaces/crash-log.interface';
import { CrashLogSchema } from '../schemas/crash-log.schema';

// Extend Document with ICrashLog interface
export interface CrashLogDocument extends Document, ICrashLog {}

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
CrashLogSchema.statics.findBySeverity = function(severity: CrashLogSeverity) {
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

export interface CrashLogModel extends Model<CrashLogDocument> {
  findBySeverity(severity: CrashLogSeverity): Promise<CrashLogDocument[]>;
  findUnresolved(): Promise<CrashLogDocument[]>;
  findByTimeRange(startDate: Date, endDate: Date): Promise<CrashLogDocument[]>;
}

export const CrashLog = {
  name: 'CrashLog',
  schema: CrashLogSchema,
}; 