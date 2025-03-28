import { Schema, model, Document, Types } from 'mongoose';
import { DocumentTemplateType, DocumentTemplateFormat } from './DocumentTemplate';

/**
 * Enum for document generation status
 */
export enum DocumentGenerationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED'
}

/**
 * Enum for document access level
 */
export enum DocumentAccessLevel {
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED',
  PUBLIC = 'PUBLIC'
}

/**
 * Interface for document generation
 */
export interface IDocumentGeneration extends Document {
  // Relationships
  templateId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  
  // Core data
  name: string;
  description?: string;
  type: DocumentTemplateType;
  format: DocumentTemplateFormat;
  
  // Variables
  variables: Record<string, any>;
  
  // Output
  outputUrl?: string;
  outputSize?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  
  // Status
  status: DocumentGenerationStatus;
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  expiresAt?: Date;
  
  // Error information
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  retryCount: number;
  
  // Access control
  accessLevel: DocumentAccessLevel;
  accessCode?: string;
  accessUsers?: Array<Types.ObjectId | string>;
  accessRoles?: string[];
  
  // Usage tracking
  viewCount: number;
  downloadCount: number;
  lastViewed?: Date;
  lastDownloaded?: Date;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Methods
  markAsProcessing(): Promise<IDocumentGeneration>;
  markAsCompleted(outputUrl: string, outputSize: number): Promise<IDocumentGeneration>;
  markAsFailed(errorMessage: string, errorDetails?: Record<string, any>): Promise<IDocumentGeneration>;
  incrementViewCount(): Promise<IDocumentGeneration>;
  incrementDownloadCount(): Promise<IDocumentGeneration>;
  updateAccessLevel(accessLevel: DocumentAccessLevel): Promise<IDocumentGeneration>;
  addAccessUser(userId: Types.ObjectId | string): Promise<IDocumentGeneration>;
  removeAccessUser(userId: Types.ObjectId | string): Promise<IDocumentGeneration>;
  generateAccessCode(): Promise<string>;
  softDelete(): Promise<IDocumentGeneration>;
}

/**
 * Schema for document generation
 */
const documentGenerationSchema = new Schema<IDocumentGeneration>(
  {
    // Relationships
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentTemplate',
      required: [true, 'Template ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Core data
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(DocumentTemplateType),
      required: [true, 'Document type is required'],
      index: true
    },
    format: {
      type: String,
      enum: Object.values(DocumentTemplateFormat),
      required: [true, 'Document format is required'],
      index: true
    },
    
    // Variables
    variables: {
      type: Schema.Types.Mixed,
      required: [true, 'Variables are required']
    },
    
    // Output
    outputUrl: {
      type: String
    },
    outputSize: {
      type: Number
    },
    previewUrl: {
      type: String
    },
    thumbnailUrl: {
      type: String
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(DocumentGenerationStatus),
      default: DocumentGenerationStatus.PENDING,
      index: true
    },
    processingStartedAt: {
      type: Date
    },
    processingCompletedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      index: true
    },
    
    // Error information
    errorMessage: {
      type: String
    },
    errorDetails: {
      type: Schema.Types.Mixed
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Access control
    accessLevel: {
      type: String,
      enum: Object.values(DocumentAccessLevel),
      default: DocumentAccessLevel.PRIVATE,
      index: true
    },
    accessCode: {
      type: String,
      index: true
    },
    accessUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],
    accessRoles: [{
      type: String,
      index: true
    }],
    
    // Usage tracking
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewed: {
      type: Date
    },
    lastDownloaded: {
      type: Date
    },
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed
    },
    tags: [{
      type: String,
      index: true
    }],
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
documentGenerationSchema.index({ userId: 1, status: 1, createdAt: -1 });
documentGenerationSchema.index({ templateId: 1, status: 1, createdAt: -1 });
documentGenerationSchema.index({ status: 1, processingStartedAt: 1 });
documentGenerationSchema.index({ accessLevel: 1, status: 1 });
documentGenerationSchema.index({ tags: 1, status: 1 });

// Compound indexes for optimized queries
documentGenerationSchema.index({ userId: 1, type: 1, status: 1 });
documentGenerationSchema.index({ 'accessUsers': 1, status: 1 });
documentGenerationSchema.index({ 'accessRoles': 1, status: 1 });

// Set default expiration date if not provided
documentGenerationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Default expiration: 30 days from creation
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

/**
 * Mark document as processing
 */
documentGenerationSchema.methods.markAsProcessing = async function(): Promise<IDocumentGeneration> {
  this.status = DocumentGenerationStatus.PROCESSING;
  this.processingStartedAt = new Date();
  return this.save();
};

/**
 * Mark document as completed
 */
documentGenerationSchema.methods.markAsCompleted = async function(
  outputUrl: string,
  outputSize: number
): Promise<IDocumentGeneration> {
  this.status = DocumentGenerationStatus.COMPLETED;
  this.processingCompletedAt = new Date();
  this.outputUrl = outputUrl;
  this.outputSize = outputSize;
  return this.save();
};

/**
 * Mark document as failed
 */
documentGenerationSchema.methods.markAsFailed = async function(
  errorMessage: string,
  errorDetails?: Record<string, any>
): Promise<IDocumentGeneration> {
  this.status = DocumentGenerationStatus.FAILED;
  this.processingCompletedAt = new Date();
  this.errorMessage = errorMessage;
  
  if (errorDetails) {
    this.errorDetails = errorDetails;
  }
  
  this.retryCount += 1;
  return this.save();
};

/**
 * Increment view count
 */
documentGenerationSchema.methods.incrementViewCount = async function(): Promise<IDocumentGeneration> {
  this.viewCount += 1;
  this.lastViewed = new Date();
  return this.save();
};

