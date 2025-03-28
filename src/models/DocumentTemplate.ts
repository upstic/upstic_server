import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for document template type
 */
export enum DocumentTemplateType {
  CONTRACT = 'CONTRACT',
  AGREEMENT = 'AGREEMENT',
  OFFER_LETTER = 'OFFER_LETTER',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  CERTIFICATE = 'CERTIFICATE',
  REPORT = 'REPORT',
  LETTER = 'LETTER',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER'
}

/**
 * Enum for document template category
 */
export enum DocumentTemplateCategory {
  EMPLOYMENT = 'EMPLOYMENT',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL',
  COMPLIANCE = 'COMPLIANCE',
  MARKETING = 'MARKETING',
  COMMUNICATION = 'COMMUNICATION',
  REPORTING = 'REPORTING',
  ONBOARDING = 'ONBOARDING',
  OFFBOARDING = 'OFFBOARDING',
  OTHER = 'OTHER'
}

/**
 * Enum for document template status
 */
export enum DocumentTemplateStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Enum for document template format
 */
export enum DocumentTemplateFormat {
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  DOCX = 'DOCX',
  PDF = 'PDF',
  TEXT = 'TEXT',
  JSON = 'JSON',
  XML = 'XML'
}

/**
 * Interface for document template variable
 */
export interface IDocumentTemplateVariable {
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
    options?: string[];
  };
}

/**
 * Interface for document template section
 */
export interface IDocumentTemplateSection {
  name: string;
  title: string;
  content: string;
  order: number;
  isRequired: boolean;
  isEditable: boolean;
  variables?: IDocumentTemplateVariable[];
}

/**
 * Interface for document template
 */
export interface IDocumentTemplate extends Document {
  // Core data
  name: string;
  code: string;
  description?: string;
  type: DocumentTemplateType;
  category: DocumentTemplateCategory;
  format: DocumentTemplateFormat;
  
  // Content
  content?: string;
  sections?: IDocumentTemplateSection[];
  header?: string;
  footer?: string;
  
  // Variables
  variables: IDocumentTemplateVariable[];
  
  // File information
  fileUrl?: string;
  fileSize?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  
  // Metadata
  status: DocumentTemplateStatus;
  version: number;
  tags?: string[];
  language: string;
  
  // Access control
  isPublic: boolean;
  accessRoles?: string[];
  
  // Approval information
  approvedBy?: Types.ObjectId | string;
  approvedAt?: Date;
  reviewedBy?: Types.ObjectId | string;
  reviewedAt?: Date;
  
  // Usage tracking
  usageCount: number;
  lastUsed?: Date;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  incrementUsage(): Promise<IDocumentTemplate>;
  duplicate(): Promise<IDocumentTemplate>;
  approve(userId: Types.ObjectId | string): Promise<IDocumentTemplate>;
  review(userId: Types.ObjectId | string): Promise<IDocumentTemplate>;
  activate(): Promise<IDocumentTemplate>;
  deactivate(): Promise<IDocumentTemplate>;
  archive(): Promise<IDocumentTemplate>;
}

/**
 * Schema for document template
 */
