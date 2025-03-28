import { Schema, model, Document, Types, Model } from 'mongoose';
import { ReportExportFormat } from './ReportTemplate';

/**
 * Enum for report generation status
 */
export enum ReportGenerationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED'
}

/**
 * Enum for report delivery status
 */
export enum ReportDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  OPENED = 'OPENED',
  DOWNLOADED = 'DOWNLOADED'
}

/**
 * Enum for report delivery method
 */
export enum ReportDeliveryMethod {
  EMAIL = 'EMAIL',
  DOWNLOAD = 'DOWNLOAD',
  API = 'API',
  WEBHOOK = 'WEBHOOK',
  NOTIFICATION = 'NOTIFICATION'
}

/**
 * Interface for report parameter value
 */
export interface IReportParameterValue {
  name: string;
  value: any;
}

/**
 * Interface for report output
 */
export interface IReportOutput {
  format: ReportExportFormat;
  url?: string;
  fileSize?: number;
  pageCount?: number;
  generatedAt: Date;
  expiresAt?: Date;
}

/**
 * Interface for report delivery
 */
export interface IReportDelivery {
  method: ReportDeliveryMethod;
  recipient: string;
  status: ReportDeliveryStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  downloadedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for report generation
 */
export interface IReportGeneration extends Document {
  // Relationships
  templateId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  
  // Core data
  name: string;
  description?: string;
  parameters: IReportParameterValue[];
  
  // Status
  status: ReportGenerationStatus;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  canceledAt?: Date;
  errorMessage?: string;
  
  // Output
  outputs: IReportOutput[];
  
  // Delivery
  deliveries: IReportDelivery[];
  
  // Scheduling
  isScheduled: boolean;
  scheduleId?: string;
  
