import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for notification type
 */
export enum NotificationType {
  // System notifications
  SYSTEM = 'SYSTEM',
  MAINTENANCE = 'MAINTENANCE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  
  // User account notifications
  ACCOUNT = 'ACCOUNT',
  SECURITY = 'SECURITY',
  VERIFICATION = 'VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Job-related notifications
  JOB_POSTED = 'JOB_POSTED',
  JOB_UPDATED = 'JOB_UPDATED',
  JOB_CANCELLED = 'JOB_CANCELLED',
  JOB_APPLICATION = 'JOB_APPLICATION',
  JOB_APPLICATION_STATUS = 'JOB_APPLICATION_STATUS',
  JOB_OFFER = 'JOB_OFFER',
  JOB_REMINDER = 'JOB_REMINDER',
  
  // Timesheet notifications
  TIMESHEET_SUBMITTED = 'TIMESHEET_SUBMITTED',
  TIMESHEET_APPROVED = 'TIMESHEET_APPROVED',
  TIMESHEET_REJECTED = 'TIMESHEET_REJECTED',
  
  // Payment notifications
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_DUE = 'INVOICE_DUE',
  
  // Document notifications
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  
  // Message notifications
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  
  // Calendar notifications
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  
  // Feedback notifications
  FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED',
  FEEDBACK_RESPONSE = 'FEEDBACK_RESPONSE',
  
  // Compliance notifications
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  COMPLIANCE_DEADLINE = 'COMPLIANCE_DEADLINE',
  
  // Other notifications
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for notification priority
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Enum for notification status
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Enum for notification channel
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK'
}

/**
 * Interface for notification delivery
 */
export interface INotificationDelivery {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  externalId?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for notification action
 */
export interface INotificationAction {
  label: string;
  url?: string;
  action?: string;
  data?: Record<string, any>;
  primary: boolean;
}

/**
 * Interface for notification
 */
export interface INotification extends Document {
  // Core data
  type: NotificationType;
  title: string;
  body: string;
  
  // Recipients
  recipientId: Types.ObjectId | string;
  recipientType: 'USER' | 'GROUP' | 'ROLE';
  recipientEmail?: string;
  recipientPhone?: string;
  
  // Sender
  senderId?: Types.ObjectId | string;
  senderName?: string;
  
  // Related entities
  entityType?: string;
  entityId?: Types.ObjectId | string;
  
  // Content and formatting
  templateId?: Types.ObjectId | string;
  templateData?: Record<string, any>;
  imageUrl?: string;
  iconUrl?: string;
  
  // Delivery
  channels: NotificationChannel[];
  deliveries: INotificationDelivery[];
  
  // Status and scheduling
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // Actions
  actions?: INotificationAction[];
  
  // Grouping and batching
  groupId?: string;
  batchId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsRead(): Promise<INotification>;
  markAsSent(channel: NotificationChannel, externalId?: string): Promise<INotification>;
  markAsDelivered(channel: NotificationChannel): Promise<INotification>;
  markAsFailed(channel: NotificationChannel, reason: string): Promise<INotification>;
  addDelivery(channel: NotificationChannel): Promise<INotification>;
  cancel(): Promise<INotification>;
  isExpired(): boolean;
}

/**
 * Schema for notification
 */
const notificationSchema = new Schema<INotification>(
  {
    // Core data
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true
    },
    
    // Recipients
    recipientId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Recipient ID is required'],
      index: true
    },
    recipientType: {
      type: String,
      enum: ['USER', 'GROUP', 'ROLE'],
      default: 'USER',
      index: true
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    recipientPhone: {
      type: String,
      trim: true
    },
    
    // Sender
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    senderName: {
      type: String,
      trim: true
    },
    
    // Related entities
    entityType: {
      type: String,
      trim: true,
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    
    // Content and formatting
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate'
    },
    templateData: {
      type: Schema.Types.Mixed
    },
    imageUrl: {
      type: String,
      trim: true
    },
    iconUrl: {
      type: String,
      trim: true
    },
    
    // Delivery
    channels: [{
      type: String,
      enum: Object.values(NotificationChannel),
      required: true
    }],
    deliveries: [{
      channel: {
        type: String,
        enum: Object.values(NotificationChannel),
        required: true
      },
      status: {
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.PENDING
      },
      sentAt: {
        type: Date
      },
      deliveredAt: {
        type: Date
      },
      readAt: {
        type: Date
      },
      failedAt: {
        type: Date
      },
      failureReason: {
        type: String
      },
      retryCount: {
        type: Number,
        default: 0,
        min: 0
      },
      externalId: {
        type: String
      },
      metadata: {
        type: Schema.Types.Mixed
      }
    }],
    
    // Status and scheduling
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
      index: true
    },
    scheduledFor: {
      type: Date,
      index: true
    },
    expiresAt: {
      type: Date,
      index: true
    },
    
