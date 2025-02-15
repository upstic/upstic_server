import mongoose, { Schema } from 'mongoose';

export enum IntegrationType {
  BACKGROUND_CHECK = 'background_check',
  PAYROLL = 'payroll',
  ACCOUNTING = 'accounting',
  CRM = 'crm',
  CALENDAR = 'calendar',
  DOCUMENT_SIGNING = 'document_signing',
  SKILLS_ASSESSMENT = 'skills_assessment',
  VIDEO_INTERVIEW = 'video_interview'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending'
}

export interface IIntegration {
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  config: {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    webhookUrl?: string;
    additionalConfig?: Record<string, any>;
  };
  metadata?: {
    lastSync?: Date;
    errorCount?: number;
    lastError?: string;
    version?: string;
  };
  webhooks: Array<{
    event: string;
    endpoint: string;
    secret?: string;
    active: boolean;
  }>;
  permissions: string[];
}

const integrationSchema = new Schema<IIntegration>({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(IntegrationType),
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(IntegrationStatus),
    default: IntegrationStatus.PENDING
  },
  config: {
    apiKey: String,
    apiSecret: String,
    baseUrl: String,
    webhookUrl: String,
    additionalConfig: Schema.Types.Mixed
  },
  metadata: {
    lastSync: Date,
    errorCount: {
      type: Number,
      default: 0
    },
    lastError: String,
    version: String
  },
  webhooks: [{
    event: String,
    endpoint: String,
    secret: String,
    active: {
      type: Boolean,
      default: true
    }
  }],
  permissions: [String]
}, {
  timestamps: true
});

integrationSchema.index({ type: 1, provider: 1 });
integrationSchema.index({ status: 1 });

export const Integration = mongoose.model<IIntegration>('Integration', integrationSchema); 