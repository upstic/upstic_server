import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for contact type
 */
export enum ContactType {
  PERSONAL = 'PERSONAL',
  WORK = 'WORK',
  HOME = 'HOME',
  EMERGENCY = 'EMERGENCY',
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  OTHER = 'OTHER'
}

/**
 * Enum for contact method
 */
export enum ContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  MOBILE = 'MOBILE',
  FAX = 'FAX',
  ADDRESS = 'ADDRESS',
  SOCIAL = 'SOCIAL',
  WEBSITE = 'WEBSITE',
  OTHER = 'OTHER'
}

/**
 * Enum for contact status
 */
export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
  BOUNCED = 'BOUNCED',
  REJECTED = 'REJECTED',
  DO_NOT_CONTACT = 'DO_NOT_CONTACT'
}

/**
 * Enum for social media platform
 */
export enum SocialMediaPlatform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  YOUTUBE = 'YOUTUBE',
  GITHUB = 'GITHUB',
  STACKOVERFLOW = 'STACKOVERFLOW',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  SKYPE = 'SKYPE',
  OTHER = 'OTHER'
}

/**
 * Interface for contact details
 */
export interface IContactDetails extends Document {
  // Relationships
  entityId: Types.ObjectId | string;
  entityType: string;
  
  // Core data
  contactType: ContactType;
  contactMethod: ContactMethod;
  value: string;
  label?: string;
  
  // Status
  status: ContactStatus;
  isPrimary: boolean;
  isPublic: boolean;
  
  // Verification
  isVerified: boolean;
  verificationDate?: Date;
  verificationMethod?: string;
  verificationCode?: string;
  verificationExpiry?: Date;
  verificationAttempts?: number;
  
  // Communication preferences
  allowCommunication: boolean;
  communicationPreferences?: {
    allowMarketing: boolean;
    allowNotifications: boolean;
    allowReminders: boolean;
    allowSurveys: boolean;
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
    preferredDays?: string[];
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'never';
  };
  
  // Additional data
  metadata?: Record<string, any>;
  
  // For addresses
  address?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // For social media
  socialMedia?: {
    platform: SocialMediaPlatform;
    username: string;
    url: string;
  };
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for contact details
 */
const contactDetailsSchema = new Schema<IContactDetails>(
  {
    // Relationships
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
      index: true
    },
    
    // Core data
    contactType: {
      type: String,
      enum: Object.values(ContactType),
      required: [true, 'Contact type is required'],
      index: true
    },
    contactMethod: {
      type: String,
      enum: Object.values(ContactMethod),
      required: [true, 'Contact method is required'],
      index: true
    },
    value: {
      type: String,
      required: [true, 'Contact value is required'],
      trim: true
    },
    label: {
      type: String,
      trim: true
    },
    
    // Status
    status: {
      type: String,
      enum: Object.values(ContactStatus),
      default: ContactStatus.ACTIVE,
      index: true
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    
    // Verification
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationDate: {
      type: Date
    },
    verificationMethod: {
      type: String
    },
    verificationCode: {
      type: String
    },
    verificationExpiry: {
      type: Date
    },
    verificationAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Communication preferences
    allowCommunication: {
      type: Boolean,
      default: true,
      index: true
    },
    communicationPreferences: {
      allowMarketing: {
        type: Boolean,
        default: false
      },
      allowNotifications: {
        type: Boolean,
        default: true
      },
      allowReminders: {
        type: Boolean,
        default: true
      },
      allowSurveys: {
        type: Boolean,
        default: false
      },
      preferredTimeStart: {
        type: String
      },
      preferredTimeEnd: {
        type: String
      },
      preferredDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'never'],
        default: 'weekly'
      }
    },
    
    // Additional data
    metadata: {
      type: Schema.Types.Mixed
    },
    
    // For addresses
    address: {
      street: {
        type: String
      },
      street2: {
        type: String
      },
      city: {
        type: String
      },
      state: {
        type: String
      },
      postalCode: {
        type: String
      },
      country: {
        type: String
      },
      coordinates: {
        latitude: {
          type: Number
        },
        longitude: {
          type: Number
        }
      }
    },
    
