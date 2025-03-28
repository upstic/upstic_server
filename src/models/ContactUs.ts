import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for contact form submission status
 */
export enum ContactFormStatus {
  NEW = 'NEW',
  VIEWED = 'VIEWED',
  IN_PROGRESS = 'IN_PROGRESS',
  REPLIED = 'REPLIED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  SPAM = 'SPAM',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Enum for contact form submission priority
 */
export enum ContactFormPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Enum for contact form submission category
 */
export enum ContactFormCategory {
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  BILLING_INQUIRY = 'BILLING_INQUIRY',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  BUG_REPORT = 'BUG_REPORT',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  FEEDBACK = 'FEEDBACK',
  PARTNERSHIP = 'PARTNERSHIP',
  PRESS = 'PRESS',
  CAREERS = 'CAREERS',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER'
}

/**
 * Enum for contact form submission source
 */
export enum ContactFormSource {
  WEBSITE = 'WEBSITE',
  MOBILE_APP = 'MOBILE_APP',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  CHAT = 'CHAT',
  IN_PERSON = 'IN_PERSON',
  API = 'API',
  OTHER = 'OTHER'
}

/**
 * Interface for contact form submission
 */
export interface IContactUs extends Document {
  // Core data
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  
  // Categorization
  category: ContactFormCategory;
  priority: ContactFormPriority;
  status: ContactFormStatus;
  source: ContactFormSource;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  
  // User information
  userId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  
  // Processing information
  assignedTo?: Types.ObjectId | string;
  viewedAt?: Date;
  viewedBy?: Types.ObjectId | string;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId | string;
  closedAt?: Date;
  closedBy?: Types.ObjectId | string;
  
  // Tags and notes
  tags?: string[];
  internalNotes?: {
    note: string;
    createdBy: Types.ObjectId | string;
    createdAt: Date;
  }[];
  
