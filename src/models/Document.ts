import mongoose, { Schema } from 'mongoose';

export enum DocumentType {
  RESUME = 'resume',
  ID = 'id',
  CERTIFICATION = 'certification',
  CONTRACT = 'contract',
  TIMESHEET = 'timesheet',
  BACKGROUND_CHECK = 'background_check',
  REFERENCE = 'reference',
  TRAINING = 'training',
  ASSESSMENT = 'assessment',
  PASSPORT = 'passport',
  VISA = 'visa',
  WORK_PERMIT = 'work_permit',
  DRIVING_LICENSE = 'driving_license',
  INSURANCE = 'insurance',
  TAX_DOCUMENT = 'tax_document',
  MEDICAL_CERTIFICATE = 'medical_certificate',
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  QUALIFICATION = 'qualification',
  OTHER = 'other'
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REQUIRES_UPDATE = 'requires_update',
  UNDER_REVIEW = 'under_review'
}

export enum VerificationLevel {
  NONE = 'none',
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  FULL = 'full'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  EXEMPTED = 'exempted',
  EXPIRED = 'expired'
}

export interface IDocument {
  userId: string;
  clientId?: string;
  type: DocumentType;
  title: string;
  description?: string;
  status: DocumentStatus;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  issuedBy?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  tags: string[];
  // Enhanced fields for compliance
  compliance: {
    status: ComplianceStatus;
    requiredFor: string[];
    exemptionReason?: string;
    exemptionExpiryDate?: Date;
    lastReviewDate?: Date;
    nextReviewDate?: Date;
    reviewedBy?: string;
    notes?: string;
  };
  // Enhanced fields for verification
  verification: {
    level: VerificationLevel;
    method?: string;
    verifiedBy?: string;
    verifiedAt?: Date;
    expiryDate?: Date;
    rejectionReason?: string;
    evidenceUrls?: string[];
    verificationNotes?: string;
  };
  // Enhanced fields for document tracking
  tracking: {
    reminderSent: boolean;
    reminderDates: Date[];
    expiryNotificationSent: boolean;
    viewCount: number;
    lastViewed?: Date;
    downloadCount: number;
    lastDownloaded?: Date;
    shareCount: number;
    sharedWith: {
      userId: string;
      sharedAt: Date;
      accessLevel: string;
      expiryDate?: Date;
    }[];
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModifiedBy: string;
    lastModifiedAt: Date;
    version: number;
    originalFilename: string;
    notes?: string;
  };
}

const documentSchema = new Schema<IDocument>({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  clientId: {
    type: String,
    ref: 'Client'
  },
  type: {
    type: String,
    enum: Object.values(DocumentType),
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.PENDING
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  issuedBy: String,
  issuedDate: Date,
  expiryDate: Date,
  verifiedBy: {
    type: String,
    ref: 'User'
  },
  verifiedAt: Date,
  tags: [String],
  // Enhanced fields for compliance
  compliance: {
    status: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.PENDING_REVIEW
    },
    requiredFor: [String],
    exemptionReason: String,
    exemptionExpiryDate: Date,
    lastReviewDate: Date,
    nextReviewDate: Date,
    reviewedBy: {
      type: String,
      ref: 'User'
    },
    notes: String
  },
  // Enhanced fields for verification
  verification: {
    level: {
      type: String,
      enum: Object.values(VerificationLevel),
      default: VerificationLevel.NONE
    },
    method: String,
    verifiedBy: {
      type: String,
      ref: 'User'
    },
    verifiedAt: Date,
    expiryDate: Date,
    rejectionReason: String,
    evidenceUrls: [String],
    verificationNotes: String
  },
  // Enhanced fields for document tracking
  tracking: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderDates: [Date],
    expiryNotificationSent: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloaded: Date,
    shareCount: {
      type: Number,
      default: 0
    },
    sharedWith: [{
      userId: {
        type: String,
        ref: 'User'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      },
      accessLevel: String,
      expiryDate: Date
    }]
  },
  metadata: {
    createdBy: {
      type: String,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastModifiedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    },
    originalFilename: {
      type: String,
      required: true
    },
    notes: String
  }
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ clientId: 1, type: 1 });
documentSchema.index({ status: 1, expiryDate: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ 'compliance.status': 1, 'compliance.nextReviewDate': 1 });
documentSchema.index({ 'verification.level': 1, 'verification.expiryDate': 1 });
documentSchema.index({ 'tracking.sharedWith.userId': 1 });
documentSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Pre-save middleware to update lastModifiedAt
documentSchema.pre('save', function(next) {
  this.metadata.lastModifiedAt = new Date();
  next();
});

// Pre-save middleware to check expiry and update status
documentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status !== DocumentStatus.EXPIRED) {
    this.status = DocumentStatus.EXPIRED;
    this.compliance.status = ComplianceStatus.EXPIRED;
  }
  next();
});

// Method to track document view
documentSchema.methods.trackView = function() {
  this.tracking.viewCount += 1;
  this.tracking.lastViewed = new Date();
  return this.save();
};

// Method to track document download
documentSchema.methods.trackDownload = function() {
  this.tracking.downloadCount += 1;
  this.tracking.lastDownloaded = new Date();
  return this.save();
};

// Method to share document
documentSchema.methods.shareWith = function(userId: string, accessLevel: string, expiryDate?: Date) {
  if (!this.tracking.sharedWith) {
    this.tracking.sharedWith = [];
  }
  
  this.tracking.sharedWith.push({
    userId,
    sharedAt: new Date(),
    accessLevel,
    expiryDate
  });
  
  this.tracking.shareCount += 1;
  return this.save();
};

// Method to verify document
documentSchema.methods.verify = function(verifiedBy: string, level: VerificationLevel, method?: string, notes?: string) {
  this.status = DocumentStatus.VERIFIED;
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  
  this.verification.level = level;
  this.verification.method = method;
  this.verification.verifiedBy = verifiedBy;
  this.verification.verifiedAt = new Date();
  this.verification.verificationNotes = notes;
  
  this.compliance.status = ComplianceStatus.COMPLIANT;
  this.compliance.lastReviewDate = new Date();
  this.compliance.reviewedBy = verifiedBy;
  
  return this.save();
};

// Method to reject document
documentSchema.methods.reject = function(rejectedBy: string, reason: string) {
  this.status = DocumentStatus.REJECTED;
  this.verification.rejectionReason = reason;
  this.verification.verifiedBy = rejectedBy;
  this.verification.verifiedAt = new Date();
  this.compliance.status = ComplianceStatus.NON_COMPLIANT;
  
  return this.save();
};

export const Document = mongoose.model<IDocument>('Document', documentSchema); 