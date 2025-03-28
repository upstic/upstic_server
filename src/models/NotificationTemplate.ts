import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for notification template type
 */
export enum NotificationTemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK'
}

/**
 * Enum for notification template category
 */
export enum NotificationTemplateCategory {
  ACCOUNT = 'ACCOUNT',
  AUTHENTICATION = 'AUTHENTICATION',
  JOB = 'JOB',
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  RATING = 'RATING',
  DOCUMENT = 'DOCUMENT',
  COMPLIANCE = 'COMPLIANCE',
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
  OTHER = 'OTHER'
}

/**
 * Enum for notification template status
 */
export enum NotificationTemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Interface for notification template variable
 */
export interface INotificationTemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Interface for notification template content
 */
export interface INotificationTemplateContent {
  locale: string;
  subject?: string;
  body: string;
  plainText?: string;
  preheader?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string;
    contentType?: string;
  }>;
}

/**
 * Interface for notification template
 */
export interface INotificationTemplate extends Document {
  // Core data
  name: string;
  code: string;
  description?: string;
  type: NotificationTemplateType;
  category: NotificationTemplateCategory;
  
  // Content
  contents: INotificationTemplateContent[];
  defaultLocale: string;
  
  // Variables
  variables: INotificationTemplateVariable[];
  
  // Configuration
  config?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    priority?: 'high' | 'normal' | 'low';
    deliveryTime?: {
      timeOfDay?: string;
      daysOfWeek?: string[];
      timezone?: string;
    };
    throttling?: {
      maxPerHour?: number;
      maxPerDay?: number;
      minInterval?: number;
    };
  };
  
  // Metadata
  status: NotificationTemplateStatus;
  version: number;
  tags?: string[];
  
  // Tracking
  lastSent?: Date;
  sendCount?: number;
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getContent(locale?: string): INotificationTemplateContent;
  incrementSendCount(): Promise<INotificationTemplate>;
  updateMetrics(metrics: { opens?: number; clicks?: number; bounces?: number }): Promise<INotificationTemplate>;
  duplicate(): Promise<INotificationTemplate>;
  activate(): Promise<INotificationTemplate>;
  deactivate(): Promise<INotificationTemplate>;
  archive(): Promise<INotificationTemplate>;
}

/**
 * Schema for notification template
 */