    // For social media
    socialMedia: {
      platform: {
        type: String,
        enum: Object.values(SocialMediaPlatform)
      },
      username: {
        type: String
      },
      url: {
        type: String
      }
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
contactDetailsSchema.index({ entityId: 1, contactType: 1, contactMethod: 1 });
contactDetailsSchema.index({ entityId: 1, isPrimary: 1, contactMethod: 1 });
contactDetailsSchema.index({ value: 1, contactMethod: 1 });
contactDetailsSchema.index({ 'address.city': 1, 'address.country': 1 });

// Compound indexes for optimized queries
contactDetailsSchema.index({ entityId: 1, entityType: 1, status: 1 });
contactDetailsSchema.index({ entityId: 1, contactMethod: 1, isPrimary: 1 });
contactDetailsSchema.index({ entityType: 1, contactMethod: 1, isVerified: 1 });

// Ensure only one primary contact per entity and method
contactDetailsSchema.pre('save', async function(next) {
  if (this.isPrimary) {
    const ContactDetailsModel = this.constructor as typeof ContactDetails;
    const existingPrimary = await ContactDetailsModel.findOne({
      entityId: this.entityId,
      contactMethod: this.contactMethod,
      isPrimary: true,
      _id: { $ne: this._id }
    });
    
    if (existingPrimary) {
      existingPrimary.isPrimary = false;
      await existingPrimary.save();
    }
  }
  
  next();
});

// Validate email format
contactDetailsSchema.pre('validate', function(next) {
  if (this.contactMethod === ContactMethod.EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      const error = new Error('Invalid email format');
      return next(error);
    }
  }
  
  next();
});

/**
 * Find contact details by entity
 */
contactDetailsSchema.statics.findByEntity = async function(
  entityId: Types.ObjectId | string,
  entityType?: string
): Promise<IContactDetails[]> {
  const query: any = { entityId };
  
  if (entityType) {
    query.entityType = entityType;
  }
  
  return this.find(query).sort({ contactType: 1, isPrimary: -1 });
};

/**
 * Find primary contact details by entity and method
 */
contactDetailsSchema.statics.findPrimaryContact = async function(
  entityId: Types.ObjectId | string,
  contactMethod: ContactMethod
): Promise<IContactDetails | null> {
  return this.findOne({
    entityId,
    contactMethod,
    isPrimary: true,
    status: ContactStatus.ACTIVE
  });
};

/**
 * Find contact details by value
 */
contactDetailsSchema.statics.findByValue = async function(
  value: string,
  contactMethod?: ContactMethod
): Promise<IContactDetails[]> {
  const query: any = { value };
  
  if (contactMethod) {
    query.contactMethod = contactMethod;
  }
  
  return this.find(query);
};

/**
 * Find contact details by type
 */
contactDetailsSchema.statics.findByType = async function(
  entityId: Types.ObjectId | string,
  contactType: ContactType
): Promise<IContactDetails[]> {
  return this.find({
    entityId,
    contactType
  });
};

/**
 * Find contact details by method
 */
contactDetailsSchema.statics.findByMethod = async function(
  entityId: Types.ObjectId | string,
  contactMethod: ContactMethod
): Promise<IContactDetails[]> {
  return this.find({
    entityId,
    contactMethod
  });
};

/**
 * Find contact details by status
 */
contactDetailsSchema.statics.findByStatus = async function(
  status: ContactStatus | ContactStatus[]
): Promise<IContactDetails[]> {
  return this.find({
    status: Array.isArray(status) ? { $in: status } : status
  });
};

/**
 * Find unverified contact details
 */
contactDetailsSchema.statics.findUnverified = async function(): Promise<IContactDetails[]> {
  return this.find({
    isVerified: false,
    status: { $ne: ContactStatus.INACTIVE }
  });
};

/**
 * Generate verification code
 */
contactDetailsSchema.methods.generateVerificationCode = async function(): Promise<string> {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.verificationCode = code;
  this.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  this.verificationAttempts = 0;
  this.status = ContactStatus.UNVERIFIED;
  
  await this.save();
  
  return code;
};

/**
 * Verify contact
 */
contactDetailsSchema.methods.verify = async function(
  code: string,
  method: string = 'code'
): Promise<boolean> {
  if (this.status === ContactStatus.VERIFIED) {
    return true;
  }
  
  if (method === 'code') {
    if (!this.verificationCode || !this.verificationExpiry) {
      return false;
    }
    
    if (new Date() > this.verificationExpiry) {
      return false;
    }
    
    if (this.verificationCode !== code) {
      this.verificationAttempts = (this.verificationAttempts || 0) + 1;
      await this.save();
      return false;
    }
  }
  
  this.isVerified = true;
  this.status = ContactStatus.VERIFIED;
  this.verificationDate = new Date();
  this.verificationMethod = method;
  this.verificationCode = undefined;
  this.verificationExpiry = undefined;
  
  await this.save();
  
  return true;
};

/**
 * Mark as primary
 */
contactDetailsSchema.methods.markAsPrimary = async function(): Promise<IContactDetails> {
  this.isPrimary = true;
  return this.save();
};

/**
 * Update status
 */
contactDetailsSchema.methods.updateStatus = async function(
  status: ContactStatus
): Promise<IContactDetails> {
  this.status = status;
  return this.save();
};

/**
 * Update communication preferences
 */
contactDetailsSchema.methods.updateCommunicationPreferences = async function(
  preferences: Partial<IContactDetails['communicationPreferences']>
): Promise<IContactDetails> {
  this.communicationPreferences = {
    ...this.communicationPreferences,
    ...preferences
  };
  
  return this.save();
};

/**
 * Opt out from all communications
 */
contactDetailsSchema.methods.optOut = async function(): Promise<IContactDetails> {
  this.allowCommunication = false;
  this.status = ContactStatus.DO_NOT_CONTACT;
  
  if (this.communicationPreferences) {
    this.communicationPreferences.allowMarketing = false;
    this.communicationPreferences.allowNotifications = false;
    this.communicationPreferences.allowReminders = false;
    this.communicationPreferences.allowSurveys = false;
  }
  
  return this.save();
};

// Export the model
export const ContactDetails = model<IContactDetails>('ContactDetails', contactDetailsSchema); 