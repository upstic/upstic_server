import { Schema, model, Document, Types } from 'mongoose';
import { NotificationTemplateCategory } from './NotificationTemplate';

/**
 * Enum for notification channel
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK'
}

/**
 * Enum for notification frequency
 */
export enum NotificationFrequency {
  IMMEDIATELY = 'IMMEDIATELY',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NEVER = 'NEVER'
}

/**
 * Enum for notification time preference
 */
export enum NotificationTimePreference {
  ANY_TIME = 'ANY_TIME',
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface for notification category settings
 */
export interface INotificationCategorySettings {
  category: NotificationTemplateCategory;
  enabled: boolean;
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      frequency?: NotificationFrequency;
    };
  };
  importance?: 'high' | 'normal' | 'low';
  customSettings?: Record<string, any>;
}

/**
 * Interface for notification settings
 */
export interface INotificationSettings extends Document {
  // Relationships
  userId: Types.ObjectId | string;
  
  // Global settings
  enabled: boolean;
  doNotDisturb: boolean;
  
  // Channel settings
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      verified: boolean;
      verificationDate?: Date;
      contactId?: Types.ObjectId | string;
    };
  };
  
  // Time preferences
  timePreference: NotificationTimePreference;
  customTimePreference?: {
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: string[];
  };
  
  // Category settings
  categorySettings: INotificationCategorySettings[];
  
  // Muted entities
  mutedUsers?: Array<Types.ObjectId | string>;
  mutedTopics?: string[];
  mutedThreads?: Array<Types.ObjectId | string>;
  
  // Digest settings
  digestEnabled: boolean;
  digestFrequency: NotificationFrequency;
  digestDay?: string;
  digestTime?: string;
  
  // Audit fields
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateChannelSettings(channel: NotificationChannel, settings: Partial<INotificationSettings['channels'][NotificationChannel]>): Promise<INotificationSettings>;
  updateCategorySettings(category: NotificationTemplateCategory, settings: Partial<INotificationCategorySettings>): Promise<INotificationSettings>;
  toggleChannel(channel: NotificationChannel, enabled: boolean): Promise<INotificationSettings>;
  toggleCategory(category: NotificationTemplateCategory, enabled: boolean): Promise<INotificationSettings>;
  muteUser(userId: Types.ObjectId | string): Promise<INotificationSettings>;
  unmuteUser(userId: Types.ObjectId | string): Promise<INotificationSettings>;
  muteTopic(topic: string): Promise<INotificationSettings>;
  unmuteTopic(topic: string): Promise<INotificationSettings>;
  enableDigest(frequency: NotificationFrequency): Promise<INotificationSettings>;
  disableDigest(): Promise<INotificationSettings>;
  toggleDoNotDisturb(enabled: boolean): Promise<INotificationSettings>;
}

/**
 * Schema for notification settings
 */
