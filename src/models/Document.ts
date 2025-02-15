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
  OTHER = 'other'
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
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
documentSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

export const Document = mongoose.model<IDocument>('Document', documentSchema); 