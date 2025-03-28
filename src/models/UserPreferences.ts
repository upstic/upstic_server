import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Enum for preference type
 */
export enum PreferenceType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  DATE = 'DATE'
}

/**
 * Enum for preference scope
 */
export enum PreferenceScope {
  SYSTEM = 'SYSTEM',
  APPEARANCE = 'APPEARANCE',
  NOTIFICATION = 'NOTIFICATION',
  COMMUNICATION = 'COMMUNICATION',
  PRIVACY = 'PRIVACY',
  SECURITY = 'SECURITY',
  DASHBOARD = 'DASHBOARD',
  REPORTING = 'REPORTING',
  WORKFLOW = 'WORKFLOW',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface for preference definition
 */
export interface IPreferenceDefinition {
  key: string;
  name: string;
  description?: string;
  type: PreferenceType;
  scope: PreferenceScope;
  defaultValue: any;
  options?: Array<{
    label: string;
    value: any;
  }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
  };
  isSystem: boolean;
  isHidden: boolean;
  isGlobal: boolean;
  version: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for preference value
 */
export interface IPreferenceValue {
  key: string;
  value: any;
  lastUpdated: Date;
  updatedBy?: Types.ObjectId | string;
}

/**
 * Interface for user preferences
 */
export interface IUserPreferences extends Document {
  // Relationships
  userId: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
  
  // Preferences
  preferences: IPreferenceValue[];
  