const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    // Relationships
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Global settings
    enabled: {
      type: Boolean,
      default: true
    },
    doNotDisturb: {
      type: Boolean,
      default: false
    },
    
    // Channel settings
    channels: {
      EMAIL: {
        enabled: {
          type: Boolean,
          default: true
        },
        verified: {
          type: Boolean,
          default: false
        },
        verificationDate: {
          type: Date
        },
        contactId: {
          type: Schema.Types.ObjectId,
          ref: 'ContactDetails'
        }
      },
      SMS: {
        enabled: {
          type: Boolean,
          default: false
        },
        verified: {
          type: Boolean,
          default: false
        },
        verificationDate: {
          type: Date
        },
        contactId: {
          type: Schema.Types.ObjectId,
          ref: 'ContactDetails'
        }
      },
      PUSH: {
        enabled: {
          type: Boolean,
          default: true
        },
        verified: {
          type: Boolean,
          default: false
        },
        verificationDate: {
          type: Date
        }
      },
      IN_APP: {
        enabled: {
          type: Boolean,
          default: true
        },
        verified: {
          type: Boolean,
          default: true
        }
      },
      WEBHOOK: {
        enabled: {
          type: Boolean,
          default: false
        },
        verified: {
          type: Boolean,
          default: false
        },
        verificationDate: {
          type: Date
        },
        contactId: {
          type: Schema.Types.ObjectId,
          ref: 'ContactDetails'
        }
      }
    },
    
    // Time preferences
    timePreference: {
      type: String,
      enum: Object.values(NotificationTimePreference),
      default: NotificationTimePreference.ANY_TIME
    },
    customTimePreference: {
      startTime: {
        type: String
      },
      endTime: {
        type: String
      },
      timezone: {
        type: String
      },
      daysOfWeek: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }]
    },
    
    // Category settings
    categorySettings: [{
      category: {
        type: String,
        enum: Object.values(NotificationTemplateCategory),
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        EMAIL: {
          enabled: {
            type: Boolean,
            default: true
          },
          frequency: {
            type: String,
            enum: Object.values(NotificationFrequency),
            default: NotificationFrequency.IMMEDIATELY
          }
        },
        SMS: {
          enabled: {
            type: Boolean,
            default: false
          },
          frequency: {
            type: String,
            enum: Object.values(NotificationFrequency),
            default: NotificationFrequency.IMMEDIATELY
          }
        },
        PUSH: {
          enabled: {
            type: Boolean,
            default: true
          },
          frequency: {
            type: String,
            enum: Object.values(NotificationFrequency),
            default: NotificationFrequency.IMMEDIATELY
          }
        },
        IN_APP: {
          enabled: {
            type: Boolean,
            default: true
          },
          frequency: {
            type: String,
            enum: Object.values(NotificationFrequency),
            default: NotificationFrequency.IMMEDIATELY
          }
        },
        WEBHOOK: {
          enabled: {
            type: Boolean,
            default: false
          },
          frequency: {
            type: String,
            enum: Object.values(NotificationFrequency),
            default: NotificationFrequency.IMMEDIATELY
          }
        }
      },
      importance: {
        type: String,
        enum: ['high', 'normal', 'low'],
        default: 'normal'
      },
      customSettings: {
        type: Schema.Types.Mixed
      }
    }],
    
    // Muted entities
    mutedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    mutedTopics: [{
      type: String
    }],
    mutedThreads: [{
      type: Schema.Types.ObjectId,
      ref: 'Thread'
    }],
    
    // Digest settings
    digestEnabled: {
      type: Boolean,
      default: false
    },
    digestFrequency: {
      type: String,
      enum: Object.values(NotificationFrequency),
      default: NotificationFrequency.DAILY
    },
    digestDay: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    digestTime: {
      type: String
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
notificationSettingsSchema.index({ userId: 1 });
notificationSettingsSchema.index({ 'channels.EMAIL.verified': 1 });
notificationSettingsSchema.index({ 'channels.SMS.verified': 1 });
notificationSettingsSchema.index({ 'categorySettings.category': 1 });

// Ensure only one settings document per user
notificationSettingsSchema.index({ userId: 1 }, { unique: true });

// Validate custom time preference
notificationSettingsSchema.pre('validate', function(next) {
  if (this.timePreference === NotificationTimePreference.CUSTOM) {
    if (!this.customTimePreference || !this.customTimePreference.startTime || !this.customTimePreference.endTime) {
      const error = new Error('Custom time preference requires start and end times');
      return next(error);
    }
  }
  
  next();
});

// Initialize default category settings if not provided
notificationSettingsSchema.pre('save', function(next) {
  if (!this.categorySettings || this.categorySettings.length === 0) {
    this.categorySettings = Object.values(NotificationTemplateCategory).map(category => ({
      category,
      enabled: true,
      channels: {
        EMAIL: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        SMS: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        PUSH: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        IN_APP: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        WEBHOOK: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        }
      },
      importance: 'normal'
    }));
  }
  
  next();
});