/**
 * Increment download count
 */
documentGenerationSchema.methods.incrementDownloadCount = async function(): Promise<IDocumentGeneration> {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

/**
 * Update access level
 */
documentGenerationSchema.methods.updateAccessLevel = async function(
  accessLevel: DocumentAccessLevel
): Promise<IDocumentGeneration> {
  this.accessLevel = accessLevel;
  
  // If changing to public, generate an access code if not already present
  if (accessLevel === DocumentAccessLevel.PUBLIC && !this.accessCode) {
    await this.generateAccessCode();
  }
  
  return this.save();
};

/**
 * Add access user
 */
documentGenerationSchema.methods.addAccessUser = async function(
  userId: Types.ObjectId | string
): Promise<IDocumentGeneration> {
  if (!this.accessUsers) {
    this.accessUsers = [];
  }
  
  if (!this.accessUsers.some(id => id.toString() === userId.toString())) {
    this.accessUsers.push(userId);
  }
  
  return this.save();
};

/**
 * Remove access user
 */
documentGenerationSchema.methods.removeAccessUser = async function(
  userId: Types.ObjectId | string
): Promise<IDocumentGeneration> {
  if (!this.accessUsers) {
    return this;
  }
  
  this.accessUsers = this.accessUsers.filter(id => id.toString() !== userId.toString());
  return this.save();
};

/**
 * Generate access code
 */
documentGenerationSchema.methods.generateAccessCode = async function(): Promise<string> {
  // Generate a random 8-character alphanumeric code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  this.accessCode = code;
  await this.save();
  
  return code;
};

/**
 * Soft delete
 */
documentGenerationSchema.methods.softDelete = async function(): Promise<IDocumentGeneration> {
  this.status = DocumentGenerationStatus.DELETED;
  this.deletedAt = new Date();
  return this.save();
};

/**
 * Find documents by user
 */
documentGenerationSchema.statics.findByUser = async function(
  userId: Types.ObjectId | string,
  includeDeleted: boolean = false
): Promise<IDocumentGeneration[]> {
  const query: any = { userId };
  
  if (!includeDeleted) {
    query.status = { $ne: DocumentGenerationStatus.DELETED };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('templateId', 'name type category format');
};

/**
 * Find documents by template
 */
documentGenerationSchema.statics.findByTemplate = async function(
  templateId: Types.ObjectId | string,
  includeDeleted: boolean = false
): Promise<IDocumentGeneration[]> {
  const query: any = { templateId };
  
  if (!includeDeleted) {
    query.status = { $ne: DocumentGenerationStatus.DELETED };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('userId', 'firstName lastName email');
};

/**
 * Find documents by status
 */
documentGenerationSchema.statics.findByStatus = async function(
  status: DocumentGenerationStatus | DocumentGenerationStatus[]
): Promise<IDocumentGeneration[]> {
  return this.find({
    status: Array.isArray(status) ? { $in: status } : status
  }).sort({ createdAt: -1 });
};

/**
 * Find pending documents
 */
documentGenerationSchema.statics.findPending = async function(): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.PENDING
  }).sort({ createdAt: 1 });
};

/**
 * Find processing documents
 */
documentGenerationSchema.statics.findProcessing = async function(): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.PROCESSING,
    processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // Processing for more than 5 minutes
  }).sort({ processingStartedAt: 1 });
};

/**
 * Find failed documents
 */
documentGenerationSchema.statics.findFailed = async function(
  maxRetries: number = 3
): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.FAILED,
    retryCount: { $lt: maxRetries }
  }).sort({ processingCompletedAt: 1 });
};

/**
 * Find expired documents
 */
documentGenerationSchema.statics.findExpired = async function(): Promise<IDocumentGeneration[]> {
  return this.find({
    status: { $ne: DocumentGenerationStatus.DELETED },
    expiresAt: { $lt: new Date() }
  }).sort({ expiresAt: 1 });
};

/**
 * Find documents by access code
 */
documentGenerationSchema.statics.findByAccessCode = async function(
  accessCode: string
): Promise<IDocumentGeneration | null> {
  return this.findOne({
    accessCode,
    status: DocumentGenerationStatus.COMPLETED,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Find documents accessible by user
 */
documentGenerationSchema.statics.findAccessibleByUser = async function(
  userId: Types.ObjectId | string,
  userRoles: string[] = []
): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.COMPLETED,
    expiresAt: { $gt: new Date() },
    $or: [
      { userId },
      { accessUsers: userId },
      { accessLevel: DocumentAccessLevel.PUBLIC },
      { accessRoles: { $in: userRoles } }
    ]
  }).sort({ createdAt: -1 });
};

/**
 * Find most viewed documents
 */
documentGenerationSchema.statics.findMostViewed = async function(
  limit: number = 10
): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.COMPLETED,
    expiresAt: { $gt: new Date() }
  })
    .sort({ viewCount: -1 })
    .limit(limit);
};

/**
 * Find most downloaded documents
 */
documentGenerationSchema.statics.findMostDownloaded = async function(
  limit: number = 10
): Promise<IDocumentGeneration[]> {
  return this.find({
    status: DocumentGenerationStatus.COMPLETED,
    expiresAt: { $gt: new Date() }
  })
    .sort({ downloadCount: -1 })
    .limit(limit);
};

/**
 * Mark expired documents
 */
documentGenerationSchema.statics.markExpired = async function(): Promise<number> {
  const result = await this.updateMany(
    {
      status: { $nin: [DocumentGenerationStatus.EXPIRED, DocumentGenerationStatus.DELETED] },
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: DocumentGenerationStatus.EXPIRED }
    }
  );
  
  return result.modifiedCount;
};

// Export the model
export const DocumentGeneration = model<IDocumentGeneration>('DocumentGeneration', documentGenerationSchema); 