    // Actions
    actions: [{
      label: {
        type: String,
        required: true
      },
      url: {
        type: String
      },
      action: {
        type: String
      },
      data: {
        type: Schema.Types.Mixed
      },
      primary: {
        type: Boolean,
        default: false
      }
    }],
    
    // Grouping and batching
    groupId: {
      type: String,
      index: true
    },
    batchId: {
      type: String,
      index: true
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
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ 'deliveries.status': 1, 'deliveries.channel': 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ expiresAt: 1, status: 1 });

// Initialize deliveries based on channels
notificationSchema.pre('save', function(next) {
  if (this.isNew && this.channels && this.channels.length > 0) {
    if (!this.deliveries) {
      this.deliveries = [];
    }
    
    // Add delivery entries for each channel if not already present
    for (const channel of this.channels) {
      if (!this.deliveries.some(d => d.channel === channel)) {
        this.deliveries.push({
          channel,
          status: NotificationStatus.PENDING,
          retryCount: 0
        });
      }
    }
  }
  
  next();
});

// Set default expiration if not provided
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Default expiration: 30 days from creation or scheduled date
    const baseDate = this.scheduledFor || new Date();
    this.expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Update overall status based on deliveries
notificationSchema.pre('save', function(next) {
  if (this.deliveries && this.deliveries.length > 0) {
    // If any delivery is READ, mark as READ
    if (this.deliveries.some(d => d.status === NotificationStatus.READ)) {
      this.status = NotificationStatus.READ;
    }
    // If all deliveries are DELIVERED, mark as DELIVERED
    else if (this.deliveries.every(d => d.status === NotificationStatus.DELIVERED)) {
      this.status = NotificationStatus.DELIVERED;
    }
    // If any delivery is SENT and none are READ, mark as SENT
    else if (this.deliveries.some(d => d.status === NotificationStatus.SENT)) {
      this.status = NotificationStatus.SENT;
    }
    // If all deliveries are FAILED, mark as FAILED
    else if (this.deliveries.every(d => d.status === NotificationStatus.FAILED)) {
      this.status = NotificationStatus.FAILED;
    }
  }
  
  next();
});

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function(): Promise<INotification> {
  this.status = NotificationStatus.READ;
  
  // Update in-app delivery status if it exists
  const inAppDelivery = this.deliveries.find(d => d.channel === NotificationChannel.IN_APP);
  if (inAppDelivery) {
    inAppDelivery.status = NotificationStatus.READ;
    inAppDelivery.readAt = new Date();
  }
  
  return this.save();
};

/**
 * Mark notification as sent for a specific channel
 */
notificationSchema.methods.markAsSent = async function(
  channel: NotificationChannel,
  externalId?: string
): Promise<INotification> {
  const delivery = this.deliveries.find(d => d.channel === channel);
  
  if (delivery) {
    delivery.status = NotificationStatus.SENT;
    delivery.sentAt = new Date();
    
    if (externalId) {
      delivery.externalId = externalId;
    }
  } else {
    this.deliveries.push({
      channel,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      externalId,
      retryCount: 0
    });
  }
  
  // Update overall status if not already READ or DELIVERED
  if (this.status !== NotificationStatus.READ && this.status !== NotificationStatus.DELIVERED) {
    this.status = NotificationStatus.SENT;
  }
  
  return this.save();
};

/**
 * Mark notification as delivered for a specific channel
 */
notificationSchema.methods.markAsDelivered = async function(
  channel: NotificationChannel
): Promise<INotification> {
  const delivery = this.deliveries.find(d => d.channel === channel);
  
  if (delivery) {
    delivery.status = NotificationStatus.DELIVERED;
    delivery.deliveredAt = new Date();
  } else {
    this.deliveries.push({
      channel,
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
      retryCount: 0
    });
  }
  
  // Update overall status if not already READ
  if (this.status !== NotificationStatus.READ) {
    this.status = NotificationStatus.DELIVERED;
  }
  
  return this.save();
};

/**
 * Mark notification as failed for a specific channel
 */
notificationSchema.methods.markAsFailed = async function(
  channel: NotificationChannel,
  reason: string
): Promise<INotification> {
  const delivery = this.deliveries.find(d => d.channel === channel);
  
  if (delivery) {
    delivery.status = NotificationStatus.FAILED;
    delivery.failedAt = new Date();
    delivery.failureReason = reason;
    delivery.retryCount += 1;
  } else {
    this.deliveries.push({
      channel,
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      retryCount: 1
    });
  }
  
  // Update overall status only if all deliveries have failed
  if (this.deliveries.every(d => d.status === NotificationStatus.FAILED)) {
    this.status = NotificationStatus.FAILED;
  }
  
  return this.save();
};