/**
 * Update channel settings
 */
notificationSettingsSchema.methods.updateChannelSettings = async function(
  channel: NotificationChannel,
  settings: Partial<INotificationSettings['channels'][NotificationChannel]>
): Promise<INotificationSettings> {
  if (!this.channels[channel]) {
    this.channels[channel] = {
      enabled: true,
      verified: false
    };
  }
  
  this.channels[channel] = {
    ...this.channels[channel],
    ...settings
  };
  
  return this.save();
};

/**
 * Update category settings
 */
notificationSettingsSchema.methods.updateCategorySettings = async function(
  category: NotificationTemplateCategory,
  settings: Partial<INotificationCategorySettings>
): Promise<INotificationSettings> {
  const categoryIndex = this.categorySettings.findIndex(cs => cs.category === category);
  
  if (categoryIndex === -1) {
    // Create new category settings if not found
    const newCategorySettings: INotificationCategorySettings = {
      category,
      enabled: true,
      channels: {
        EMAIL: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        SMS: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        PUSH: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        IN_APP: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        WEBHOOK: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        }
      },
      importance: 'normal',
      ...settings
    };
    
    this.categorySettings.push(newCategorySettings);
  } else {
    // Update existing category settings
    this.categorySettings[categoryIndex] = {
      ...this.categorySettings[categoryIndex],
      ...settings
    };
    
    // If channels are provided, merge them
    if (settings.channels) {
      for (const [channelKey, channelSettings] of Object.entries(settings.channels)) {
        const channel = channelKey as NotificationChannel;
        this.categorySettings[categoryIndex].channels[channel] = {
          ...this.categorySettings[categoryIndex].channels[channel],
          ...channelSettings
        };
      }
    }
  }
  
  return this.save();
};

/**
 * Toggle channel
 */
notificationSettingsSchema.methods.toggleChannel = async function(
  channel: NotificationChannel,
  enabled: boolean
): Promise<INotificationSettings> {
  if (!this.channels[channel]) {
    this.channels[channel] = {
      enabled,
      verified: false
    };
  } else {
    this.channels[channel].enabled = enabled;
  }
  
  return this.save();
};

/**
 * Toggle category
 */
notificationSettingsSchema.methods.toggleCategory = async function(
  category: NotificationTemplateCategory,
  enabled: boolean
): Promise<INotificationSettings> {
  const categoryIndex = this.categorySettings.findIndex(cs => cs.category === category);
  
  if (categoryIndex === -1) {
    // Create new category settings if not found
    const newCategorySettings: INotificationCategorySettings = {
      category,
      enabled,
      channels: {
        EMAIL: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        SMS: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        PUSH: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        IN_APP: {
          enabled: true,
          frequency: NotificationFrequency.IMMEDIATELY
        },
        WEBHOOK: {
          enabled: false,
          frequency: NotificationFrequency.IMMEDIATELY
        }
      },
      importance: 'normal'
    };
    
    this.categorySettings.push(newCategorySettings);
  } else {
    // Update existing category settings
    this.categorySettings[categoryIndex].enabled = enabled;
  }
  
  return this.save();
};

/**
 * Mute user
 */
notificationSettingsSchema.methods.muteUser = async function(
  userId: Types.ObjectId | string
): Promise<INotificationSettings> {
  if (!this.mutedUsers) {
    this.mutedUsers = [];
  }
  
  if (!this.mutedUsers.some(id => id.toString() === userId.toString())) {
    this.mutedUsers.push(userId);
  }
  
  return this.save();
};

/**
 * Unmute user
 */
notificationSettingsSchema.methods.unmuteUser = async function(
  userId: Types.ObjectId | string
): Promise<INotificationSettings> {
  if (!this.mutedUsers) {
    return this;
  }
  
  this.mutedUsers = this.mutedUsers.filter(id => id.toString() !== userId.toString());
  
  return this.save();
};

/**
 * Mute topic
 */