  // Metadata
  lastSyncedAt?: Date;
  version: number;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getPreference(key: string): any;
  setPreference(key: string, value: any): Promise<IUserPreferences>;
  setPreferences(preferences: Record<string, any>): Promise<IUserPreferences>;
  resetPreference(key: string): Promise<IUserPreferences>;
  resetAllPreferences(): Promise<IUserPreferences>;
  hasPreference(key: string): boolean;
}

/**
 * Interface for user preferences model with static methods
 */
export interface IUserPreferencesModel extends Model<IUserPreferences> {
  findByUserId(userId: Types.ObjectId | string): Promise<IUserPreferences>;
  findByUserAndCompany(userId: Types.ObjectId | string, companyId: Types.ObjectId | string): Promise<IUserPreferences>;
  getDefaultPreferences(): Promise<Record<string, any>>;
}

/**
 * Interface for preference definition model
 */
export interface IPreferenceDefinitionDocument extends Document, IPreferenceDefinition {
  // Methods
  updateDefinition(definition: Partial<IPreferenceDefinition>): Promise<IPreferenceDefinitionDocument>;
  deprecate(): Promise<IPreferenceDefinitionDocument>;
}

/**
 * Interface for preference definition model with static methods
 */
export interface IPreferenceDefinitionModel extends Model<IPreferenceDefinitionDocument> {
  findByKey(key: string): Promise<IPreferenceDefinitionDocument>;
  findByScope(scope: PreferenceScope): Promise<IPreferenceDefinitionDocument[]>;
  findSystemPreferences(): Promise<IPreferenceDefinitionDocument[]>;
  findGlobalPreferences(): Promise<IPreferenceDefinitionDocument[]>;
}

/**
 * Schema for preference definition
 */
const preferenceDefinitionSchema = new Schema<IPreferenceDefinitionDocument>(
  {
    key: {
      type: String,
      required: [true, 'Preference key is required'],
      trim: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Preference name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(PreferenceType),
      required: [true, 'Preference type is required']
    },
    scope: {
      type: String,
      enum: Object.values(PreferenceScope),
      required: [true, 'Preference scope is required'],
      index: true
    },
    defaultValue: {
      type: Schema.Types.Mixed,
      required: [true, 'Default value is required']
    },
    options: [{
      label: {
        type: String,
        required: true
      },
      value: {
        type: Schema.Types.Mixed,
        required: true
      }
    }],
    validation: {
      required: Boolean,
      min: Number,
      max: Number,
      minLength: Number,
      maxLength: Number,
      pattern: String,
      enum: [Schema.Types.Mixed]
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

/**
 * Update preference definition
 */
preferenceDefinitionSchema.methods.updateDefinition = async function(
  definition: Partial<IPreferenceDefinition>
): Promise<IPreferenceDefinitionDocument> {
  // Increment version if certain fields are modified
  if (
    definition.type !== undefined ||
    definition.defaultValue !== undefined ||
    definition.validation !== undefined
  ) {
    this.version += 1;
  }
  
  // Update fields
  Object.assign(this, definition);
  
  return this.save();
};

/**
 * Deprecate preference definition
 */
preferenceDefinitionSchema.methods.deprecate = async function(): Promise<IPreferenceDefinitionDocument> {
  this.isHidden = true;
  return this.save();
};

/**
 * Find preference definition by key
 */
preferenceDefinitionSchema.statics.findByKey = async function(
  this: IPreferenceDefinitionModel,
  key: string
): Promise<IPreferenceDefinitionDocument> {
  return this.findOne({ key });
};

/**
 * Find preference definitions by scope
 */
preferenceDefinitionSchema.statics.findByScope = async function(
  this: IPreferenceDefinitionModel,
  scope: PreferenceScope
): Promise<IPreferenceDefinitionDocument[]> {
  return this.find({ scope, isHidden: false });
};

/**
 * Find system preference definitions
 */
preferenceDefinitionSchema.statics.findSystemPreferences = async function(
  this: IPreferenceDefinitionModel
): Promise<IPreferenceDefinitionDocument[]> {
  return this.find({ isSystem: true, isHidden: false });
};

/**
 * Find global preference definitions
 */
preferenceDefinitionSchema.statics.findGlobalPreferences = async function(
  this: IPreferenceDefinitionModel
): Promise<IPreferenceDefinitionDocument[]> {
  return this.find({ isGlobal: true, isHidden: false });
};

/**
 * Schema for user preferences
 */
const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    // Relationships
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
    
    // Preferences
    preferences: [{
      key: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: Schema.Types.Mixed,
        required: true
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    
    // Metadata
    lastSyncedAt: {
      type: Date
    },
    version: {
      type: Number,
      default: 1
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

// Create a compound index for userId and companyId
userPreferencesSchema.index({ userId: 1, companyId: 1 }, { unique: true, sparse: true });

/**
 * Get preference value
 */
userPreferencesSchema.methods.getPreference = function(key: string): any {
  if (!this.preferences) {
    return undefined;
  }
  
  const preference = this.preferences.find(p => p.key === key);
  return preference ? preference.value : undefined;
};

/**
 * Set preference value
 */
userPreferencesSchema.methods.setPreference = async function(
  key: string,
  value: any
): Promise<IUserPreferences> {
  if (!this.preferences) {
    this.preferences = [];
  }
  
  const now = new Date();
  const preferenceIndex = this.preferences.findIndex(p => p.key === key);
  
  if (preferenceIndex >= 0) {
    // Update existing preference
    this.preferences[preferenceIndex].value = value;
    this.preferences[preferenceIndex].lastUpdated = now;
    this.preferences[preferenceIndex].updatedBy = this.updatedBy;
  } else {
    // Add new preference
    this.preferences.push({
      key,
      value,
      lastUpdated: now,
      updatedBy: this.updatedBy
    });
  }
  
  // Increment version
  this.version += 1;
  
  return this.save();
};

/**
 * Set multiple preferences at once
 */
userPreferencesSchema.methods.setPreferences = async function(
  preferences: Record<string, any>
): Promise<IUserPreferences> {
  if (!this.preferences) {
    this.preferences = [];
  }
  
  const now = new Date();
  
  // Update or add each preference
  for (const [key, value] of Object.entries(preferences)) {
    const preferenceIndex = this.preferences.findIndex(p => p.key === key);
    
    if (preferenceIndex >= 0) {
      // Update existing preference
      this.preferences[preferenceIndex].value = value;
      this.preferences[preferenceIndex].lastUpdated = now;
      this.preferences[preferenceIndex].updatedBy = this.updatedBy;
    } else {
      // Add new preference
      this.preferences.push({
        key,
        value,
        lastUpdated: now,
        updatedBy: this.updatedBy
      });
    }
  }
  
  // Increment version
  this.version += 1;
  
  return this.save();
};

/**
 * Reset preference to default value
 */
userPreferencesSchema.methods.resetPreference = async function(key: string): Promise<IUserPreferences> {
  if (!this.preferences) {
    return this;
  }
  
  // Find and remove the preference
  const preferenceIndex = this.preferences.findIndex(p => p.key === key);
  
  if (preferenceIndex >= 0) {
    this.preferences.splice(preferenceIndex, 1);
    
    // Increment version
    this.version += 1;
    
    return this.save();
  }
  
  return this;
};

/**
 * Reset all preferences to default values
 */
userPreferencesSchema.methods.resetAllPreferences = async function(): Promise<IUserPreferences> {
  this.preferences = [];
  
  // Increment version
  this.version += 1;
  
  return this.save();
};

/**
 * Check if preference exists
 */
userPreferencesSchema.methods.hasPreference = function(key: string): boolean {
  if (!this.preferences) {
    return false;
  }
  
  return this.preferences.some(p => p.key === key);
};

/**
 * Find user preferences by user ID
 */
userPreferencesSchema.statics.findByUserId = async function(
  this: IUserPreferencesModel,
  userId: Types.ObjectId | string
): Promise<IUserPreferences> {
  let preferences = await this.findOne({ userId, companyId: { $exists: false } });
  
  if (!preferences) {
    // Create default preferences for user
    const defaultPrefs = await this.getDefaultPreferences();
    
    preferences = await this.create({
      userId,
      preferences: Object.entries(defaultPrefs).map(([key, value]) => ({
        key,
        value,
        lastUpdated: new Date()
      })),
      createdBy: userId
    });
  }
  
  return preferences;
};

/**
 * Find user preferences by user ID and company ID
 */
userPreferencesSchema.statics.findByUserAndCompany = async function(
  this: IUserPreferencesModel,
  userId: Types.ObjectId | string,
  companyId: Types.ObjectId | string
): Promise<IUserPreferences> {
  let preferences = await this.findOne({ userId, companyId });
  
  if (!preferences) {
    // Create default preferences for user in company context
    const defaultPrefs = await this.getDefaultPreferences();
    
    preferences = await this.create({
      userId,
      companyId,
      preferences: Object.entries(defaultPrefs).map(([key, value]) => ({
        key,
        value,
        lastUpdated: new Date()
      })),
      createdBy: userId
    });
  }
  
  return preferences;
};

/**
 * Get default preferences
 */
userPreferencesSchema.statics.getDefaultPreferences = async function(
  this: IUserPreferencesModel
): Promise<Record<string, any>> {
  const PreferenceDefinition = model<IPreferenceDefinitionDocument, IPreferenceDefinitionModel>('PreferenceDefinition');
  
  // Get all non-hidden preference definitions
  const definitions = await PreferenceDefinition.find({ isHidden: false });
  
  // Create a map of default values
  const defaultPreferences: Record<string, any> = {};
  
  for (const def of definitions) {
    defaultPreferences[def.key] = def.defaultValue;
  }
  
  return defaultPreferences;
};

// Export the models
export const PreferenceDefinition = model<IPreferenceDefinitionDocument, IPreferenceDefinitionModel>(
  'PreferenceDefinition',
  preferenceDefinitionSchema
);

export const UserPreferences = model<IUserPreferences, IUserPreferencesModel>(
  'UserPreferences',
  userPreferencesSchema
);