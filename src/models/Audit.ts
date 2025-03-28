import mongoose, { Document, Schema } from 'mongoose';

export enum AuditActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  VERIFY = 'verify',
  ASSIGN = 'assign',
  REVOKE = 'revoke',
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
  OTHER = 'other'
}

export enum AuditResourceType {
  USER = 'user',
  JOB = 'job',
  TIMESHEET = 'timesheet',
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  DOCUMENT = 'document',
  WORKER_PROFILE = 'worker_profile',
  CLIENT_PROFILE = 'client_profile',
  RATING = 'rating',
  NOTIFICATION = 'notification',
  AVAILABILITY = 'availability',
  SHIFT = 'shift',
  SYSTEM = 'system',
  SETTINGS = 'settings',
  OTHER = 'other'
}

export enum AuditSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
  INFO = 'info'
}

export interface IDataChange {
  field: string;
  oldValue?: any;
  newValue?: any;
  changeType: 'add' | 'modify' | 'remove';
}

export interface IMetadata {
  [key: string]: any;
}

export interface IAudit extends Document {
  timestamp: Date;
  userId: Schema.Types.ObjectId | string | null;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  actionType: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: Schema.Types.ObjectId | string;
  resourceName?: string;
  description: string;
  status: AuditStatus;
  severity: AuditSeverity;
  dataChanges?: IDataChange[];
  metadata?: IMetadata;
  relatedAuditIds?: Schema.Types.ObjectId[];
  sessionId?: string;
  requestId?: string;
  duration?: number;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  tags?: string[];
  isAutomated: boolean;
  isCompliant: boolean;
  complianceNotes?: string;
  retentionPeriod?: number;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new Schema<IAudit>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    userEmail: {
      type: String,
      index: true
    },
    userName: String,
    userRole: String,
    ipAddress: String,
    userAgent: String,
    actionType: {
      type: String,
      enum: Object.values(AuditActionType),
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      enum: Object.values(AuditResourceType),
      required: true,
      index: true
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    resourceName: String,
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(AuditStatus),
      required: true,
      default: AuditStatus.SUCCESS,
      index: true
    },
    severity: {
      type: String,
      enum: Object.values(AuditSeverity),
      required: true,
      default: AuditSeverity.INFO,
      index: true
    },
    dataChanges: [{
      field: {
        type: String,
        required: true
      },
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
      changeType: {
        type: String,
        enum: ['add', 'modify', 'remove'],
        required: true
      }
    }],
    metadata: {
      type: Schema.Types.Mixed
    },
    relatedAuditIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Audit'
    }],
    sessionId: {
      type: String,
      index: true
    },
    requestId: {
      type: String,
      index: true
    },
    duration: Number,
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    tags: [{
      type: String,
      index: true
    }],
    isAutomated: {
      type: Boolean,
      default: false,
      index: true
    },
    isCompliant: {
      type: Boolean,
      default: true,
      index: true
    },
    complianceNotes: String,
    retentionPeriod: {
      type: Number,
      default: 365 // Default retention period in days
    },
    expiryDate: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common query patterns
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditSchema.index({ actionType: 1, timestamp: -1 });
auditSchema.index({ status: 1, severity: 1, timestamp: -1 });
auditSchema.index({ timestamp: -1, severity: 1 });

// Pre-save middleware to set expiry date based on retention period
auditSchema.pre('save', function(next) {
  if (this.retentionPeriod && !this.expiryDate) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.retentionPeriod);
    this.expiryDate = expiryDate;
  }
  next();
});

// Static methods
auditSchema.statics.createAuditLog = async function(auditData: Partial<IAudit>) {
  return this.create(auditData);
};

auditSchema.statics.getAuditsByUser = async function(userId: Schema.Types.ObjectId | string, options = {}) {
  return this.find({ userId }, null, options).sort({ timestamp: -1 });
};

auditSchema.statics.getAuditsByResource = async function(
  resourceType: AuditResourceType,
  resourceId: Schema.Types.ObjectId | string,
  options = {}
) {
  return this.find({ resourceType, resourceId }, null, options).sort({ timestamp: -1 });
};

auditSchema.statics.getAuditsByAction = async function(actionType: AuditActionType, options = {}) {
  return this.find({ actionType }, null, options).sort({ timestamp: -1 });
};

auditSchema.statics.getAuditsByTimeRange = async function(startDate: Date, endDate: Date, options = {}) {
  return this.find(
    { timestamp: { $gte: startDate, $lte: endDate } },
    null,
    options
  ).sort({ timestamp: -1 });
};

auditSchema.statics.getAuditsBySeverity = async function(severity: AuditSeverity, options = {}) {
  return this.find({ severity }, null, options).sort({ timestamp: -1 });
};

auditSchema.statics.getComplianceReport = async function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          resourceType: '$resourceType',
          actionType: '$actionType',
          isCompliant: '$isCompliant'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.resourceType',
        actions: {
          $push: {
            actionType: '$_id.actionType',
            isCompliant: '$_id.isCompliant',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ]);
};

auditSchema.statics.getUserActivitySummary = async function(userId: Schema.Types.ObjectId | string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          actionType: '$actionType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            actionType: '$_id.actionType',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

auditSchema.statics.getSystemHealthReport = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        status: { $in: [AuditStatus.FAILURE, AuditStatus.WARNING] }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          status: '$status',
          severity: '$severity'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        issues: {
          $push: {
            status: '$_id.status',
            severity: '$_id.severity',
            count: '$count'
          }
        },
        totalIssues: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Helper method to compare objects and generate data changes
auditSchema.statics.generateDataChanges = function(oldObj: any, newObj: any): IDataChange[] {
  const changes: IDataChange[] = [];
  
  // Handle case where either object is null/undefined
  if (!oldObj) {
    return Object.keys(newObj || {}).map(key => ({
      field: key,
      newValue: newObj[key],
      changeType: 'add'
    }));
  }
  
  if (!newObj) {
    return Object.keys(oldObj || {}).map(key => ({
      field: key,
      oldValue: oldObj[key],
      changeType: 'remove'
    }));
  }
  
  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  allKeys.forEach(key => {
    // Skip if values are the same
    if (JSON.stringify(oldObj[key]) === JSON.stringify(newObj[key])) {
      return;
    }
    
    // Field exists in both objects but values differ
    if (key in oldObj && key in newObj) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        newValue: newObj[key],
        changeType: 'modify'
      });
    }
    // Field exists only in new object
    else if (!(key in oldObj) && key in newObj) {
      changes.push({
        field: key,
        newValue: newObj[key],
        changeType: 'add'
      });
    }
    // Field exists only in old object
    else if (key in oldObj && !(key in newObj)) {
      changes.push({
        field: key,
        oldValue: oldObj[key],
        changeType: 'remove'
      });
    }
  });
  
  return changes;
};

export const Audit = mongoose.model<IAudit>('Audit', auditSchema); 