  // Usage tracking
  viewCount: number;
  downloadCount: number;
  lastViewedAt?: Date;
  lastDownloadedAt?: Date;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsProcessing(): Promise<IReportGeneration>;
  markAsCompleted(): Promise<IReportGeneration>;
  markAsFailed(errorMessage: string): Promise<IReportGeneration>;
  markAsCanceled(): Promise<IReportGeneration>;
  addOutput(output: Omit<IReportOutput, 'generatedAt'>): Promise<IReportGeneration>;
  addDelivery(delivery: Omit<IReportDelivery, 'status' | 'retryCount'>): Promise<IReportGeneration>;
  updateDeliveryStatus(recipientId: string, status: ReportDeliveryStatus, metadata?: Record<string, any>): Promise<IReportGeneration>;
  incrementViewCount(): Promise<IReportGeneration>;
  incrementDownloadCount(): Promise<IReportGeneration>;
  isExpired(): boolean;
}

/**
 * Interface for report generation model with static methods
 */
export interface IReportGenerationModel extends Model<IReportGeneration> {
  findPendingReports(): Promise<IReportGeneration[]>;
  findByTemplateId(templateId: Types.ObjectId | string): Promise<IReportGeneration[]>;
  findByUserId(userId: Types.ObjectId | string): Promise<IReportGeneration[]>;
  findByCompanyId(companyId: Types.ObjectId | string): Promise<IReportGeneration[]>;
  findPendingDeliveries(): Promise<IReportGeneration[]>;
  cleanupExpiredReports(days: number): Promise<number>;
}

/**
 * Schema for report generation
 */
const reportGenerationSchema = new Schema<IReportGeneration>(
  {
    // Relationships
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: [true, 'Report template ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    
    // Core data
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    parameters: [{
      name: {
        type: String,
        required: true
      },
      value: {
        type: Schema.Types.Mixed
      }
    }],
    
    // Status
    status: {
      type: String,
      enum: Object.values(ReportGenerationStatus),
      default: ReportGenerationStatus.PENDING,
      index: true
    },
    progress: {
      type: Number,
      min: 0,
      max: 100
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    canceledAt: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    
    // Output
    outputs: [{
      format: {
        type: String,
        enum: Object.values(ReportExportFormat),
        required: true
      },
      url: {
        type: String
      },
      fileSize: {
        type: Number
      },
      pageCount: {
        type: Number
      },
      generatedAt: {
        type: Date,
        required: true,
        default: Date.now
      },
      expiresAt: {
        type: Date
      }
    }],
    
    // Delivery
    deliveries: [{
      method: {
        type: String,
        enum: Object.values(ReportDeliveryMethod),
        required: true
      },
      recipient: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: Object.values(ReportDeliveryStatus),
        default: ReportDeliveryStatus.PENDING
      },
      sentAt: {
        type: Date
      },
      deliveredAt: {
        type: Date
      },
      openedAt: {
        type: Date
      },
      downloadedAt: {
        type: Date
      },
      failedAt: {
        type: Date
      },
      errorMessage: {
        type: String
      },
      retryCount: {
        type: Number,
        default: 0
      },
      lastRetryAt: {
        type: Date
      },
      metadata: {
        type: Map,
        of: Schema.Types.Mixed
      }
    }],
    
    // Scheduling
    isScheduled: {
      type: Boolean,
      default: false,
      index: true
    },
    scheduleId: {
      type: String,
      index: true
    },
    
    // Usage tracking
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date
    },
    lastDownloadedAt: {
      type: Date
    },
    
    // Metadata
    tags: [{
      type: String,
      index: true
    }],
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
reportGenerationSchema.index({ status: 1, createdAt: 1 });
reportGenerationSchema.index({ 'deliveries.status': 1 });
reportGenerationSchema.index({ 'outputs.expiresAt': 1 });

/**
 * Mark report as processing
 */
reportGenerationSchema.methods.markAsProcessing = async function(): Promise<IReportGeneration> {
  this.status = ReportGenerationStatus.PROCESSING;
  this.startedAt = new Date();
  this.progress = 0;
  return this.save();
};

/**
 * Mark report as completed
 */
reportGenerationSchema.methods.markAsCompleted = async function(): Promise<IReportGeneration> {
  this.status = ReportGenerationStatus.COMPLETED;
  this.completedAt = new Date();
  this.progress = 100;
  return this.save();
};

/**
 * Mark report as failed
 */
reportGenerationSchema.methods.markAsFailed = async function(errorMessage: string): Promise<IReportGeneration> {
  this.status = ReportGenerationStatus.FAILED;
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  return this.save();
};

/**
 * Mark report as canceled
 */
reportGenerationSchema.methods.markAsCanceled = async function(): Promise<IReportGeneration> {
  this.status = ReportGenerationStatus.CANCELED;
  this.canceledAt = new Date();
  return this.save();
};

/**
 * Add output
 */
reportGenerationSchema.methods.addOutput = async function(
  output: Omit<IReportOutput, 'generatedAt'>
): Promise<IReportGeneration> {
  if (!this.outputs) {
    this.outputs = [];
  }
  
  this.outputs.push({
    ...output,
    generatedAt: new Date()
  });
  
  return this.save();
};

/**
 * Add delivery
 */
reportGenerationSchema.methods.addDelivery = async function(
  delivery: Omit<IReportDelivery, 'status' | 'retryCount'>
): Promise<IReportGeneration> {
  if (!this.deliveries) {
    this.deliveries = [];
  }
  
  this.deliveries.push({
    ...delivery,
    status: ReportDeliveryStatus.PENDING,
    retryCount: 0
  });
  
  return this.save();
};

/**
 * Update delivery status
 */
reportGenerationSchema.methods.updateDeliveryStatus = async function(
  recipientId: string,
  status: ReportDeliveryStatus,
  metadata?: Record<string, any>
): Promise<IReportGeneration> {
  if (!this.deliveries || this.deliveries.length === 0) {
    throw new Error('No deliveries found');
  }
  
  const deliveryIndex = this.deliveries.findIndex(d => d.recipient === recipientId);
  
  if (deliveryIndex === -1) {
    throw new Error(`Delivery with recipient ${recipientId} not found`);
  }
  
  const delivery = this.deliveries[deliveryIndex];
  delivery.status = status;
  
  // Update status-specific timestamps
  const now = new Date();
  switch (status) {
    case ReportDeliveryStatus.SENT:
      delivery.sentAt = now;
      break;
    case ReportDeliveryStatus.DELIVERED:
      delivery.deliveredAt = now;
      break;
    case ReportDeliveryStatus.OPENED:
      delivery.openedAt = now;
      break;
    case ReportDeliveryStatus.DOWNLOADED:
      delivery.downloadedAt = now;
      break;
    case ReportDeliveryStatus.FAILED:
      delivery.failedAt = now;
      delivery.retryCount += 1;
      delivery.lastRetryAt = now;
      break;
  }
  
  // Update metadata if provided
  if (metadata) {
    delivery.metadata = {
      ...(delivery.metadata || {}),
      ...metadata
    };
  }
  
  return this.save();
};

/**
 * Increment view count
 */
reportGenerationSchema.methods.incrementViewCount = async function(): Promise<IReportGeneration> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

/**
 * Increment download count
 */
reportGenerationSchema.methods.incrementDownloadCount = async function(): Promise<IReportGeneration> {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  return this.save();
};

/**
 * Check if report is expired
 */
reportGenerationSchema.methods.isExpired = function(): boolean {
  if (!this.outputs || this.outputs.length === 0) {
    return false;
  }
  
  const now = new Date();
  
  // Check if any output is not expired
  return !this.outputs.some(output => {
    return !output.expiresAt || output.expiresAt > now;
  });
};

/**
 * Find pending reports
 */
reportGenerationSchema.statics.findPendingReports = async function(this: IReportGenerationModel): Promise<IReportGeneration[]> {
  return this.find({
    status: ReportGenerationStatus.PENDING
  }).sort({ createdAt: 1 });
};

/**
 * Find reports by template ID
 */
reportGenerationSchema.statics.findByTemplateId = async function(
  this: IReportGenerationModel,
  templateId: Types.ObjectId | string
): Promise<IReportGeneration[]> {
  return this.find({
    templateId
  }).sort({ createdAt: -1 });
};

/**
 * Find reports by user ID
 */
reportGenerationSchema.statics.findByUserId = async function(
  this: IReportGenerationModel,
  userId: Types.ObjectId | string
): Promise<IReportGeneration[]> {
  return this.find({
    userId
  }).sort({ createdAt: -1 });
};

/**
 * Find reports by company ID
 */
reportGenerationSchema.statics.findByCompanyId = async function(
  this: IReportGenerationModel,
  companyId: Types.ObjectId | string
): Promise<IReportGeneration[]> {
  return this.find({
    companyId
  }).sort({ createdAt: -1 });
};

/**
 * Find reports with pending deliveries
 */
reportGenerationSchema.statics.findPendingDeliveries = async function(this: IReportGenerationModel): Promise<IReportGeneration[]> {
  return this.find({
    status: ReportGenerationStatus.COMPLETED,
    'deliveries.status': ReportDeliveryStatus.PENDING
  }).sort({ completedAt: 1 });
};

/**
 * Clean up expired reports
 */
reportGenerationSchema.statics.cleanupExpiredReports = async function(
  this: IReportGenerationModel,
  days: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.updateMany(
    {
      status: { $in: [ReportGenerationStatus.COMPLETED, ReportGenerationStatus.FAILED, ReportGenerationStatus.CANCELED] },
      updatedAt: { $lt: cutoffDate }
    },
    {
      $set: { status: ReportGenerationStatus.EXPIRED }
    }
  );
  
  return result.modifiedCount;
};

// Export the model
export const ReportGeneration = model<IReportGeneration, IReportGenerationModel>('ReportGeneration', reportGenerationSchema);