notificationSettingsSchema.methods.muteTopic = async function(
  topic: string
): Promise<INotificationSettings> {
  if (!this.mutedTopics) {
    this.mutedTopics = [];
  }
  
  if (!this.mutedTopics.includes(topic)) {
    this.mutedTopics.push(topic);
  }
  
  return this.save();
};

/**
 * Unmute topic
 */
notificationSettingsSchema.methods.unmuteTopic = async function(
  topic: string
): Promise<INotificationSettings> {
  if (!this.mutedTopics) {
    return this;
  }
  
  this.mutedTopics = this.mutedTopics.filter(t => t !== topic);
  
  return this.save();
};

/**
 * Enable digest
 */
notificationSettingsSchema.methods.enableDigest = async function(
  frequency: NotificationFrequency
): Promise<INotificationSettings> {
  this.digestEnabled = true;
  this.digestFrequency = frequency;
  
  return this.save();
};

/**
 * Disable digest
 */
notificationSettingsSchema.methods.disableDigest = async function(): Promise<INotificationSettings> {
  this.digestEnabled = false;
  
  return this.save();
};

/**
 * Toggle do not disturb
 */
notificationSettingsSchema.methods.toggleDoNotDisturb = async function(
  enabled: boolean
): Promise<INotificationSettings> {
  this.doNotDisturb = enabled;
  
  return this.save();
};

/**
 * Find settings by user ID
 */
notificationSettingsSchema.statics.findByUserId = async function(
  userId: Types.ObjectId | string
): Promise<INotificationSettings | null> {
  return this.findOne({ userId });
};

/**
 * Find users with verified email
 */
notificationSettingsSchema.statics.findWithVerifiedEmail = async function(): Promise<INotificationSettings[]> {
  return this.find({
    'channels.EMAIL.verified': true,
    'channels.EMAIL.enabled': true
  });
};

/**
 * Find users with verified SMS
 */
notificationSettingsSchema.statics.findWithVerifiedSMS = async function(): Promise<INotificationSettings[]> {
  return this.find({
    'channels.SMS.verified': true,
    'channels.SMS.enabled': true
  });
};

/**
 * Find users with enabled push notifications
 */
notificationSettingsSchema.statics.findWithEnabledPush = async function(): Promise<INotificationSettings[]> {
  return this.find({
    'channels.PUSH.enabled': true
  });
};

/**
 * Find users with enabled category
 */
notificationSettingsSchema.statics.findWithEnabledCategory = async function(
  category: NotificationTemplateCategory
): Promise<INotificationSettings[]> {
  return this.find({
    'categorySettings': {
      $elemMatch: {
        'category': category,
        'enabled': true
      }
    }
  });
};

/**
 * Find users with enabled digest
 */
notificationSettingsSchema.statics.findWithEnabledDigest = async function(
  frequency?: NotificationFrequency
): Promise<INotificationSettings[]> {
  const query: any = {
    digestEnabled: true
  };
  
  if (frequency) {
    query.digestFrequency = frequency;
  }
  
  return this.find(query);
};

/**
 * Create default settings for user
 */
notificationSettingsSchema.statics.createDefaultSettings = async function(
  userId: Types.ObjectId | string
): Promise<INotificationSettings> {
  return this.create({
    userId,
    enabled: true,
    doNotDisturb: false,
    channels: {
      EMAIL: {
        enabled: true,
        verified: false
      },
      SMS: {
        enabled: false,
        verified: false
      },
      PUSH: {
        enabled: true,
        verified: false
      },
      IN_APP: {
        enabled: true,
        verified: true
      },
      WEBHOOK: {
        enabled: false,
        verified: false
      }
    },
    timePreference: NotificationTimePreference.ANY_TIME,
    digestEnabled: false,
    digestFrequency: NotificationFrequency.DAILY
  });
};

// Export the model
export const NotificationSettings = model<INotificationSettings>('NotificationSettings', notificationSettingsSchema); 