  // Attachments
  attachments?: {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: Date;
  }[];
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for contact form submission
 */
const contactUsSchema = new Schema<IContactUs>(
  {
    // Core data
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    
    // Categorization
    category: {
      type: String,
      enum: Object.values(ContactFormCategory),
      default: ContactFormCategory.GENERAL_INQUIRY
    },
    priority: {
      type: String,
      enum: Object.values(ContactFormPriority),
      default: ContactFormPriority.MEDIUM
    },
    status: {
      type: String,
      enum: Object.values(ContactFormStatus),
      default: ContactFormStatus.NEW
    },
    source: {
      type: String,
      enum: Object.values(ContactFormSource),
      default: ContactFormSource.WEBSITE
    },
    
    // Metadata
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    referrer: {
      type: String
    },
    pageUrl: {
      type: String
    },
    
    // User information
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company'
    },
    
    // Processing information
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date
    },
    viewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    firstResponseAt: {
      type: Date
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    closedAt: {
      type: Date
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Tags and notes
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    internalNotes: [
      {
        note: {
          type: String,
          required: true
        },
        createdBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Attachments
    attachments: [
      {
        name: {
          type: String,
          required: true
        },
        url: {
          type: String,
          required: true
        },
        size: {
          type: Number,
          required: true
        },
        type: {
          type: String,
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
contactUsSchema.index({ status: 1, createdAt: -1 });
contactUsSchema.index({ category: 1, status: 1 });
contactUsSchema.index({ priority: 1, status: 1 });
contactUsSchema.index({ email: 1 });
contactUsSchema.index({ userId: 1 });
contactUsSchema.index({ companyId: 1 });
contactUsSchema.index({ assignedTo: 1, status: 1 });
contactUsSchema.index({ tags: 1 });

// Compound indexes for optimized queries
contactUsSchema.index({ status: 1, priority: 1, createdAt: -1 });
contactUsSchema.index({ category: 1, priority: 1, status: 1 });
contactUsSchema.index({ assignedTo: 1, status: 1, priority: 1 });

// Virtual for replies
contactUsSchema.virtual('replies', {
  ref: 'ContactUsReply',
  localField: '_id',
  foreignField: 'contactUsId'
});

/**
 * Mark contact form submission as viewed
 */
contactUsSchema.methods.markAsViewed = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  if (this.status === ContactFormStatus.NEW) {
    this.status = ContactFormStatus.VIEWED;
  }
  
  this.viewedAt = new Date();
  this.viewedBy = userId;
  
  return this.save();
};

/**
 * Assign contact form submission to a user
 */
contactUsSchema.methods.assignTo = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  this.assignedTo = userId;
  
  if (this.status === ContactFormStatus.NEW || this.status === ContactFormStatus.VIEWED) {
    this.status = ContactFormStatus.IN_PROGRESS;
  }
  
  return this.save();
};

/**
 * Add internal note to contact form submission
 */
contactUsSchema.methods.addInternalNote = async function(
  note: string,
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  this.internalNotes.push({
    note,
    createdBy: userId,
    createdAt: new Date()
  });
  
  return this.save();
};

/**
 * Mark contact form submission as resolved
 */
contactUsSchema.methods.markAsResolved = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  this.status = ContactFormStatus.RESOLVED;
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  
  return this.save();
};

/**
 * Mark contact form submission as closed
 */
contactUsSchema.methods.markAsClosed = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  this.status = ContactFormStatus.CLOSED;
  this.closedAt = new Date();
  this.closedBy = userId;
  
  return this.save();
};

/**
 * Mark contact form submission as spam
 */
contactUsSchema.methods.markAsSpam = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs> {
  this.status = ContactFormStatus.SPAM;
  this.closedAt = new Date();
  this.closedBy = userId;
  
  return this.save();
};

/**
 * Find contact form submissions by status
 */
contactUsSchema.statics.findByStatus = async function(
  status: ContactFormStatus | ContactFormStatus[]
): Promise<IContactUs[]> {
  return this.find({
    status: Array.isArray(status) ? { $in: status } : status
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find contact form submissions by category
 */
contactUsSchema.statics.findByCategory = async function(
  category: ContactFormCategory | ContactFormCategory[]
): Promise<IContactUs[]> {
  return this.find({
    category: Array.isArray(category) ? { $in: category } : category
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find contact form submissions by priority
 */
contactUsSchema.statics.findByPriority = async function(
  priority: ContactFormPriority | ContactFormPriority[]
): Promise<IContactUs[]> {
  return this.find({
    priority: Array.isArray(priority) ? { $in: priority } : priority
  }).sort({ createdAt: -1 });
};

/**
 * Find contact form submissions by assignee
 */
contactUsSchema.statics.findByAssignee = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs[]> {
  return this.find({
    assignedTo: userId
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find unassigned contact form submissions
 */
contactUsSchema.statics.findUnassigned = async function(): Promise<IContactUs[]> {
  return this.find({
    assignedTo: { $exists: false }
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find contact form submissions by user
 */
contactUsSchema.statics.findByUser = async function(
  userId: Types.ObjectId | string
): Promise<IContactUs[]> {
  return this.find({
    userId
  }).sort({ createdAt: -1 });
};

/**
 * Find contact form submissions by company
 */
contactUsSchema.statics.findByCompany = async function(
  companyId: Types.ObjectId | string
): Promise<IContactUs[]> {
  return this.find({
    companyId
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find contact form submissions by tag
 */
contactUsSchema.statics.findByTag = async function(
  tag: string
): Promise<IContactUs[]> {
  return this.find({
    tags: tag
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * Find contact form submissions by email
 */
contactUsSchema.statics.findByEmail = async function(
  email: string
): Promise<IContactUs[]> {
  return this.find({
    email
  }).sort({ createdAt: -1 });
};

/**
 * Get statistics for contact form submissions
 */
contactUsSchema.statics.getStatistics = async function(): Promise<any> {
  const totalCount = await this.countDocuments();
  
  const statusCounts = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const categoryCounts = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const priorityCounts = await this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const sourceCounts = await this.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const averageResponseTime = await this.aggregate([
    {
      $match: {
        firstResponseAt: { $exists: true }
      }
    },
    {
      $project: {
        responseTime: { $subtract: ['$firstResponseAt', '$createdAt'] }
      }
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: '$responseTime' }
      }
    }
  ]);
  
  const averageResolutionTime = await this.aggregate([
    {
      $match: {
        resolvedAt: { $exists: true }
      }
    },
    {
      $project: {
        resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
      }
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: '$resolutionTime' }
      }
    }
  ]);
  
  return {
    totalCount,
    statusCounts: statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    categoryCounts: categoryCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    priorityCounts: priorityCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    sourceCounts: sourceCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    averageResponseTime: averageResponseTime.length > 0 ? 
      Math.round(averageResponseTime[0].averageTime / (1000 * 60)) : // Convert to minutes
      null,
    averageResolutionTime: averageResolutionTime.length > 0 ? 
      Math.round(averageResolutionTime[0].averageTime / (1000 * 60 * 60)) : // Convert to hours
      null
  };
};

// Export the model
export const ContactUs = model<IContactUs>('ContactUs', contactUsSchema); 