const documentTemplateSchema = new Schema<IDocumentTemplate>(
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
      enum: Object.values(DocumentTemplateType),
      required: [true, 'Template type is required'],
      index: true
    },
    category: {
      type: String,
      enum: Object.values(DocumentTemplateCategory),
      required: [true, 'Template category is required'],
      index: true
    },
    format: {
      type: String,
      enum: Object.values(DocumentTemplateFormat),
      required: [true, 'Template format is required'],
      index: true
    },
    
    // Content
    content: {
      type: String
    },
    sections: [{
      name: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true
      },
      order: {
        type: Number,
        required: true,
        min: 0
      },
      isRequired: {
        type: Boolean,
        default: true
      },
      isEditable: {
        type: Boolean,
        default: true
      },
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
          },
          options: [{
            type: String
          }]
        }
      }]
    }],
    header: {
      type: String
    },
    footer: {
      type: String
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
        },
        options: [{
          type: String
        }]
      }
    }],
    
    // File information
    fileUrl: {
      type: String
    },
    fileSize: {
      type: Number
    },
    previewUrl: {
      type: String
    },
    thumbnailUrl: {
      type: String
    },
    
    // Metadata
    status: {
      type: String,
      enum: Object.values(DocumentTemplateStatus),
      default: DocumentTemplateStatus.DRAFT,
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
    language: {
      type: String,
      default: 'en',
      index: true
    },
    
    // Access control
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    accessRoles: [{
      type: String,
      index: true
    }],
    
    // Approval information
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
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
documentTemplateSchema.index({ type: 1, category: 1, status: 1 });
documentTemplateSchema.index({ code: 1, version: 1 });
documentTemplateSchema.index({ tags: 1, status: 1 });
documentTemplateSchema.index({ isPublic: 1, status: 1 });
documentTemplateSchema.index({ accessRoles: 1, status: 1 });

// Validate content or sections
documentTemplateSchema.pre('validate', function(next) {
  if (!this.content && (!this.sections || this.sections.length === 0)) {
    const error = new Error('Either content or sections must be provided');
    return next(error);
  }
  
  next();
});

// Increment version on update if content, sections, or variables change
documentTemplateSchema.pre('save', function(next) {
  if (!this.isNew && (
    this.isModified('content') || 
    this.isModified('sections') || 
    this.isModified('variables') ||
    this.isModified('header') ||
    this.isModified('footer')
  )) {
    this.version += 1;
  }
  next();
});

/**
 * Increment usage count and update last used date
 */
documentTemplateSchema.methods.incrementUsage = async function(): Promise<IDocumentTemplate> {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

/**
 * Duplicate template
 */
documentTemplateSchema.methods.duplicate = async function(): Promise<IDocumentTemplate> {
  const DocumentTemplateModel = this.constructor as typeof DocumentTemplate;
  
  // Create a new template based on this one
  const duplicateData = this.toObject();
  
  // Remove fields that should be unique or reset
  delete duplicateData._id;
  delete duplicateData.id;
  duplicateData.name = `${duplicateData.name} (Copy)`;
  duplicateData.code = `${duplicateData.code}_COPY_${Date.now()}`;
  duplicateData.status = DocumentTemplateStatus.DRAFT;
  duplicateData.version = 1;
  duplicateData.usageCount = 0;
  duplicateData.lastUsed = undefined;
  duplicateData.approvedBy = undefined;
  duplicateData.approvedAt = undefined;
  duplicateData.reviewedBy = undefined;
  duplicateData.reviewedAt = undefined;
  
  // Create and return the new template
  return DocumentTemplateModel.create(duplicateData);
};

/**
 * Approve template
 */
documentTemplateSchema.methods.approve = async function(
  userId: Types.ObjectId | string
): Promise<IDocumentTemplate> {
  this.status = DocumentTemplateStatus.APPROVED;
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

/**
 * Review template
 */
documentTemplateSchema.methods.review = async function(
  userId: Types.ObjectId | string
): Promise<IDocumentTemplate> {
  this.status = DocumentTemplateStatus.REVIEW;
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  return this.save();
};

/**
 * Activate template
 */
documentTemplateSchema.methods.activate = async function(): Promise<IDocumentTemplate> {
  this.status = DocumentTemplateStatus.ACTIVE;
  return this.save();
};

/**
 * Deactivate template
 */
documentTemplateSchema.methods.deactivate = async function(): Promise<IDocumentTemplate> {
  this.status = DocumentTemplateStatus.INACTIVE;
  return this.save();
};

/**
 * Archive template
 */
documentTemplateSchema.methods.archive = async function(): Promise<IDocumentTemplate> {
  this.status = DocumentTemplateStatus.ARCHIVED;
  return this.save();
};

/**
 * Find templates by type
 */
documentTemplateSchema.statics.findByType = async function(
  type: DocumentTemplateType,
  activeOnly: boolean = true
): Promise<IDocumentTemplate[]> {
  const query: any = { type };
  
  if (activeOnly) {
    query.status = DocumentTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find templates by category
 */
documentTemplateSchema.statics.findByCategory = async function(
  category: DocumentTemplateCategory,
  activeOnly: boolean = true
): Promise<IDocumentTemplate[]> {
  const query: any = { category };
  
  if (activeOnly) {
    query.status = DocumentTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find template by code
 */
documentTemplateSchema.statics.findByCode = async function(
  code: string,
  version?: number
): Promise<IDocumentTemplate | null> {
  const query: any = { code };
  
  if (version) {
    query.version = version;
  }
  
  return this.findOne(query);
};

/**
 * Find templates by tags
 */
documentTemplateSchema.statics.findByTags = async function(
  tags: string[],
  activeOnly: boolean = true
): Promise<IDocumentTemplate[]> {
  const query: any = { tags: { $in: tags } };
  
  if (activeOnly) {
    query.status = DocumentTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find templates by access roles
 */
documentTemplateSchema.statics.findByAccessRoles = async function(
  roles: string[],
  activeOnly: boolean = true
): Promise<IDocumentTemplate[]> {
  const query: any = {
    $or: [
      { isPublic: true },
      { accessRoles: { $in: roles } }
    ]
  };
  
  if (activeOnly) {
    query.status = DocumentTemplateStatus.ACTIVE;
  }
  
  return this.find(query);
};

/**
 * Find templates pending review
 */
documentTemplateSchema.statics.findPendingReview = async function(): Promise<IDocumentTemplate[]> {
  return this.find({
    status: DocumentTemplateStatus.REVIEW
  }).sort({ updatedAt: 1 });
};

/**
 * Find most used templates
 */
documentTemplateSchema.statics.findMostUsed = async function(
  limit: number = 10
): Promise<IDocumentTemplate[]> {
  return this.find({
    status: DocumentTemplateStatus.ACTIVE
  })
    .sort({ usageCount: -1 })
    .limit(limit);
};

/**
 * Find recently used templates
 */
documentTemplateSchema.statics.findRecentlyUsed = async function(
  limit: number = 10
): Promise<IDocumentTemplate[]> {
  return this.find({
    status: DocumentTemplateStatus.ACTIVE,
    lastUsed: { $exists: true }
  })
    .sort({ lastUsed: -1 })
    .limit(limit);
};

// Export the model
export const DocumentTemplate = model<IDocumentTemplate>('DocumentTemplate', documentTemplateSchema); 