/**
 * Add a new delivery channel
 */
notificationSchema.methods.addDelivery = async function(
  channel: NotificationChannel
): Promise<INotification> {
  if (!this.channels.includes(channel)) {
    this.channels.push(channel);
  }
  
  if (!this.deliveries.some(d => d.channel === channel)) {
    this.deliveries.push({
      channel,
      status: NotificationStatus.PENDING,
      retryCount: 0
    });
  }
  
  return this.save();
};

/**
 * Cancel notification
 */
notificationSchema.methods.cancel = async function(): Promise<INotification> {
  this.status = NotificationStatus.CANCELLED;
  
  // Update all pending deliveries to cancelled
  for (const delivery of this.deliveries) {
    if (delivery.status === NotificationStatus.PENDING) {
      delivery.status = NotificationStatus.CANCELLED;
    }
  }
  
  return this.save();
};

/**
 * Check if notification is expired
 */
notificationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt && this.expiresAt < new Date();
};

/**
 * Find notifications by recipient
 */
notificationSchema.statics.findByRecipient = async function(
  recipientId: Types.ObjectId | string,
  options: {
    status?: NotificationStatus | NotificationStatus[];
    type?: NotificationType | NotificationType[];
    limit?: number;
    skip?: number;
    includeExpired?: boolean;
  } = {}
): Promise<INotification[]> {
  const query: any = { recipientId };
  
  if (options.status) {
    query.status = Array.isArray(options.status) ? { $in: options.status } : options.status;
  }
  
  if (options.type) {
    query.type = Array.isArray(options.type) ? { $in: options.type } : options.type;
  }
  
  if (!options.includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];
  }
  
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Find unread notifications by recipient
 */
notificationSchema.statics.findUnreadByRecipient = async function(
  recipientId: Types.ObjectId | string,
  limit: number = 50
): Promise<INotification[]> {
  return this.find({
    recipientId,
    status: { $nin: [NotificationStatus.READ, NotificationStatus.CANCELLED] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

/**
 * Find notifications by entity
 */
notificationSchema.statics.findByEntity = async function(
  entityType: string,
  entityId: Types.ObjectId | string
): Promise<INotification[]> {
  return this.find({
    entityType,
    entityId
  }).sort({ createdAt: -1 });
};

/**
 * Find scheduled notifications
 */
notificationSchema.statics.findScheduled = async function(): Promise<INotification[]> {
  return this.find({
    status: NotificationStatus.PENDING,
    scheduledFor: { $lte: new Date() }
  }).sort({ priority: -1, scheduledFor: 1 });
};

/**
 * Find notifications with failed deliveries
 */
notificationSchema.statics.findWithFailedDeliveries = async function(
  maxRetries: number = 3
): Promise<INotification[]> {
  return this.find({
    'deliveries.status': NotificationStatus.FAILED,
    'deliveries.retryCount': { $lt: maxRetries }
  }).sort({ priority: -1, createdAt: 1 });
};

/**
 * Mark expired notifications
 */
notificationSchema.statics.markExpired = async function(): Promise<number> {
  const result = await this.updateMany(
    {
      status: { $nin: [NotificationStatus.READ, NotificationStatus.CANCELLED] },
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: NotificationStatus.CANCELLED }
    }
  );
  
  return result.modifiedCount;
};

/**
 * Count unread notifications by recipient
 */
notificationSchema.statics.countUnreadByRecipient = async function(
  recipientId: Types.ObjectId | string
): Promise<number> {
  return this.countDocuments({
    recipientId,
    status: { $nin: [NotificationStatus.READ, NotificationStatus.CANCELLED] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

/**
 * Mark all notifications as read for a recipient
 */
notificationSchema.statics.markAllAsRead = async function(
  recipientId: Types.ObjectId | string
): Promise<number> {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      recipientId,
      status: { $nin: [NotificationStatus.READ, NotificationStatus.CANCELLED] }
    },
    {
      $set: {
        status: NotificationStatus.READ,
        'deliveries.$[elem].status': NotificationStatus.READ,
        'deliveries.$[elem].readAt': now
      }
    },
    {
      arrayFilters: [{ 'elem.channel': NotificationChannel.IN_APP }]
    }
  );
  
  return result.modifiedCount;
};

// Export the model
export const Notification = model<INotification>('Notification', notificationSchema);