import mongoose, { Schema, Document } from 'mongoose';

export interface ICompliance extends Document {
  entityId: Schema.Types.ObjectId;
  entityType: 'worker' | 'client' | 'branch';
  requirements: Array<{
    type: string;
    name: string;
    description: string;
    required: boolean;
    validityPeriod?: number;
    documentRequired: boolean;
    verificationRequired: boolean;
    status: 'pending' | 'submitted' | 'verified' | 'expired' | 'rejected';
    documents?: Array<{
      url: string;
      type: string;
      uploadDate: Date;
      expiryDate?: Date;
      verifiedBy?: Schema.Types.ObjectId;
      verificationDate?: Date;
      status: 'pending' | 'verified' | 'rejected';
      comments?: string;
    }>;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    documentUrl: string;
    status: 'active' | 'expired' | 'revoked';
    verificationDetails?: {
      verifiedBy: Schema.Types.ObjectId;
      date: Date;
      method: string;
      result: string;
    };
  }>;
  trainingRecords: Array<{
    name: string;
    provider: string;
    completionDate: Date;
    expiryDate?: Date;
    score?: number;
    certificateUrl?: string;
    status: 'completed' | 'expired' | 'in-progress';
  }>;
  audits: Array<{
    type: string;
    date: Date;
    conductor: Schema.Types.ObjectId;
    findings: Array<{
      category: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      status: 'open' | 'closed' | 'in-progress';
      dueDate?: Date;
      resolutionDate?: Date;
      resolution?: string;
    }>;
    status: 'passed' | 'failed' | 'conditional';
    nextAuditDate?: Date;
  }>;
  incidents: Array<{
    type: string;
    date: Date;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reportedBy: Schema.Types.ObjectId;
    status: 'reported' | 'investigating' | 'resolved' | 'closed';
    resolution?: string;
    resolutionDate?: Date;
    documents?: Array<{
      url: string;
      type: string;
      uploadDate: Date;
    }>;
  }>;
  overallStatus: 'compliant' | 'non-compliant' | 'pending' | 'review-required';
  lastReviewDate: Date;
  nextReviewDate: Date;
}

const ComplianceSchema: Schema = new Schema({
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityType: {
    type: String,
    enum: ['worker', 'client', 'branch'],
    required: true
  },
  requirements: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    required: { type: Boolean, default: true },
    validityPeriod: Number, // in days
    documentRequired: { type: Boolean, default: true },
    verificationRequired: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'expired', 'rejected'],
      default: 'pending'
    },
    documents: [{
      url: { type: String, required: true },
      type: { type: String, required: true },
      uploadDate: { type: Date, default: Date.now },
      expiryDate: Date,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verificationDate: Date,
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      },
      comments: String
    }]
  }],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: Date,
    documentUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active'
    },
    verificationDetails: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      date: Date,
      method: String,
      result: String
    }
  }],
  trainingRecords: [{
    name: { type: String, required: true },
    provider: { type: String, required: true },
    completionDate: { type: Date, required: true },
    expiryDate: Date,
    score: Number,
    certificateUrl: String,
    status: {
      type: String,
      enum: ['completed', 'expired', 'in-progress'],
      required: true
    }
  }],
  audits: [{
    type: { type: String, required: true },
    date: { type: Date, required: true },
    conductor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    findings: [{
      category: { type: String, required: true },
      description: { type: String, required: true },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
      },
      status: {
        type: String,
        enum: ['open', 'closed', 'in-progress'],
        default: 'open'
      },
      dueDate: Date,
      resolutionDate: Date,
      resolution: String
    }],
    status: {
      type: String,
      enum: ['passed', 'failed', 'conditional'],
      required: true
    },
    nextAuditDate: Date
  }],
  incidents: [{
    type: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'resolved', 'closed'],
      default: 'reported'
    },
    resolution: String,
    resolutionDate: Date,
    documents: [{
      url: { type: String, required: true },
      type: { type: String, required: true },
      uploadDate: { type: Date, default: Date.now }
    }]
  }],
  overallStatus: {
    type: String,
    enum: ['compliant', 'non-compliant', 'pending', 'review-required'],
    default: 'pending'
  },
  lastReviewDate: { type: Date, required: true },
  nextReviewDate: { type: Date, required: true }
}, {
  timestamps: true
});

// Indexes
ComplianceSchema.index({ entityId: 1, entityType: 1 }, { unique: true });
ComplianceSchema.index({ overallStatus: 1 });
ComplianceSchema.index({ nextReviewDate: 1 });

// Methods
ComplianceSchema.methods.updateStatus = async function() {
  const now = new Date();
  let status = 'compliant';

  // Check requirements
  const hasExpiredRequirements = this.requirements.some(req => 
    req.required && (req.status === 'expired' || req.status === 'rejected')
  );

  // Check certifications
  const hasExpiredCertifications = this.certifications.some(cert =>
    cert.status === 'expired' || cert.status === 'revoked'
  );

  // Check audits
  const hasFailedAudits = this.audits.some(audit =>
    audit.status === 'failed' && !audit.findings.every(f => f.status === 'closed')
  );

  // Check incidents
  const hasOpenCriticalIncidents = this.incidents.some(incident =>
    incident.severity === 'critical' && 
    ['reported', 'investigating'].includes(incident.status)
  );

  if (hasExpiredRequirements || hasExpiredCertifications) {
    status = 'non-compliant';
  } else if (hasFailedAudits || hasOpenCriticalIncidents) {
    status = 'review-required';
  }

  this.overallStatus = status;
  await this.save();
};

export default mongoose.model<ICompliance>('Compliance', ComplianceSchema); 