import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISecuritySettings extends Document {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    passwordExpiryDays: number;
    preventPasswordReuse: number;
    lockoutThreshold: number;
    lockoutDurationMinutes: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    requiredForRoles: string[];
    methods: ('email' | 'sms' | 'app')[];
    defaultMethod: 'email' | 'sms' | 'app';
    tokenExpiryMinutes: number;
  };
  session: {
    expiryMinutes: number;
    extendOnActivity: boolean;
    singleSessionPerUser: boolean;
    rememberMeDurationDays: number;
  };
  jwt: {
    accessTokenExpiryMinutes: number;
    refreshTokenExpiryDays: number;
    issuer: string;
    algorithm: string;
  };
  ipSecurity: {
    enableGeoBlocking: boolean;
    allowedCountries: string[];
    blockedIPs: string[];
    suspiciousLoginThreshold: number;
  };
  updatedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define interface for static methods
export interface ISecuritySettingsModel extends Model<ISecuritySettings> {
  getSettings(): Promise<ISecuritySettings>;
  updateSettings(settingsData: Partial<ISecuritySettings>, userId: Schema.Types.ObjectId | string): Promise<ISecuritySettings>;
  validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }>;
}

const securitySettingsSchema = new Schema<ISecuritySettings>(
  {
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
        min: 6,
        max: 64
      },
      requireUppercase: {
        type: Boolean,
        default: true
      },
      requireLowercase: {
        type: Boolean,
        default: true
      },
      requireNumbers: {
        type: Boolean,
        default: true
      },
      requireSpecialChars: {
        type: Boolean,
        default: true
      },
      passwordExpiryDays: {
        type: Number,
        default: 90,
        min: 0
      },
      preventPasswordReuse: {
        type: Number,
        default: 5,
        min: 0
      },
      lockoutThreshold: {
        type: Number,
        default: 5,
        min: 0
      },
      lockoutDurationMinutes: {
        type: Number,
        default: 30,
        min: 1
      }
    },
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false
      },
      requiredForRoles: {
        type: [String],
        default: ['admin']
      },
      methods: {
        type: [String],
        enum: ['email', 'sms', 'app'],
        default: ['email', 'app']
      },
      defaultMethod: {
        type: String,
        enum: ['email', 'sms', 'app'],
        default: 'email'
      },
      tokenExpiryMinutes: {
        type: Number,
        default: 10,
        min: 1
      }
    },
    session: {
      expiryMinutes: {
        type: Number,
        default: 60,
        min: 1
      },
      extendOnActivity: {
        type: Boolean,
        default: true
      },
      singleSessionPerUser: {
        type: Boolean,
        default: false
      },
      rememberMeDurationDays: {
        type: Number,
        default: 30,
        min: 1
      }
    },
    jwt: {
      accessTokenExpiryMinutes: {
        type: Number,
        default: 15,
        min: 1
      },
      refreshTokenExpiryDays: {
        type: Number,
        default: 7,
        min: 1
      },
      issuer: {
        type: String,
        default: 'recruitment-platform'
      },
      algorithm: {
        type: String,
        default: 'HS256'
      }
    },
    ipSecurity: {
      enableGeoBlocking: {
        type: Boolean,
        default: false
      },
      allowedCountries: {
        type: [String],
        default: []
      },
      blockedIPs: {
        type: [String],
        default: []
      },
      suspiciousLoginThreshold: {
        type: Number,
        default: 3,
        min: 1
      }
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one document exists
securitySettingsSchema.statics.getSettings = async function(this: ISecuritySettingsModel) {
  const settings = await this.findOne().sort({ updatedAt: -1 });
  
  if (settings) {
    return settings;
  }
  
  // If no settings exist, create default settings
  // This requires a user ID, so it should be called with an admin user ID
  throw new Error('No security settings found. Please initialize settings with an admin user ID.');
};

securitySettingsSchema.statics.updateSettings = async function(
  this: ISecuritySettingsModel,
  settingsData: Partial<ISecuritySettings>,
  userId: Schema.Types.ObjectId | string
) {
  const settings = await this.findOne().sort({ updatedAt: -1 });
  
  if (settings) {
    // Update existing settings
    Object.assign(settings, settingsData, { updatedBy: userId });
    return settings.save();
  }
  
  // Create new settings
  return this.create({
    ...settingsData,
    updatedBy: userId
  });
};

securitySettingsSchema.statics.validatePassword = function(this: ISecuritySettingsModel, password: string) {
  return this.getSettings().then(settings => {
    const policy = settings.passwordPolicy;
    const errors = [];
    
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  });
};

export const SecuritySettings = mongoose.model<ISecuritySettings, ISecuritySettingsModel>('SecuritySettings', securitySettingsSchema); 