const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    // Core data
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Template code is required'],
      trim: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(NotificationTemplateType),
      required: [true, 'Template type is required'],
      index: true
    },
    category: {
      type: String,
      enum: Object.values(NotificationTemplateCategory),
      required: [true, 'Template category is required'],
      index: true
    },
    
    // Content
    contents: [{
      locale: {
        type: String,
        required: [true, 'Locale is required'],
        default: 'en'
      },
      subject: {
        type: String
      },
      body: {
        type: String,
        required: [true, 'Body is required']
      },
      plainText: {
        type: String
      },
      preheader: {
        type: String
      },
      attachments: [{
        filename: {
          type: String,
          required: true
        },
        path: {
          type: String
        },
        content: {
          type: String
        },
        contentType: {
          type: String
        }
      }]
    }],
    defaultLocale: {
      type: String,
      required: [true, 'Default locale is required'],
      default: 'en'
    },
    
    // Variables
    variables: [{
      name: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      defaultValue: {
        type: String
      },
      required: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'date', 'object', 'array'],
        default: 'string'
      },
      validation: {
        pattern: {
          type: String
        },
        minLength: {
          type: Number
        },
        maxLength: {
          type: Number
        },
        min: {
          type: Number
        },
        max: {
          type: Number
        }
      }
    }],
    
    // Configuration
    config: {
      from: {
        type: String
      },
      replyTo: {
        type: String
      },
      cc: [{
        type: String
      }],
      bcc: [{
        type: String
      }],
      priority: {
        type: String,
        enum: ['high', 'normal', 'low'],
        default: 'normal'
      },
      deliveryTime: {
        timeOfDay: {
          type: String
        },
        daysOfWeek: [{
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        timezone: {
          type: String
        }
      },
      throttling: {
        maxPerHour: {
          type: Number
        },
        maxPerDay: {
          type: Number
        },
        minInterval: {
          type: Number
        }
      }
    },
    
    // Metadata
    status: {
      type: String,
      enum: Object.values(NotificationTemplateStatus),
      default: NotificationTemplateStatus.DRAFT,
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    tags: [{
      type: String,
      index: true
    }],
    
    // Tracking
    lastSent: {
      type: Date
    },
    sendCount: {
      type: Number,
      default: 0
    },
    openRate: {
      type: Number,
      min: 0,
      max: 100
    },
    clickRate: {
      type: Number,
      min: 0,
      max: 100
    },
    bounceRate: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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
notificationTemplateSchema.index({ type: 1, category: 1, status: 1 });
notificationTemplateSchema.index({ code: 1, version: 1 });
notificationTemplateSchema.index({ tags: 1, status: 1 });

// Validate at least one content entry
notificationTemplateSchema.pre('validate', function(next) {
  if (!this.contents || this.contents.length === 0) {
    const error = new Error('At least one content entry is required');
    return next(error);
  }
  
  // Ensure default locale exists in contents
  const hasDefaultLocale = this.contents.some(content => content.locale === this.defaultLocale);
  if (!hasDefaultLocale) {
    const error = new Error(`Content for default locale "${this.defaultLocale}" is required`);
    return next(error);
  }
  
  next();
});

// Increment version on update if content or variables change
notificationTemplateSchema.pre('save', function(next) {
  if (!this.isNew && (this.isModified('contents') || this.isModified('variables'))) {
    this.version += 1;
  }
  next();
});

/**
 * Get content for a specific locale, falling back to default locale
 */
notificationTemplateSchema.methods.getContent = function(
  locale?: string
): INotificationTemplateContent {
  const targetLocale = locale || this.defaultLocale;
  
  // Try to find content for the requested locale
  const content = this.contents.find(c => c.locale === targetLocale);
  
  // Fall back to default locale if not found
  if (!content) {
    const defaultContent = this.contents.find(c => c.locale === this.defaultLocale);
    if (!defaultContent) {
      throw new Error(`No content found for default locale "${this.defaultLocale}"`);
    }
    return defaultContent;
  }
  
  return content;
};

/**
 * Increment send count and update last sent date
 */
notificationTemplateSchema.methods.incrementSendCount = async function(): Promise<INotificationTemplate> {
  this.sendCount = (this.sendCount || 0) + 1;
  this.lastSent = new Date();
  return this.save();
};

/**
 * Update metrics (open rate, click rate, bounce rate)
 */
notificationTemplateSchema.methods.updateMetrics = async function(
  metrics: { opens?: number; clicks?: number; bounces?: number }
): Promise<INotificationTemplate> {
  if (metrics.opens !== undefined && this.sendCount) {
    this.openRate = (metrics.opens / this.sendCount) * 100;
  }
  
  if (metrics.clicks !== undefined && this.sendCount) {
    this.clickRate = (metrics.clicks / this.sendCount) * 100;
  }
  
  if (metrics.bounces !== undefined && this.sendCount) {
    this.bounceRate = (metrics.bounces / this.sendCount) * 100;
  }
  
  return this.save();
};

/**
 * Duplicate template
 */
notificationTemplateSchema.methods.duplicate = async function(): Promise<INotificationTemplate> {
  const NotificationTemplateModel = this.constructor as typeof NotificationTemplate;
  
  // Create a new template based on this one
  const duplicateData = this.toObject();
  
  // Remove fields that should be unique or reset
  delete duplicateData._id;
  delete duplicateData.id;
  duplicateData.name = `${duplicateData.name} (Copy)`;
  duplicateData.code = `${duplicateData.code}_COPY_${Date.now()}`;
  duplicateData.status = NotificationTemplateStatus.DRAFT;
  duplicateData.version = 1;
  duplicateData.sendCount = 0;
  duplicateData.lastSent = undefined;
  duplicateData.openRate = undefined;
  duplicateData.clickRate = undefined;
  duplicateData.bounceRate = undefined;
  
  // Create and return the new template
  return NotificationTemplateModel.create(duplicateData);
};

/**
 * Activate template
 */
notificationTemplateSchema.methods.activate = async function(): Promise<INotificationTemplate> {
  this.status = NotificationTemplateStatus.ACTIVE;
  return this.save();
};

/**
 * Deactivate template
 */
notificationTemplateSchema.methods.deactivate = async function(): Promise<INotificationTemplate> {
  this.status = NotificationTemplateStatus.INACTIVE;
  return this.save();
};

/**
 * Archive template
 */
notificationTemplateSchema.methods.archive = async function(): Promise<INotificationTemplate> {
  this.status = NotificationTemplateStatus.ARCHIVED;
  return this.save();
};

/**
 * Find templates by type
 */
notificationTemplateSchema.statics.findByType = async function(
  type: NotificationTemplateType,
  activeOnly: boolean = true
): Promise<INotificationTemplate[]> {
  const query: any = { type };
  
  if (activeOnly) {
    query.status = NotificationTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find templates by category
 */
notificationTemplateSchema.statics.findByCategory = async function(
  category: NotificationTemplateCategory,
  activeOnly: boolean = true
): Promise<INotificationTemplate[]> {
  const query: any = { category };
  
  if (activeOnly) {
    query.status = NotificationTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find template by code
 */
notificationTemplateSchema.statics.findByCode = async function(
  code: string,
  version?: number
): Promise<INotificationTemplate | null> {
  const query: any = { code };
  
  if (version) {
    query.version = version;
  }
  
  return this.findOne(query);
};

/**
 * Find templates by tags
 */
notificationTemplateSchema.statics.findByTags = async function(
  tags: string[],
  activeOnly: boolean = true
): Promise<INotificationTemplate[]> {
  const query: any = { tags: { $in: tags } };
  
  if (activeOnly) {
    query.status = NotificationTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find templates with high bounce rates
 */
notificationTemplateSchema.statics.findHighBounceRates = async function(
  threshold: number = 5
): Promise<INotificationTemplate[]> {
  return this.find({
    bounceRate: { $gt: threshold },
    sendCount: { $gt: 10 } // Only consider templates with significant send volume
  }).sort({ bounceRate: -1 });
};

// Export the model
export const NotificationTemplate = model<INotificationTemplate>('NotificationTemplate', notificationTemplateSchema); 