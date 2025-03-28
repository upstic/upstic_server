import { Schema, model, Document, Types } from 'mongoose';
import { ContactFormStatus } from './ContactUs';

/**
 * Enum for reply type
 */
export enum ReplyType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  AUTOMATED = 'AUTOMATED',
  TEMPLATE = 'TEMPLATE'
}

/**
 * Enum for reply delivery status
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ'
}

/**
 * Interface for contact form reply
 */
export interface IContactUsReply extends Document {
  // Relationships
  contactUsId: Types.ObjectId | string;
  
  // Core data
  subject: string;
  message: string;
  replyType: ReplyType;
  
  // Sender information
  sentBy: Types.ObjectId | string;
  sentByName: string;
  sentByEmail: string;
  
  // Recipient information
  recipientEmail: string;
  recipientName: string;
  cc?: string[];
  bcc?: string[];
  
  // Delivery information
  deliveryStatus: DeliveryStatus;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  deliveryErrorMessage?: string;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Template information
  templateId?: Types.ObjectId | string;
  templateName?: string;
  templateVariables?: Record<string, any>;
  
  // Attachments
  attachments?: {
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: Date;
  }[];
  
  // Metadata
  isInternal: boolean;
  statusBeforeReply?: ContactFormStatus;
  statusAfterReply?: ContactFormStatus;
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for contact form reply
 */
const contactUsReplySchema = new Schema<IContactUsReply>(
  {
    // Relationships
    contactUsId: {
      type: Schema.Types.ObjectId,
      ref: 'ContactUs',
      required: [true, 'Contact form ID is required'],
      index: true
    },
    
    // Core data
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
    replyType: {
      type: String,
      enum: Object.values(ReplyType),
      default: ReplyType.EXTERNAL,
      index: true
    },
    
    // Sender information
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
    },
    sentByName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true
    },
    sentByEmail: {
      type: String,
      required: [true, 'Sender email is required'],
      trim: true,
      lowercase: true
    },
    
    // Recipient information
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      trim: true,
      lowercase: true
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true
    },
    cc: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    bcc: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    
    // Delivery information
    deliveryStatus: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
      index: true
    },
    deliveryAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastDeliveryAttempt: {
      type: Date
    },
    deliveryErrorMessage: {
      type: String
    },
    deliveredAt: {
      type: Date
    },
    readAt: {
      type: Date
    },
    
    // Template information
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageTemplate'
    },
    templateName: {
      type: String
    },
    templateVariables: {
      type: Schema.Types.Mixed
    },
    
    // Attachments
    attachments: [{
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
    }],
    
    // Metadata
    isInternal: {
      type: Boolean,
      default: false,
      index: true
    },
    statusBeforeReply: {
      type: String,
      enum: Object.values(ContactFormStatus)
    },
    statusAfterReply: {
      type: String,
      enum: Object.values(ContactFormStatus),
      default: ContactFormStatus.REPLIED
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
contactUsReplySchema.index({ contactUsId: 1, createdAt: -1 });
contactUsReplySchema.index({ sentBy: 1, createdAt: -1 });
contactUsReplySchema.index({ deliveryStatus: 1, createdAt: -1 });
contactUsReplySchema.index({ replyType: 1, createdAt: -1 });

// Compound indexes for optimized queries
contactUsReplySchema.index({ contactUsId: 1, isInternal: 1, createdAt: -1 });
contactUsReplySchema.index({ deliveryStatus: 1, deliveryAttempts: 1 });

// Virtual for contact form
contactUsReplySchema.virtual('contactUs', {
  ref: 'ContactUs',
  localField: 'contactUsId',
  foreignField: '_id',
  justOne: true
});

/**
 * Find replies for a specific contact form submission
 */
contactUsReplySchema.statics.findByContactUs = async function(
  contactUsId: Types.ObjectId | string,
  includeInternal = false
): Promise<IContactUsReply[]> {
  const query: any = { contactUsId };
  
  if (!includeInternal) {
    query.isInternal = false;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find replies by sender
 */
contactUsReplySchema.statics.findBySender = async function(
  userId: Types.ObjectId | string
): Promise<IContactUsReply[]> {
  return this.find({ sentBy: userId }).sort({ createdAt: -1 });
};

/**
 * Find replies by delivery status
 */
contactUsReplySchema.statics.findByDeliveryStatus = async function(
  status: DeliveryStatus | DeliveryStatus[]
): Promise<IContactUsReply[]> {
  return this.find({
    deliveryStatus: Array.isArray(status) ? { $in: status } : status
  }).sort({ createdAt: -1 });
};

/**
 * Find failed deliveries
 */
contactUsReplySchema.statics.findFailedDeliveries = async function(
  maxAttempts = 3
): Promise<IContactUsReply[]> {
  return this.find({
    deliveryStatus: DeliveryStatus.FAILED,
    deliveryAttempts: { $lt: maxAttempts }
  }).sort({ lastDeliveryAttempt: 1 });
};

/**
 * Update delivery status
 */
contactUsReplySchema.statics.updateDeliveryStatus = async function(
  replyId: Types.ObjectId | string,
  status: DeliveryStatus,
  errorMessage?: string
): Promise<IContactUsReply | null> {
  const updateData: any = {
    deliveryStatus: status,
    $inc: { deliveryAttempts: 1 },
    lastDeliveryAttempt: new Date()
  };
  
  if (status === DeliveryStatus.DELIVERED) {
    updateData.deliveredAt = new Date();
  }
  
  if (status === DeliveryStatus.READ) {
    updateData.readAt = new Date();
  }
  
  if (errorMessage) {
    updateData.deliveryErrorMessage = errorMessage;
  }
  
  return this.findByIdAndUpdate(
    replyId,
    updateData,
    { new: true }
  );
};

/**
 * Mark reply as read
 */
contactUsReplySchema.statics.markAsRead = async function(
  replyId: Types.ObjectId | string
): Promise<IContactUsReply | null> {
  return this.findByIdAndUpdate(
    replyId,
    {
      deliveryStatus: DeliveryStatus.READ,
      readAt: new Date()
    },
    { new: true }
  );
};

/**
 * Get reply statistics
 */
contactUsReplySchema.statics.getStatistics = async function(): Promise<any> {
  const totalCount = await this.countDocuments();
  
  const replyTypeStats = await this.aggregate([
    {
      $group: {
        _id: '$replyType',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const deliveryStatusStats = await this.aggregate([
    {
      $group: {
        _id: '$deliveryStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const averageResponseTime = await this.aggregate([
    {
      $lookup: {
        from: 'contactus',
        localField: 'contactUsId',
        foreignField: '_id',
        as: 'contactUs'
      }
    },
    {
      $unwind: '$contactUs'
    },
    {
      $match: {
        isInternal: false,
        replyType: { $ne: ReplyType.AUTOMATED }
      }
    },
    {
      $project: {
        responseTime: { $subtract: ['$createdAt', '$contactUs.createdAt'] }
      }
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: '$responseTime' }
      }
    }
  ]);
  
  return {
    totalCount,
    replyTypeStats: replyTypeStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    deliveryStatusStats: deliveryStatusStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    averageResponseTime: averageResponseTime.length > 0 ? 
      Math.round(averageResponseTime[0].averageTime / (1000 * 60)) : // Convert to minutes
      null
  };
};

// Export the model
export const ContactUsReply = model<IContactUsReply>('ContactUsReply', contactUsReplySchema); 